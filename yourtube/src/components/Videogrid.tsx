import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const VideoCardSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="aspect-video rounded-xl theme-bg-secondary" />
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-full theme-bg-secondary flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 theme-bg-secondary rounded w-full" />
        <div className="h-3 theme-bg-secondary rounded w-2/3" />
        <div className="h-3 theme-bg-secondary rounded w-1/2" />
      </div>
    </div>
  </div>
);

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");

        if (Array.isArray(res.data)) {
          setvideo(res.data);
        } else if (Array.isArray(res.data?.videos)) {
          setvideo(res.data.videos);
        } else if (Array.isArray(res.data?.data)) {
          setvideo(res.data.data);
        } else {
          setvideo([]);
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
        setvideo([]);
      } finally {
        setloading(false);
      }
    };

    fetchvideo();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)
      ) : videos.length > 0 ? (
        videos.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      ) : (
        <div className="col-span-full text-center py-16 theme-text-secondary">
          No videos found. Upload a video to get started.
        </div>
      )}
    </div>
  );
};

export default Videogrid;
