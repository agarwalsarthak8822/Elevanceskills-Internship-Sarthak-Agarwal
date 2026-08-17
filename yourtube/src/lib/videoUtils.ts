import { BACKEND_URL } from "./constants";

export function getVideoUrl(filepath?: string): string | undefined {
  if (!filepath) return undefined;
  const normalized = filepath.replace(/\\/g, "/");
  return `${BACKEND_URL}/${normalized}`;
}

export function formatVideoTitle(title?: string): string {
  if (!title) return "Untitled video";
  return title.replace(/\.(mp4|mov|webm|mkv|avi)$/i, "");
}
