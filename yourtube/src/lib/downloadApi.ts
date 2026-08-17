import axiosInstance from "./axiosinstance";

export interface DownloadResponse {
  downloadUrl: string;
  filename: string;
  videotitle: string;
}

export interface DownloadHistoryItem {
  _id: string;
  downloadedAt: string;
  videoId: {
    _id: string;
    videotitle: string;
    filepath: string;
    videochanel: string;
    views: number;
    createdAt: string;
  };
}

export const requestVideoDownload = async (
  videoId: string
): Promise<DownloadResponse> => {
  const res = await axiosInstance.post(`/api/download/${videoId}`);
  return res.data;
};

export const fetchDownloadHistory = async (): Promise<DownloadHistoryItem[]> => {
  const res = await axiosInstance.get("/api/downloads/history");
  return res.data;
};
