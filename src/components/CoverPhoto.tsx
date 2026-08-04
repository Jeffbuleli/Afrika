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
  // Wikimedia rate-limits Next.js image optimization on the server (429),
  // which shows as broken images. Bypass optimizer for remote Wikimedia URLs.
  const remoteWikimedia = src.startsWith("https://upload.wikimedia.org/");

  return (
    <div className={`relative overflow-hidden bg-ink/5 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={92}
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
