import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Crown, Lock, Pause, Play } from "lucide-react";
import { getPosterUrl, getVideoUrl } from "@/lib/videoUtils";
import { useUser } from "@/lib/useUser";
import {
  formatPlanLabel,
  getNextPlan,
  getWatchLimitMinutes,
} from "@/lib/plans";
import { Button } from "./ui/button";
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
  const posterSrc = getPosterUrl(video?.filepath);

  const { user, openUpgradeDialog, openAuthDialog } = useUser();
  // Per-video watch-time limit (minutes) for the viewer's plan; null = unlimited.
  const limitMinutes = getWatchLimitMinutes(user?.plan);
  const nextPlan = getNextPlan(user?.plan);
  const [limitReached, setLimitReached] = useState(false);

  const { handlePointerUp, activeGesture } = useVideoGestures({
    videoRef,
    containerRef,
    onNextVideo: onNextVideo ?? (() => {}),
    onToggleComments: onToggleComments ?? (() => {}),
  });

  // Reset the lock whenever the video or the plan changes (e.g. after upgrade).
  useEffect(() => {
    setLimitReached(false);
  }, [video?._id, user?.plan]);

  // Enforce the watch-time limit: pause playback once the viewer reaches the
  // cap for their plan and clamp the position so it can't be scrubbed past.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || limitMinutes == null) return;

    const limitSeconds = limitMinutes * 60;
    const enforce = () => {
      if (el.currentTime >= limitSeconds) {
        if (el.currentTime > limitSeconds) el.currentTime = limitSeconds;
        el.pause();
        setLimitReached(true);
      }
    };

    el.addEventListener("timeupdate", enforce);
    el.addEventListener("seeking", enforce);
    return () => {
      el.removeEventListener("timeupdate", enforce);
      el.removeEventListener("seeking", enforce);
    };
  }, [limitMinutes, video?._id]);

  const handleRestartPreview = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    setLimitReached(false);
    void el.play().catch(() => {});
  };

  const handleUpgradeClick = () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }
    if (nextPlan) openUpgradeDialog("manual", nextPlan);
  };

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
            poster={posterSrc || "/placeholder.svg"}
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div
            className="absolute inset-x-0 top-0 z-10 h-[90%] cursor-pointer touch-manipulation select-none"
            onPointerUp={handlePointerUp}
            aria-hidden="true"
          />

          {activeGesture && <GestureOverlay gesture={activeGesture} />}

          {limitReached && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center text-white">
              <Lock className="h-10 w-10 text-yellow-400" />
              <h3 className="text-lg font-semibold">
                {limitMinutes}-minute watch limit reached
              </h3>
              <p className="max-w-sm text-sm text-white/80">
                Your {formatPlanLabel(user?.plan)} plan includes up to{" "}
                {limitMinutes} minutes per video.
                {nextPlan
                  ? ` Upgrade to ${formatPlanLabel(nextPlan)} for more watch time.`
                  : ""}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                {nextPlan && (
                  <Button
                    onClick={handleUpgradeClick}
                    className="bg-yellow-500 text-black hover:bg-yellow-400"
                  >
                    <Crown className="mr-1 h-4 w-4" />
                    {user ? `Upgrade to ${formatPlanLabel(nextPlan)}` : "Sign in to upgrade"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRestartPreview}
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Watch preview again
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white">
          Video unavailable
        </div>
      )}
    </div>
  );
}
