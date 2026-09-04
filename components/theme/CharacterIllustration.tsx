"use client";

import Image from "next/image";
import { useState } from "react";
import { getCharacterAsset } from "@/lib/character-assets";
import { useUIStore } from "@/stores/ui-store";
import type { CharacterName, CharacterPlacement, CharacterSize, CharacterVariant } from "@/types/theme";

export function CharacterIllustration({ character, variant, placement = "right", size = "md", fade = false, decorative = false, hideBelow, priority, alt, className = "" }: {
  character: CharacterName; variant: CharacterVariant; placement?: CharacterPlacement; size?: CharacterSize;
  fade?: boolean; decorative?: boolean; hideBelow?: "mobile" | "tablet"; priority?: boolean; alt?: string; className?: string;
}) {
  const illustrationMode = useUIStore((state) => state.illustrationMode);
  const asset = getCharacterAsset(character, variant);
  const [failed, setFailed] = useState(false);
  if (illustrationMode === "off") return null;
  const src = failed || !asset.generated ? asset.fallback : asset.src;
  const finalAlt = decorative ? "" : alt ?? asset.alt;
  const eager = priority ?? asset.priority ?? false;
  const ratio = asset.width / asset.height;
  const orientation = ratio > 1.08 ? "landscape" : ratio < .82 ? "portrait" : "square";
  const responsiveSizes = size === "lg"
    ? "(max-width: 767px) 82vw, (max-width: 1023px) 42vw, 44vw"
    : size === "md"
      ? "(max-width: 767px) 58vw, (max-width: 1023px) 38vw, 32vw"
      : "(max-width: 767px) 38vw, 180px";
  return <figure className={`character-illustration ${className}`} data-character={character} data-variant={variant} data-orientation={orientation} data-placement={placement} data-size={size} data-fade={fade} data-hide-below={hideBelow} data-compact={illustrationMode === "compact"} aria-hidden={decorative || undefined}>
    <Image src={src} alt={finalAlt} width={asset.width} height={asset.height} priority={eager} loading={eager ? "eager" : "lazy"} sizes={responsiveSizes} style={{ objectFit: "contain" }} onError={() => setFailed(true)} />
  </figure>;
}
