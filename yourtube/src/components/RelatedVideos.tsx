import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import VideoThumbnail from "./VideoThumbnail";
import { formatVideoTitle } from "@/lib/videoUtils";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath?: string;
  }>;
  currentVideoId?: string;
}

export default function RelatedVideos({
  videos,
  currentVideoId,
}: RelatedVideosProps) {
  const related = videos.filter((video) => video._id !== currentVideoId);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-medium mb-1">Up next</h2>
      {related.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="flex gap-2 group rounded-lg p-1 -mx-1 theme-hover transition-colors"
        >
          <div className="relative w-[168px] aspect-video rounded-lg overflow-hidden flex-shrink-0 theme-bg-secondary">
            <VideoThumbnail filepath={video.filepath} hoverScale />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="font-medium text-sm leading-snug line-clamp-2">
              {formatVideoTitle(video.videotitle)}
            </h3>
            <p className="text-xs theme-text-secondary mt-1">
              {video.videochanel}
            </p>
            <p className="text-xs theme-text-secondary">
              {video.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
