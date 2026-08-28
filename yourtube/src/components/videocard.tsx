import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import VideoThumbnail from "./VideoThumbnail";
import { formatVideoTitle } from "@/lib/videoUtils";

export default function VideoCard({ video }: any) {
  return (
    <Link href={`/watch/${video?._id}`} className="group block">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-xl overflow-hidden theme-bg-secondary">
          <VideoThumbnail filepath={video?.filepath} hoverScale />
        </div>
        <div className="flex gap-3 pr-2">
          <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
            <AvatarFallback className="theme-bg-secondary text-sm font-medium">
              {video?.videochanel?.[0]?.toUpperCase() || "Y"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[15px] leading-snug line-clamp-2">
              {formatVideoTitle(video?.videotitle)}
            </h3>
            <p className="text-sm theme-text-secondary mt-1.5">
              {video?.videochanel}
            </p>
            <p className="text-sm theme-text-secondary">
              {video?.views?.toLocaleString() || 0} views •{" "}
              {video?.createdAt
                ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                : "Recently"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
