import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
  /** contain = full image visible (no crop); cover = fill frame */
  fit?: "contain" | "cover";
};

/**
 * Sharp, non-cropped covers by default (object-contain + solid backdrop).
 */
export function CoverPhoto({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  fit = "contain",
}: Props) {
  // Wikimedia rate-limits Next.js image optimization (429). Local covers are
  // already resized — skip the optimizer so first paint is not blocked ~10s.
  const remoteWikimedia = src.startsWith("https://upload.wikimedia.org/");
  const localCover = src.startsWith("/covers/") || src.startsWith("/uploads/");
  const unoptimized = remoteWikimedia || localCover;

  return (
    <div className={`relative overflow-hidden bg-ink/5 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={92}
        sizes={sizes}
        unoptimized={unoptimized}
        className={
          fit === "contain"
            ? "object-contain object-center"
            : "object-cover object-center"
        }
      />
    </div>
  );
}
