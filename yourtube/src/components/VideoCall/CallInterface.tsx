import {
  Download,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Square,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { useVideoCall } from "@/hooks/useVideoCall";

export default function CallInterface() {
  const {
    callStatus,
    remoteParticipantName,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleRecording,
  } = useVideoCall();

  if (callStatus !== "calling" && callStatus !== "connected") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div>
          <p className="font-medium">
            {callStatus === "calling"
              ? `Calling ${remoteParticipantName}...`
              : remoteParticipantName}
          </p>
          <p className="text-sm text-white/70">
            {callStatus === "calling" ? "Waiting for answer" : "Connected"}
          </p>
        </div>
        <Button variant="destructive" onClick={endCall}>
          <PhoneOff className="w-4 h-4 mr-2" />
          End
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 min-h-0">
        <div className="relative rounded-xl overflow-hidden bg-zinc-900 min-h-[220px]">
          <div ref={remoteVideoRef} className="h-full w-full" />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
            {remoteParticipantName || "Remote"}
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-zinc-900 min-h-[220px]">
          <div ref={localVideoRef} className="h-full w-full" />
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
            You
          </span>
        </div>
      </div>

      {callStatus === "connected" && (
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-6">
          <Button
            variant="secondary"
            onClick={toggleMute}
            className="rounded-full"
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 mr-2" />
            ) : (
              <Mic className="w-4 h-4 mr-2" />
            )}
            {isMuted ? "Unmute" : "Mute"}
          </Button>

          <Button
            variant="secondary"
            onClick={toggleVideo}
            className="rounded-full"
          >
            {isVideoOff ? (
              <VideoOff className="w-4 h-4 mr-2" />
            ) : (
              <Video className="w-4 h-4 mr-2" />
            )}
            {isVideoOff ? "Camera On" : "Camera Off"}
          </Button>

          <Button
            variant="secondary"
            onClick={toggleScreenShare}
            className="rounded-full"
          >
            <MonitorUp className="w-4 h-4 mr-2" />
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </Button>

          <Button
            variant={isRecording ? "destructive" : "secondary"}
            onClick={toggleRecording}
            className="rounded-full"
          >
            {isRecording ? (
              <Square className="w-4 h-4 mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isRecording ? "Stop Recording" : "Record"}
          </Button>
        </div>
      )}
    </div>
  );
}
