import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/useUser";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const channel = user;
  const [videos, setVideos] = useState<any[]>([]);

  // Show this channel's real uploads (filtered by uploader id) instead of the
  // hardcoded demo list this page used to render.
  const loadVideos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get("/video/getall");
      const all = Array.isArray(res.data) ? res.data : [];
      setVideos(all.filter((v: any) => String(v.uploader) === String(id)));
    } catch {
      setVideos([]);
    }
  }, [id]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  return (
    <div className="flex-1 min-h-screen theme-page">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        <div className="px-4 pb-8">
          <VideoUploader
            channelId={id}
            channelName={channel?.channelname}
            onUploaded={loadVideos}
          />
        </div>
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
}
