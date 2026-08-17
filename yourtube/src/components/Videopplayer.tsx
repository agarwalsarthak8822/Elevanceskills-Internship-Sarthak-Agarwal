import { useRef, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { getVideoUrl } from "@/lib/videoUtils";
import {
  useVideoGestures,
  type ActiveGesture,
  type GestureZone,
} from "@/hooks/useVideoGestures";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onToggleComments?: () => void;
}

function GestureOverlay({ gesture }: { gesture: ActiveGesture }) {
  const zoneClass: Record<GestureZone, string> = {
    left: "left-[15%] -translate-x-1/2",
    center: "left-1/2 -translate-x-1/2",
    right: "left-[85%] -translate-x-1/2",
  };

  return (
    <div
      className={`absolute top-[40%] z-20 pointer-events-none animate-in fade-in duration-150 ${zoneClass[gesture.zone]}`}
    >
      <div
        className="rounded-full bg-black/70 px-4 py-2 text-white text-sm font-medium whitespace-nowrap flex items-center gap-2 gesture-overlay-pill"
        style={
          { "--gesture-duration": `${gesture.duration}ms` } as CSSProperties
        }
      >
        {gesture.icon === "play" && <Play className="w-6 h-6 fill-white" />}
        {gesture.icon === "pause" && <Pause className="w-6 h-6 fill-white" />}
        {gesture.message}
      </div>
    </div>
  );
}

export default function VideoPlayer({
  video,
  onNextVideo,
  onToggleComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoSrc = getVideoUrl(video?.filepath);

  const { handleTap, handleTouchEnd, activeGesture } = useVideoGestures({
    videoRef,
    containerRef,
    onNextVideo: onNextVideo ?? (() => {}),
    onToggleComments: onToggleComments ?? (() => {}),
  });

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg"
    >
      {videoSrc ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            poster="/placeholder.svg"
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div
            className="absolute inset-x-0 top-0 z-10 h-[90%] cursor-pointer touch-manipulation"
            onClick={handleTap}
            onTouchEnd={handleTouchEnd}
            aria-hidden="true"
          />

          {activeGesture && <GestureOverlay gesture={activeGesture} />}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white">
          Video unavailable
        </div>
      )}
    </div>
  );
}
