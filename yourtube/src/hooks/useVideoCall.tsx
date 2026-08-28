import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Room,
  LocalVideoTrack,
  RemoteParticipant,
  RemoteTrack,
} from "twilio-video";
import axiosInstance from "@/lib/axiosinstance";
import {
  connectSocket,
  disconnectSocket,
  registerSocketUser,
} from "@/lib/socket";
import { useUser } from "@/lib/useUser";
import { toast } from "sonner";

export type CallStatus = "idle" | "calling" | "incoming" | "connected";

const RING_TIMEOUT_MS = 30000;

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
  remoteScreenActive: boolean;
  onlineUserIds: string[];
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  remoteScreenRef: React.RefObject<HTMLDivElement | null>;
  remoteAudioRef: React.RefObject<HTMLDivElement | null>;
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

const CAMERA_CLASS = "h-full w-full object-cover";
const SCREEN_CLASS = "h-full w-full object-contain";

function attachTrack(
  container: HTMLDivElement | null,
  track: { attach: () => HTMLMediaElement },
  className: string = CAMERA_CLASS
) {
  if (!container) return;
  const element = track.attach();
  element.className = className;
  container.innerHTML = "";
  container.appendChild(element);
}

// Remote audio must be attached to a DOM element to be audible; append it to a
// dedicated hidden sink so re-rendering the video containers never stops sound.
function attachAudioTrack(
  container: HTMLDivElement | null,
  track: { attach: () => HTMLMediaElement }
) {
  if (!container) return;
  const element = track.attach();
  element.setAttribute("data-remote-audio", "true");
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
  const [remoteScreenActive, setRemoteScreenActive] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const remoteScreenRef = useRef<HTMLDivElement>(null);
  const remoteAudioRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const screenTrackRef = useRef<LocalVideoTrack | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeRoomNameRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const remoteNameRef = useRef<string>("");
  const ringTimeoutRef = useRef<number | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");

  // Keep a ref copy of callStatus so socket handlers (registered once) can read
  // the live value without going stale.
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current !== null) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    clearRingTimeout();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

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
    if (remoteScreenRef.current) remoteScreenRef.current.innerHTML = "";
    if (remoteAudioRef.current) remoteAudioRef.current.innerHTML = "";

    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsRecording(false);
    setRemoteScreenActive(false);
    activeRoomNameRef.current = null;
    peerIdRef.current = null;
  }, [clearRingTimeout]);

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

  // Route a remote track to the right surface: camera -> small tile, screen ->
  // dedicated large panel, audio -> hidden sink. A single container per kind is
  // no longer cleared by the other, so camera + screen can show together.
  const attachRemoteTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === "video") {
      if (track.name === "screen") {
        attachTrack(remoteScreenRef.current, track, SCREEN_CLASS);
        setRemoteScreenActive(true);
      } else {
        attachTrack(remoteVideoRef.current, track, CAMERA_CLASS);
      }
    } else if (track.kind === "audio") {
      attachAudioTrack(remoteAudioRef.current, track);
    }
  }, []);

  const detachRemoteTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === "video" && track.name === "screen") {
      track.detach().forEach((el) => el.remove());
      if (remoteScreenRef.current) remoteScreenRef.current.innerHTML = "";
      setRemoteScreenActive(false);
    } else if (track.kind === "audio") {
      track.detach().forEach((el) => el.remove());
    }
  }, []);

  const connectParticipantTracks = useCallback(
    (participant: RemoteParticipant) => {
      participant.tracks.forEach((publication) => {
        if (publication.track) {
          attachRemoteTrack(publication.track);
        }
        publication.on("subscribed", (track) => attachRemoteTrack(track));
        publication.on("unsubscribed", (track) => detachRemoteTrack(track));
      });

      participant.on("trackSubscribed", (track) => attachRemoteTrack(track));
      participant.on("trackUnsubscribed", (track) => detachRemoteTrack(track));
    },
    [attachRemoteTrack, detachRemoteTrack]
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
        room.on("disconnected", () => {
          resetCallState();
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "response" in error) {
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
    clearRingTimeout();

    if (peerId && user?._id) {
      const socket = connectSocket();
      // If the peer never answered we cancel the ring; otherwise end the call.
      if (callStatusRef.current === "calling") {
        socket.emit("cancel-call", { calleeId: peerId });
      } else {
        socket.emit("end-call", { peerId });
      }
    }

    resetCallState();
  }, [clearRingTimeout, resetCallState, user?._id]);

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

      if (callStatusRef.current !== "idle") {
        toast.error("You are already in a call");
        return;
      }

      clearRingTimeout();

      const roomName = `room_${user._id}_${calleeId}_${Date.now()}`;
      activeRoomNameRef.current = roomName;
      peerIdRef.current = calleeId;
      remoteNameRef.current = calleeName;
      setRemoteParticipantName(calleeName);
      setCallStatus("calling");

      const socket = registerSocketUser(user._id);
      socket.emit("call-user", {
        callerName: user.name || user.email || "YourTube user",
        calleeId,
        roomName,
      });

      // Auto-cancel an unanswered call so the caller isn't stuck "calling".
      ringTimeoutRef.current = window.setTimeout(() => {
        if (callStatusRef.current !== "calling") return;
        toast.error(`${calleeName} did not answer`);
        connectSocket().emit("cancel-call", { calleeId });
        resetCallState();
      }, RING_TIMEOUT_MS);
    },
    [clearRingTimeout, resetCallState, user]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user?._id) return;

    clearRingTimeout();
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
  }, [clearRingTimeout, incomingCall, joinRoom, user?._id]);

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
      attachTrack(localVideoRef.current, screenTrack, SCREEN_CLASS);
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

  // Mix the local mic + every remote participant's audio into a single track
  // via the WebAudio API, so the recorded canvas stream is NOT silent.
  const buildMixedAudioTrack = useCallback((): MediaStreamTrack | null => {
    const room = roomRef.current;
    if (!room) return null;

    try {
      const AudioCtx: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtx) return null;

      const audioContext = new AudioCtx();
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      const pipe = (mediaStreamTrack: MediaStreamTrack | undefined | null) => {
        if (!mediaStreamTrack) return;
        const source = audioContext.createMediaStreamSource(
          new MediaStream([mediaStreamTrack])
        );
        source.connect(destination);
        hasAudio = true;
      };

      room.localParticipant.audioTracks.forEach((publication) => {
        pipe(publication.track?.mediaStreamTrack);
      });

      room.participants.forEach((participant) => {
        participant.audioTracks.forEach((publication) => {
          pipe(publication.track?.mediaStreamTrack);
        });
      });

      if (!hasAudio) {
        audioContext.close().catch(() => {});
        return null;
      }

      audioContextRef.current = audioContext;
      return destination.stream.getAudioTracks()[0] ?? null;
    } catch (error) {
      console.error("Failed to mix call audio for recording:", error);
      return null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const localContainer = localVideoRef.current;
    const remoteContainer = remoteVideoRef.current;
    const remoteScreenContainer = remoteScreenRef.current;
    const localVideo = localContainer?.querySelector("video");
    const remoteVideo = remoteContainer?.querySelector("video");
    const remoteScreen = remoteScreenContainer?.querySelector("video");

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

    // Prefer the remote screen share as the main frame when present.
    const remoteMain = remoteScreen || remoteVideo;

    const drawFrame = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (remoteMain) {
        ctx.drawImage(remoteMain, 0, 0, canvas.width / 2, canvas.height);
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

    // Add mixed call audio (mic + remote) so the saved file has sound.
    const mixedAudioTrack = buildMixedAudioTrack();
    if (mixedAudioTrack) {
      canvasStream.addTrack(mixedAudioTrack);
    }

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
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
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      downloadRecording();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    toast.success("Recording started");
  }, [buildMixedAudioTrack, downloadRecording, isRecording]);

  useEffect(() => {
    if (!user?._id) {
      disconnectSocket();
      resetCallState();
      setOnlineUserIds([]);
      return;
    }

    const socket = registerSocketUser(user._id);
    // Ask for the current presence snapshot right away (buffered until connect).
    socket.emit("get-online-users");

    const onIncomingCall = (payload: IncomingCall) => {
      // Never let a new call silently clobber an in-progress/ringing one —
      // politely reject the newcomer and keep the current call intact.
      if (callStatusRef.current !== "idle") {
        socket.emit("reject-call", { callerId: payload.callerId });
        return;
      }
      setIncomingCall(payload);
      setCallStatus("incoming");
    };

    const onCallAccepted = async ({ roomName }: { roomName: string }) => {
      clearRingTimeout();
      await joinRoom(roomName, remoteNameRef.current);
    };

    const onCallRejected = () => {
      clearRingTimeout();
      toast.error("Call was declined");
      resetCallState();
    };

    const onCallEnded = () => {
      toast.message("Call ended");
      resetCallState();
    };

    const onCallCanceled = () => {
      toast.message("Caller canceled the call");
      resetCallState();
    };

    const onCallUnavailable = ({ message }: { message: string }) => {
      clearRingTimeout();
      toast.error(message || "User is unavailable");
      resetCallState();
    };

    const onOnlineUsers = (ids: string[]) => {
      setOnlineUserIds(Array.isArray(ids) ? ids : []);
    };

    socket.on("incoming-call", onIncomingCall);
    socket.on("call-accepted", onCallAccepted);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-ended", onCallEnded);
    socket.on("call-canceled", onCallCanceled);
    socket.on("call-unavailable", onCallUnavailable);
    socket.on("online-users", onOnlineUsers);

    return () => {
      socket.off("incoming-call", onIncomingCall);
      socket.off("call-accepted", onCallAccepted);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-ended", onCallEnded);
      socket.off("call-canceled", onCallCanceled);
      socket.off("call-unavailable", onCallUnavailable);
      socket.off("online-users", onOnlineUsers);
    };
  }, [clearRingTimeout, joinRoom, resetCallState, user?._id]);

  const value: VideoCallContextValue = {
    callStatus,
    incomingCall,
    remoteParticipantName,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    remoteScreenActive,
    onlineUserIds,
    localVideoRef,
    remoteVideoRef,
    remoteScreenRef,
    remoteAudioRef,
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
