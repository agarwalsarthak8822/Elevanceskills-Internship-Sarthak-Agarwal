import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";

const execFileP = promisify(execFile);

// Browsers (Chrome/Edge/Firefox on Windows especially) cannot decode HEVC/H.265
// or 10-bit video in a <video> tag. Phone and Snapchat exports are frequently
// HEVC, which is why they show a blank "No preview" player. This service probes
// each upload and, when needed, transcodes it to the universally playable
// combination — H.264 video + AAC audio + 8-bit yuv420p in an MP4 container with
// faststart — and extracts a poster image for instant thumbnails.
//
// Everything here degrades gracefully: if the bundled ffmpeg binaries are not
// installed (e.g. `npm install` hasn't run yet), media processing is skipped and
// the original file is stored as-is, exactly like the old behavior. The server
// never crashes because of a missing codec tool.

let _binsPromise = null;

// Lazily resolve the bundled ffmpeg/ffprobe binary paths. Memoized so we only
// probe the install once. Returns { ok, ffmpeg, ffprobe }.
function resolveBins() {
  if (!_binsPromise) {
    _binsPromise = (async () => {
      try {
        const ffmpegMod = await import("ffmpeg-static");
        const ffprobeMod = await import("ffprobe-static");

        const ffmpeg =
          typeof ffmpegMod.default === "string"
            ? ffmpegMod.default
            : ffmpegMod.default?.path || ffmpegMod.path;
        const ffprobe =
          ffprobeMod.default?.path ||
          ffprobeMod.path ||
          (typeof ffprobeMod.default === "string" ? ffprobeMod.default : null);

        if (typeof ffmpeg === "string" && typeof ffprobe === "string") {
          return { ok: true, ffmpeg, ffprobe };
        }
        console.warn("[media] ffmpeg/ffprobe paths could not be resolved.");
        return { ok: false };
      } catch (error) {
        console.warn(
          "[media] ffmpeg-static/ffprobe-static not installed — uploads stored as-is.",
          error.message
        );
        return { ok: false };
      }
    })();
  }
  return _binsPromise;
}

// Returns { codec, pix } for the first video stream, or nulls on failure.
async function probeVideo(ffprobe, file) {
  try {
    const { stdout } = await execFileP(ffprobe, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,pix_fmt",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const [codec, pix] = stdout.trim().split(/\r?\n/);
    return { codec: codec || null, pix: pix || null };
  } catch {
    return { codec: null, pix: null };
  }
}

// Ensure the file at `inputPath` is a browser-playable H.264 MP4. Returns the
// path to the final playable file (which may differ from the input if the
// container extension changed, e.g. .mov -> .mp4). On any failure the original
// path is returned unchanged.
async function ensureWebPlayable(ffmpeg, ffprobe, inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const { codec, pix } = await probeVideo(ffprobe, inputPath);

  // Already the safe combination in an mp4 container — nothing to do.
  if (ext === ".mp4" && codec === "h264" && pix === "yuv420p") {
    return inputPath;
  }

  const base = inputPath.slice(0, inputPath.length - ext.length);
  const outPath = `${base}.mp4`;
  const tmpPath = `${base}.__transcode__.mp4`;

  try {
    await execFileP(
      ffmpeg,
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        tmpPath,
      ],
      { maxBuffer: 1024 * 1024 * 16, timeout: 1000 * 60 * 20 }
    );

    // Sanity-check the output before replacing anything.
    const check = await probeVideo(ffprobe, tmpPath);
    const stat = await fs.stat(tmpPath).catch(() => null);
    if (check.codec !== "h264" || !stat || stat.size === 0) {
      await fs.unlink(tmpPath).catch(() => {});
      return inputPath;
    }

    await fs.rename(tmpPath, outPath);
    // If we changed the container/extension, drop the original source file.
    if (path.resolve(outPath) !== path.resolve(inputPath)) {
      await fs.unlink(inputPath).catch(() => {});
    }
    return outPath;
  } catch (error) {
    console.warn("[media] transcode failed, keeping original:", error.message);
    await fs.unlink(tmpPath).catch(() => {});
    return inputPath;
  }
}

// Extract a poster frame as "<same-basename>.jpg" next to the video. Tries ~1s
// in, falls back to the first frame for very short clips. Returns the poster
// path or null.
async function generatePoster(ffmpeg, videoPath) {
  const ext = path.extname(videoPath);
  const posterPath = `${videoPath.slice(0, videoPath.length - ext.length)}.jpg`;
  const args = (seek) => [
    "-y",
    "-loglevel",
    "error",
    ...(seek ? ["-ss", "1"] : []),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    "-vf",
    "scale='min(1280,iw)':-2",
    posterPath,
  ];
  try {
    await execFileP(ffmpeg, args(true), { timeout: 1000 * 60 * 2 });
    const stat = await fs.stat(posterPath).catch(() => null);
    if (stat && stat.size > 0) return posterPath;
    // Fallback: grab the very first frame.
    await execFileP(ffmpeg, args(false), { timeout: 1000 * 60 * 2 });
    const stat2 = await fs.stat(posterPath).catch(() => null);
    return stat2 && stat2.size > 0 ? posterPath : null;
  } catch (error) {
    console.warn("[media] poster generation failed:", error.message);
    return null;
  }
}

// Main entry: process a freshly uploaded file. Returns
// { filepath, posterpath, processed }. `filepath` is what should be stored in
// the DB (it may differ from the input path if the extension changed).
export async function processUpload(inputPath) {
  const bins = await resolveBins();
  if (!bins.ok) {
    return { filepath: inputPath, posterpath: null, processed: false };
  }

  let finalPath = inputPath;
  try {
    finalPath = await ensureWebPlayable(bins.ffmpeg, bins.ffprobe, inputPath);
  } catch (error) {
    console.warn("[media] ensureWebPlayable error:", error.message);
    finalPath = inputPath;
  }

  let posterpath = null;
  try {
    posterpath = await generatePoster(bins.ffmpeg, finalPath);
  } catch (error) {
    console.warn("[media] generatePoster error:", error.message);
  }

  return { filepath: finalPath, posterpath, processed: true };
}

export default { processUpload };
