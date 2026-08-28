import { BACKEND_URL } from "./constants";

export function getVideoUrl(filepath?: string): string | undefined {
  if (!filepath) return undefined;
  const normalized = filepath.replace(/\\/g, "/");
  // Encode each path segment so filenames with spaces or other unsafe
  // characters still produce a valid URL. The backend decodes it back when
  // serving the static file, so this is safe for existing uploads too.
  const encoded = normalized.split("/").map(encodeURIComponent).join("/");
  return `${BACKEND_URL}/${encoded}`;
}

// The backend generates a poster image next to every video, using the same
// base name with a .jpg extension (e.g. uploads/clip.mp4 -> uploads/clip.jpg).
// We derive that URL by convention so both new uploads and older backfilled
// videos get a thumbnail without any change to the stored data.
export function getPosterUrl(filepath?: string): string | undefined {
  if (!filepath) return undefined;
  const normalized = filepath.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.[^/.]+$/, "");
  const encoded = `${withoutExt}.jpg`
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${BACKEND_URL}/${encoded}`;
}

export function formatVideoTitle(title?: string): string {
  if (!title) return "Untitled video";
  return title.replace(/\.(mp4|mov|webm|mkv|avi)$/i, "");
}
