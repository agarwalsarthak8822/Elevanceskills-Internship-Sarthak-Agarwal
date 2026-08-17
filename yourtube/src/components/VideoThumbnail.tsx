import { useRef, useState } from "react";
import { getVideoUrl } from "@/lib/videoUtils";

interface VideoThumbnailProps {
  filepath?: string;
  className?: string;
  hoverScale?: boolean;
}

export default function VideoThumbnail({
  filepath,
  className = "",
  hoverScale = false,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const src = getVideoUrl(filepath);

  const seekToPreview = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    const target = Math.min(2, video.duration * 0.1);
    try {
      video.currentTime = target;
    } catch {
      setHasError(true);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    if (width === 0 || height === 0) {
      setHasError(true);
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setHasError(true);
      return;
    }

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.8));
    } catch {
      setHasError(true);
    }
  };

  if (!src || hasError) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center theme-bg-secondary ${className}`}
      >
        <img
          src="/placeholder.svg"
          alt=""
          className="h-10 w-10 opacity-40"
        />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="hidden"
        onLoadedMetadata={seekToPreview}
        onSeeked={captureFrame}
        onError={() => setHasError(true)}
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {!thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center theme-bg-secondary">
          <img
            src="/placeholder.svg"
            alt=""
            className="h-10 w-10 opacity-30 animate-pulse"
          />
        </div>
      )}

      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            hoverScale
              ? "group-hover:scale-105 transition-transform duration-200"
              : ""
          }`}
        />
      )}
    </div>
  );
}
