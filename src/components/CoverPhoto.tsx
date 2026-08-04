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
 * Sharp covers with Next image optimization (AVIF/WebP).
 * `priority` sets fetchPriority=high for LCP candidates.
 */
export function CoverPhoto({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  fit = "contain",
}: Props) {
  // Wikimedia rate-limits Next.js image optimization (429).
  const remoteWikimedia = src.startsWith("https://upload.wikimedia.org/");

  return (
    <div className={`relative overflow-hidden bg-ink/5 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        quality={priority ? 65 : 60}
        sizes={sizes}
        unoptimized={remoteWikimedia}
        className={
          fit === "contain"
            ? "object-contain object-center"
            : "object-cover object-center"
        }
      />
    </div>
  );
}
