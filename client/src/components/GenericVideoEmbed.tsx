import { useState, useEffect, useMemo } from "react";
import { extractYoutubeVideoId } from "@/lib/youtubeUtils";

interface Props {
  videoUrl?: string;
  html?: string;
  title?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  loop?: boolean;
  aspectRatio?: string; // e.g. "16:9"
  responsive?: boolean;
  className?: string;
  aiGenerator?: string | null;
}

// Parse a "W:H" string into a percentage padding-bottom for aspect ratio
const parseAspectRatio = (ratio: string): number => {
  const [w, h] = ratio.split(":").map(Number);
  return w > 0 && h > 0 ? (h / w) * 100 : 0;
};

// Build YouTube embed URL with common params
const buildYoutubeUrl = (
  vid: string,
  opts: { autoplay: boolean; loop: boolean }
): string => {
  const origin = encodeURIComponent(window.location.origin);
  const params = [
    "rel=0",
    "enablejsapi=1",
    "modestbranding=1",
    "playsinline=1",
    opts.autoplay && "autoplay=1",
    opts.loop && "loop=1",
    `origin=${origin}`,
  ]
    .filter(Boolean)
    .join("&");
  return `https://www.youtube.com/embed/${vid}?${params}`;
};

// Fetch a signed S3 URL from your backend
async function fetchSignedUrl(key: string): Promise<string> {
  const res = await fetch(`/api/s3/${key}?getUrl=true&ts=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch S3 URL");
  const { url } = await res.json();
  return url;
}

export default function GenericVideoEmbed({
  videoUrl,
  html,
  title = "Video player",
  width = "100%",
  height = "auto",
  autoplay = false,
  loop = false,
  aspectRatio = "16:9",
  responsive = true,
  className = "",
  aiGenerator = null,
}: Props) {
  const ratioPct = useMemo(() => parseAspectRatio(aspectRatio), [aspectRatio]);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [resolved, setResolved] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [ytId, setYtId] = useState<string>("");

  // Determine base embed URL on inputs
  useEffect(() => {
    if (html) {
      setEmbedUrl("HTML");
      return;
    }
    if (!videoUrl) {
      setError("No video URL provided");
      return;
    }
    // YouTube
    if (/youtu\.be\/|youtube\.com/.test(videoUrl)) {
      const id = extractYoutubeVideoId(videoUrl) || "";
      if (!id) {
        setError("Invalid YouTube URL");
        return;
      }
      setYtId(id);
      setEmbedUrl(buildYoutubeUrl(id, { autoplay, loop }));
      return;
    }
    // S3 (prefixed)
    if (videoUrl.startsWith("s3:")) {
      setEmbedUrl(videoUrl);
      return;
    }
    // Direct
    setEmbedUrl(videoUrl);
  }, [videoUrl, html, autoplay, loop]);

  // Resolve S3 signed URL
  useEffect(() => {
    if (!embedUrl.startsWith("s3:")) return;
    const key = embedUrl.slice(3);
    fetchSignedUrl(key)
      .then(setResolved)
      .catch((e) => setError(e.message));
  }, [embedUrl]);

  if (error) {
    return (
      <div className="p-4 bg-gray-800 text-white rounded text-center">
        <p className="mb-2">⚠️ {error}</p>
        {ytId && (
          <a
            href={`https://youtu.be/${ytId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-red-600 rounded"
          >
            Watch on YouTube
          </a>
        )}
      </div>
    );
  }

  if (!embedUrl) return <div className="p-4">Loading...</div>;

  // HTML embed branch
  if (html && embedUrl === "HTML") {
    return (
      <div className={className} style={{ width }}>
        <div
          className="relative w-full"
          style={{ paddingBottom: `${ratioPct}%` }}
        >
          <div
            className="absolute inset-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    );
  }

  // Determine src for direct video
  const isDirect = embedUrl === videoUrl || embedUrl.startsWith("s3:");
  const src = isDirect ? resolved || (videoUrl as string) : embedUrl;

  // Direct video tag branch
  if (isDirect) {
    return (
      <div className={className} style={{ width }}>
        <div
          className={responsive ? "relative w-full" : undefined}
          style={responsive ? { paddingBottom: `${ratioPct}%` } : {}}
        >
          <video
            src={src}
            controls
            autoPlay={autoplay}
            loop={loop}
            muted={!autoplay}
            playsInline
            className={responsive ? "absolute inset-0 w-full h-full" : ""}
            width={responsive ? undefined : width}
            height={responsive ? undefined : height}
            onError={() => setError("Playback error")}
          />
        </div>
      </div>
    );
  }

  // Iframe embed branch
  return (
    <div className={className} style={{ width }}>
      <div
        className="relative overflow-hidden"
        style={{ paddingBottom: `${ratioPct}%`, height: 0 }}
      >
        <iframe
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          frameBorder="0"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
