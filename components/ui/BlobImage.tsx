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
  const [url] = useState(() => URL.createObjectURL(blob));

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

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
