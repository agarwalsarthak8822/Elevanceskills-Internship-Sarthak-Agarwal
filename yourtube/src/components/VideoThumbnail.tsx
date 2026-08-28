import { useState } from "react";
import { getPosterUrl, getVideoUrl } from "@/lib/videoUtils";

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
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const posterSrc = getPosterUrl(filepath);
  const videoSrc = getVideoUrl(filepath);

  const scaleClass = hoverScale
    ? "transition-transform duration-200 group-hover:scale-105"
    : "";
  const mediaClass = `h-full w-full object-cover ${scaleClass} ${className}`;

  // 1. Prefer the server-generated poster image. It's fast, needs no video
  //    decode, and shows even for codecs the browser can't play.
  if (posterSrc && !posterFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={posterSrc}
        alt=""
        loading="lazy"
        className={mediaClass}
        onError={() => setPosterFailed(true)}
      />
    );
  }

  // 2. Fall back to painting a frame from the video itself (uploads are now
  //    H.264, so this decodes reliably). The `#t=1` fragment seeks ~1s in.
  if (videoSrc && !videoFailed) {
    return (
      <video
        src={`${videoSrc}#t=1`}
        muted
        playsInline
        preload="metadata"
        className={mediaClass}
        onError={() => setVideoFailed(true)}
      />
    );
  }

  // 3. Last resort: neutral placeholder.
  return (
    <div
      className={`flex h-full w-full items-center justify-center theme-bg-secondary ${className}`}
    >
      <img src="/placeholder.svg" alt="" className="h-10 w-10 opacity-40" />
    </div>
  );
}
