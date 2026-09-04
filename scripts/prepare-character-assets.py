"""Prepare transparent character art for responsive UI slots.

The script trims only fully transparent canvas space, then restores a
configurable transparent safety margin around the complete visible subject.
No visible character pixel is removed.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def prepare(source: Path, output: Path, padding_ratio: float, quality: int, force: bool) -> None:
    if output.exists() and not force:
        raise FileExistsError(f"{output} already exists; pass --force to replace it")

    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"{source} has no visible pixels")

    left, top, right, bottom = bounds
    subject = image.crop(bounds)
    padding = max(12, round(max(subject.size) * padding_ratio))
    canvas = Image.new("RGBA", (subject.width + padding * 2, subject.height + padding * 2))
    canvas.alpha_composite(subject, (padding, padding))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "WEBP", quality=quality, method=6)
    print(
        f"{output.as_posix()} size={canvas.width}x{canvas.height} "
        f"subject={subject.width}x{subject.height} safety={padding}px"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--padding-ratio", type=float, default=0.04)
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    prepare(args.source, args.output, args.padding_ratio, args.quality, args.force)


if __name__ == "__main__":
    main()
