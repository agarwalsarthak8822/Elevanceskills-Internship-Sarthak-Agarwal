import Comments from "@/components/comments/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

export default function WatchPage() {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;

      try {
        const res = await axiosInstance.get("/video/getall");
        const list = Array.isArray(res.data) ? res.data : [];
        setCurrentVideo(list.find((vid: any) => vid._id === id) || null);
        setAllVideos(list);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchvideo();
  }, [id]);

  const handleNextVideo = useCallback(() => {
    if (!currentVideo || allVideos.length <= 1) return;

    const currentIndex = allVideos.findIndex(
      (vid) => vid._id === currentVideo._id
    );
    if (currentIndex === -1) return;

    const nextVideo = allVideos[(currentIndex + 1) % allVideos.length];
    if (nextVideo) {
      router.push(`/watch/${nextVideo._id}`);
    }
  }, [allVideos, currentVideo, router]);

  const handleToggleComments = useCallback(() => {
    document.getElementById("comments-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      const input = document.getElementById(
        "comment-input"
      ) as HTMLTextAreaElement | null;
      input?.focus();
    }, 400);
  }, []);

  if (loading) {
    return <div className="flex-1 p-4 theme-page">Loading...</div>;
  }

  if (!currentVideo) {
    return <div className="flex-1 p-4 theme-page">Video not found</div>;
  }

  return (
    <div className="flex-1 min-h-screen theme-page">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={currentVideo}
              onNextVideo={handleNextVideo}
              onToggleComments={handleToggleComments}
            />
            <VideoInfo video={currentVideo} />
            <Comments videoId={typeof id === "string" ? id : ""} />
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} currentVideoId={currentVideo._id} />
          </div>
        </div>
      </div>
    </div>
  );
}
