"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function BlobImage({
  blob,
  alt,
  width,
  height,
  className,
  loading = "lazy",
}: {
  blob: Blob;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    // The URL belongs to this effect's Blob lifetime and must be released on replacement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  if (!url) return null;

  return (
    <Image
      unoptimized
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
    />
  );
}
