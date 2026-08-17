import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Crown,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/useUser";
import axiosInstance from "@/lib/axiosinstance";
import { requestVideoDownload } from "@/lib/downloadApi";
import { formatPlanLabel, hasPaidPlan, isFreePlan } from "@/lib/plans";
import { formatVideoTitle } from "@/lib/videoUtils";
import CallButton from "@/components/VideoCall/CallButton";
import { toast } from "sonner";

const VideoInfo = ({ video }: any) => {
  const router = useRouter();
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, openAuthDialog, openUpgradeDialog } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user, video._id]);

  const handleLike = async () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }

    setIsDownloading(true);
    try {
      const data = await requestVideoDownload(video._id);
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.filename || "video.mp4";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (error: any) {
      if (
        error?.response?.status === 403 &&
        error?.response?.data?.reason === "limit_reached"
      ) {
        toast.error("Daily download limit reached. Upgrade for unlimited downloads.");
        openUpgradeDialog("limit_reached", "gold");
      } else {
        toast.error(
          error?.response?.data?.message || "Download failed. Please try again."
        );
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      openAuthDialog("signin");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold leading-snug">
        {formatVideoTitle(video.videotitle)}
      </h1>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="theme-bg-secondary font-medium">
              {video.videochanel?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{video.videochanel}</h3>
            <p className="text-sm theme-text-secondary">1.2M subscribers</p>
          </div>
          <Button className="theme-subscribe ml-2 hidden sm:inline-flex">
            Subscribe
          </Button>
          <CallButton
            calleeId={video.uploader}
            calleeName={video.videochanel}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center theme-action-pill overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none hover:bg-transparent theme-action-pill rounded-l-full px-3"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-1 ${isLiked ? "fill-current" : ""}`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 theme-divider" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none hover:bg-transparent theme-action-pill rounded-r-full px-3"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 ${isDisliked ? "fill-current" : ""}`}
              />
              {dislikes > 0 && (
                <span className="ml-1">{dislikes.toLocaleString()}</span>
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="theme-action-pill"
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch later"}
          </Button>

          <Button variant="ghost" size="sm" className="theme-action-pill">
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="theme-action-pill"
            onClick={handleDownload}
            disabled={isDownloading}
            title={
              isFreePlan(user?.plan)
                ? "Free plan: 1 download per day"
                : "Unlimited downloads"
            }
          >
            <Download className="w-5 h-5 mr-2" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>

          <Button variant="ghost" size="icon" className="theme-action-pill">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {user && isFreePlan(user.plan) && (
        <div className="flex items-center justify-between gap-3 rounded-xl border theme-border theme-bg-secondary px-4 py-3 text-sm">
          <p className="theme-text-secondary">
            Free plan includes <strong className="text-[var(--text-primary)]">1 download per day</strong>.
            Upgrade for unlimited downloads.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
            onClick={() => router.push("/plans")}
          >
            <Crown className="w-4 h-4 mr-1" />
            Go Premium
          </Button>
        </div>
      )}

      {user && hasPaidPlan(user.plan) && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-600">
          <Crown className="w-4 h-4 shrink-0" />
          <span>
            {formatPlanLabel(user.plan)} plan — unlimited downloads enabled
          </span>
        </div>
      )}

      <div className="theme-description p-4">
        <div className="flex gap-4 text-sm font-medium mb-2 theme-text-secondary">
          <span>{video.views?.toLocaleString() || 0} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm leading-relaxed ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            {video.description ||
              "Sample video description. This would contain the actual video description from the database."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium theme-text-secondary hover:theme-text-secondary"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
