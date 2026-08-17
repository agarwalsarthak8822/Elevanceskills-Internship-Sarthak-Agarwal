import { useCallback, useEffect, useRef, useState } from "react";

export type GestureZone = "left" | "center" | "right";

export interface ActiveGesture {
  message: string;
  zone: GestureZone;
  duration: number;
  icon?: "play" | "pause";
}

interface UseVideoGesturesOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  onNextVideo: () => void;
  onToggleComments: () => void;
}

const TAP_RESET_MS = 300;

const getZone = (clientX: number, rect: DOMRect): GestureZone => {
  const ratio = (clientX - rect.left) / rect.width;
  if (ratio < 0.3) return "left";
  if (ratio > 0.7) return "right";
  return "center";
};

const isInGestureArea = (clientY: number, rect: DOMRect) => {
  const ratio = (clientY - rect.top) / rect.height;
  return ratio <= 0.9;
};

export function useVideoGestures({
  videoRef,
  containerRef,
  onNextVideo,
  onToggleComments,
}: UseVideoGesturesOptions) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeGesture, setActiveGesture] = useState<ActiveGesture | null>(null);

  const clearOverlayTimer = () => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
  };

  const showOverlay = useCallback((gesture: ActiveGesture) => {
    setActiveGesture(gesture);
    clearOverlayTimer();
    overlayTimerRef.current = setTimeout(() => {
      setActiveGesture(null);
    }, gesture.duration);
  }, []);

  const seekBy = useCallback(
    (seconds: number, zone: GestureZone) => {
      const video = videoRef.current;
      if (!video) return;

      const nextTime = Math.min(
        Math.max(0, video.currentTime + seconds),
        Number.isFinite(video.duration) ? video.duration : video.currentTime + seconds
      );
      video.currentTime = nextTime;

      showOverlay({
        message: seconds < 0 ? "⏪ -10s" : "+10s ⏩",
        zone,
        duration: 800,
      });
    },
    [videoRef, showOverlay]
  );

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      showOverlay({ message: "", zone: "center", duration: 600, icon: "pause" });
    } else {
      video.pause();
      showOverlay({ message: "", zone: "center", duration: 600, icon: "play" });
    }
  }, [videoRef, showOverlay]);

  const tryCloseWindow = useCallback(() => {
    showOverlay({ message: "Closing...", zone: "right", duration: 500 });
    window.setTimeout(() => {
      window.close();
      window.setTimeout(() => {
        if (!window.closed) {
          window.alert("Please close this tab manually");
        }
      }, 100);
    }, 200);
  }, [showOverlay]);

  const processTaps = useCallback(
    (count: number, zone: GestureZone) => {
      if (count === 1 && zone === "center") {
        togglePlayPause();
        return;
      }

      if (count === 2 && zone === "left") {
        seekBy(-10, "left");
        return;
      }

      if (count === 2 && zone === "right") {
        seekBy(10, "right");
        return;
      }

      if (count === 3 && zone === "center") {
        showOverlay({ message: "⏭ Next Video", zone: "center", duration: 800 });
        onNextVideo();
        return;
      }

      if (count === 3 && zone === "right") {
        tryCloseWindow();
        return;
      }

      if (count === 3 && zone === "left") {
        showOverlay({ message: "💬 Comments", zone: "left", duration: 800 });
        onToggleComments();
      }
    },
    [seekBy, togglePlayPause, tryCloseWindow, onNextVideo, onToggleComments, showOverlay]
  );

  const handlePointer = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      const container = containerRef.current ?? target;
      const rect = container.getBoundingClientRect();

      if (!isInGestureArea(clientY, rect)) return;

      const zone = getZone(clientX, rect);
      tapCountRef.current += 1;

      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }

      tapTimerRef.current = setTimeout(() => {
        processTaps(tapCountRef.current, zone);
        tapCountRef.current = 0;
        tapTimerRef.current = null;
      }, TAP_RESET_MS);
    },
    [containerRef, processTaps]
  );

  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handlePointer(event.clientX, event.clientY, event.currentTarget);
    },
    [handlePointer]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.changedTouches.length !== 1) return;

      if (tapCountRef.current >= 1) {
        event.preventDefault();
      }

      const touch = event.changedTouches[0];
      handlePointer(touch.clientX, touch.clientY, event.currentTarget);
    },
    [handlePointer]
  );

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      clearOverlayTimer();
    };
  }, []);

  return { handleTap, handleTouchEnd, activeGesture };
}
