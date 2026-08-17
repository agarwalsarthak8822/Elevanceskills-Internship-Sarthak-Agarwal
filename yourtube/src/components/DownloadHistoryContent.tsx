import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { fetchDownloadHistory, DownloadHistoryItem } from "@/lib/downloadApi";
import { BACKEND_URL } from "@/lib/constants";
import { useUser } from "@/lib/useUser";

export default function DownloadHistoryContent() {
  const { user } = useUser();
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await fetchDownloadHistory();
        setHistory(data);
      } catch (error) {
        console.error("Failed to load download history:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view downloads</h2>
        <p className="text-gray-600">Your downloaded videos will appear here.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-gray-600">
          Videos you download will be listed here with the date and title.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => {
        const video = item.videoId;
        if (!video) return null;

        const videoSrc = video.filepath
          ? `${BACKEND_URL}/${video.filepath.replace(/\\/g, "/")}`
          : undefined;

        return (
          <div key={item._id} className="flex gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                {videoSrc ? (
                  <video
                    src={videoSrc}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    No preview
                  </div>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0 py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {video.videotitle}
                </h3>
              </Link>
              <p className="text-sm text-gray-600">{video.videochanel}</p>
              <p className="text-xs text-gray-500 mt-1">
                Downloaded on{" "}
                {format(new Date(item.downloadedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
