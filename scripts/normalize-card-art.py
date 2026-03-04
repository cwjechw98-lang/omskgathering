#!/usr/bin/env python3
"""Normalize generated card art to OMSK runtime format (400x300 JPG)."""

from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageOps


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True, help="Directory with source images")
    parser.add_argument("--output-dir", required=True, help="Directory for normalized covers")
    parser.add_argument("--quality", type=int, default=84, help="JPG quality (1-95)")
    parser.add_argument("--width", type=int, default=400, help="Target width")
    parser.add_argument("--height", type=int, default=300, help="Target height")
    return parser.parse_args()


def normalize_image(src: Path, dst: Path, width: int, height: int, quality: int) -> None:
    with Image.open(src) as img:
        rgb = img.convert("RGB")
        fitted = ImageOps.fit(rgb, (width, height), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        dst.parent.mkdir(parents=True, exist_ok=True)
        fitted.save(dst, format="JPEG", quality=quality, optimize=True, progressive=True)


def main() -> None:
    args = parse_args()
    src_dir = Path(args.input_dir)
    out_dir = Path(args.output_dir)
    if not src_dir.exists():
        raise SystemExit(f"Input directory not found: {src_dir}")

    supported = {".png", ".jpg", ".jpeg", ".webp"}
    images = [p for p in sorted(src_dir.iterdir()) if p.is_file() and p.suffix.lower() in supported]
    if not images:
        print("No source images found. Nothing to normalize.")
        return

    for src in images:
        out_file = out_dir / f"{src.stem}.jpg"
        normalize_image(src, out_file, args.width, args.height, args.quality)
        print(f"OK {src.name} -> {out_file.name}")


if __name__ == "__main__":
    main()
