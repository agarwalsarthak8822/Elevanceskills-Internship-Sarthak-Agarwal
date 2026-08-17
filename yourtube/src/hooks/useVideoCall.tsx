import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Room, LocalVideoTrack, RemoteParticipant } from "twilio-video";
import axiosInstance from "@/lib/axiosinstance";
import {
  connectSocket,
  disconnectSocket,
  registerSocketUser,
} from "@/lib/socket";
import { useUser } from "@/lib/useUser";
import { toast } from "sonner";

export type CallStatus = "idle" | "calling" | "incoming" | "connected";

export interface IncomingCall {
  callerId: string;
  callerName: string;
  roomName: string;
}

interface VideoCallContextValue {
  callStatus: CallStatus;
  incomingCall: IncomingCall | null;
  remoteParticipantName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  startCall: (calleeId: string, calleeName: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleRecording: () => void;
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

function attachTrack(
  container: HTMLDivElement | null,
  track: { attach: () => HTMLMediaElement }
) {
  if (!container) return;
  const element = track.attach();
  element.className = "h-full w-full object-cover";
  container.innerHTML = "";
  container.appendChild(element);
}

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [remoteParticipantName, setRemoteParticipantName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeRoomNameRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const remoteNameRef = useRef<string>("");

  const cleanupMedia = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.innerHTML = "";
    if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";

    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsRecording(false);
    activeRoomNameRef.current = null;
    peerIdRef.current = null;
  }, []);

  const resetCallState = useCallback(() => {
    cleanupMedia();
    setCallStatus("idle");
    setIncomingCall(null);
    setRemoteParticipantName("");
  }, [cleanupMedia]);

  const fetchTwilioToken = useCallback(
    async (roomName: string) => {
      if (!user?._id) {
        throw new Error("Not authenticated");
      }

      const response = await axiosInstance.post("/api/video-call/token", {
        roomName,
        identity: user._id,
      });

      return response.data.token as string;
    },
    [user?._id]
  );

  const ensureMediaPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      toast.error("Please allow camera and microphone access");
      throw new Error("permission_denied");
    }
  }, []);

  const connectParticipantTracks = useCallback(
    (participant: RemoteParticipant) => {
      participant.tracks.forEach((publication) => {
        if (publication.track) {
          if (publication.track.kind === "video") {
            attachTrack(remoteVideoRef.current, publication.track);
          }
        }
        publication.on("subscribed", (track) => {
          if (track.kind === "video") {
            attachTrack(remoteVideoRef.current, track);
          }
        });
      });

      participant.on("trackSubscribed", (track) => {
        if (track.kind === "video") {
          attachTrack(remoteVideoRef.current, track);
        }
      });
    },
    []
  );

  const joinRoom = useCallback(
    async (roomName: string, remoteName: string) => {
      try {
        await ensureMediaPermissions();
        const token = await fetchTwilioToken(roomName);
        const Video = (await import("twilio-video")).default;

        const room = await Video.connect(token, {
          name: roomName,
          audio: true,
          video: { width: 640, height: 480 },
        });

        roomRef.current = room;
        activeRoomNameRef.current = roomName;
        setRemoteParticipantName(remoteName);
        setCallStatus("connected");

        room.localParticipant.videoTracks.forEach((publication) => {
          if (publication.track) {
            attachTrack(localVideoRef.current, publication.track);
          }
        });

        room.participants.forEach(connectParticipantTracks);
        room.on("participantConnected", connectParticipantTracks);
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error
        ) {
          toast.error("Could not connect to call server");
          resetCallState();
          return;
        }

        const message =
          error instanceof Error ? error.message : "Connection failed";

        if (message === "permission_denied") {
          resetCallState();
          return;
        }

        toast.error("Could not connect to call server");
        resetCallState();
      }
    },
    [
      connectParticipantTracks,
      ensureMediaPermissions,
      fetchTwilioToken,
      resetCallState,
    ]
  );

  const endCall = useCallback(() => {
    const peerId = peerIdRef.current;
    const socket = connectSocket();

    if (peerId && user?._id) {
      socket.emit("end-call", { peerId });
    }

    resetCallState();
  }, [resetCallState, user?._id]);

  const startCall = useCallback(
    (calleeId: string, calleeName: string) => {
      if (!user?._id) {
        toast.error("Please sign in to start a call");
        return;
      }

      if (calleeId === user._id) {
        toast.error("You cannot call yourself");
        return;
      }

      const roomName = `room_${user._id}_${calleeId}_${Date.now()}`;
      activeRoomNameRef.current = roomName;
      peerIdRef.current = calleeId;
      remoteNameRef.current = calleeName;
      setRemoteParticipantName(calleeName);
      setCallStatus("calling");

      const socket = registerSocketUser(user._id);
      socket.emit("call-user", {
        callerId: user._id,
        callerName: user.name || user.email || "YourTube user",
        calleeId,
        roomName,
      });
    },
    [user]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user?._id) return;

    peerIdRef.current = incomingCall.callerId;
    activeRoomNameRef.current = incomingCall.roomName;

    const socket = connectSocket();
    socket.emit("accept-call", {
      callerId: incomingCall.callerId,
      calleeId: user._id,
      roomName: incomingCall.roomName,
    });

    const callerName = incomingCall.callerName;
    setIncomingCall(null);
    await joinRoom(incomingCall.roomName, callerName);
  }, [incomingCall, joinRoom, user?._id]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !user?._id) {
      resetCallState();
      return;
    }

    const socket = connectSocket();
    socket.emit("reject-call", { callerId: incomingCall.callerId });
    resetCallState();
  }, [incomingCall, resetCallState, user?._id]);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    room.localParticipant.audioTracks.forEach((publication) => {
      if (publication.track) {
        if (isMuted) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      }
    });
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    room.localParticipant.videoTracks.forEach((publication) => {
      if (publication.track && publication.track.name !== "screen") {
        if (isVideoOff) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      }
    });
    setIsVideoOff((prev) => !prev);
  }, [isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    try {
      if (isScreenSharing && screenTrackRef.current) {
        room.localParticipant.unpublishTrack(screenTrackRef.current);
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
        setIsScreenSharing(false);

        room.localParticipant.videoTracks.forEach((publication) => {
          if (publication.track && publication.track.name !== "screen") {
            attachTrack(localVideoRef.current, publication.track);
          }
        });
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const { LocalVideoTrack } = await import("twilio-video");
      const screenTrack = new LocalVideoTrack(
        displayStream.getVideoTracks()[0],
        { name: "screen" }
      );

      screenTrackRef.current = screenTrack;
      await room.localParticipant.publishTrack(screenTrack);
      attachTrack(localVideoRef.current, screenTrack);
      setIsScreenSharing(true);

      screenTrack.mediaStreamTrack.onended = () => {
        if (screenTrackRef.current) {
          room.localParticipant.unpublishTrack(screenTrackRef.current);
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
          setIsScreenSharing(false);
        }
      };
    } catch {
      toast.error("Screen sharing was cancelled or denied");
    }
  }, [isScreenSharing]);

  const downloadRecording = useCallback(() => {
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yourtube-call-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const localContainer = localVideoRef.current;
    const remoteContainer = remoteVideoRef.current;
    const localVideo = localContainer?.querySelector("video");
    const remoteVideo = remoteContainer?.querySelector("video");

    if (!localVideo) {
      toast.error("No local video available to record");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Could not start recording");
      return;
    }

    const drawFrame = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (remoteVideo) {
        ctx.drawImage(remoteVideo, 0, 0, canvas.width / 2, canvas.height);
        ctx.drawImage(
          localVideo,
          canvas.width / 2,
          0,
          canvas.width / 2,
          canvas.height
        );
      } else {
        ctx.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
      }
    };

    drawFrame();
    const canvasStream = canvas.captureStream(30);
    const drawInterval = window.setInterval(drawFrame, 1000 / 30);

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      window.clearInterval(drawInterval);
      canvasStream.getTracks().forEach((track) => track.stop());
      downloadRecording();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    toast.success("Recording started");
  }, [downloadRecording, isRecording]);

  useEffect(() => {
    if (!user?._id) {
      disconnectSocket();
      resetCallState();
      return;
    }

    const socket = registerSocketUser(user._id);

    const onIncomingCall = (payload: IncomingCall) => {
      setIncomingCall(payload);
      setCallStatus("incoming");
    };

    const onCallAccepted = async ({ roomName }: { roomName: string }) => {
      await joinRoom(roomName, remoteNameRef.current);
    };

    const onCallRejected = () => {
      toast.error("Call was declined");
      resetCallState();
    };

    const onCallEnded = () => {
      toast.message("Call ended");
      resetCallState();
    };

    const onCallUnavailable = ({ message }: { message: string }) => {
      toast.error(message || "User is unavailable");
      resetCallState();
    };

    socket.on("incoming-call", onIncomingCall);
    socket.on("call-accepted", onCallAccepted);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-ended", onCallEnded);
    socket.on("call-unavailable", onCallUnavailable);

    return () => {
      socket.off("incoming-call", onIncomingCall);
      socket.off("call-accepted", onCallAccepted);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-ended", onCallEnded);
      socket.off("call-unavailable", onCallUnavailable);
    };
  }, [joinRoom, resetCallState, user?._id]);

  const value: VideoCallContextValue = {
    callStatus,
    incomingCall,
    remoteParticipantName,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleRecording,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
}
