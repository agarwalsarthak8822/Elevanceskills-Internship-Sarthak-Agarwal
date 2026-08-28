import axiosInstance from "./axiosinstance";

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

// Normalized error so callers can branch on the daily-limit case without
// having to know the download response arrives as a Blob.
export class DownloadError extends Error {
  status?: number;
  reason?: string;

  constructor(message: string, status?: number, reason?: string) {
    super(message);
    this.name = "DownloadError";
    this.status = status;
    this.reason = reason;
  }
}

const parseFilename = (disposition: string): string => {
  // Handles both `filename="x"` and RFC 5987 `filename*=UTF-8''x`.
  const star = /filename\*=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (star?.[1]) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ? decodeURIComponent(plain[1]) : "video.mp4";
};

const triggerBlobSave = (blob: Blob, filename: string) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

// Requests the video as a binary attachment and saves it to the user's device.
// The auth token is attached by axiosInstance, so this works for both Firebase
// and JWT/OTP sessions. On the free-tier daily limit the server returns 403;
// we surface that as a DownloadError with reason "limit_reached".
export const requestVideoDownload = async (videoId: string): Promise<void> => {
  try {
    const res = await axiosInstance.post(`/api/download/${videoId}`, null, {
      responseType: "blob",
    });
    const disposition = (res.headers["content-disposition"] as string) || "";
    triggerBlobSave(res.data as Blob, parseFilename(disposition));
  } catch (error: unknown) {
    const resp = (error as { response?: { status?: number; data?: unknown } })
      ?.response;

    // With responseType "blob", error bodies are Blobs too — decode to JSON.
    if (resp?.data instanceof Blob) {
      try {
        const json = JSON.parse(await resp.data.text());
        throw new DownloadError(
          json.message || "Download failed",
          resp.status,
          json.reason
        );
      } catch (parseErr) {
        if (parseErr instanceof DownloadError) throw parseErr;
      }
    }

    if (error instanceof DownloadError) throw error;
    throw new DownloadError(
      "Download failed. Please try again.",
      resp?.status
    );
  }
};

export const fetchDownloadHistory = async (): Promise<DownloadHistoryItem[]> => {
  const res = await axiosInstance.get("/api/downloads/history");
  return res.data;
};
