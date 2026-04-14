"""Generate JPEG thumbnails from the middle frame of each clip's SDR PNGs.

Writes to: clips/<clip>/thumbnail.jpg
"""
import os, sys
from pathlib import Path
from PIL import Image

THUMB_WIDTH = 280
QUALITY = 85

def main():
    root = Path(__file__).resolve().parents[2] / 'clips'
    if not root.exists():
        print(f'No clips dir: {root}'); sys.exit(1)

    generated = 0
    skipped = 0
    for clip_dir in sorted(root.iterdir()):
        if not clip_dir.is_dir(): continue
        png_dir = clip_dir / 'sdr_png'
        if not png_dir.exists(): continue

        pngs = sorted(png_dir.glob('frame_*.png'))
        if not pngs: continue

        # Use middle frame as thumbnail (more representative than frame 0)
        src = pngs[len(pngs) // 2]
        out = clip_dir / 'thumbnail.jpg'

        if out.exists() and out.stat().st_mtime > src.stat().st_mtime:
            skipped += 1
            continue

        img = Image.open(src)
        ratio = THUMB_WIDTH / img.width
        new_h = int(img.height * ratio)
        thumb = img.resize((THUMB_WIDTH, new_h), Image.LANCZOS)
        if thumb.mode != 'RGB': thumb = thumb.convert('RGB')
        thumb.save(out, 'JPEG', quality=QUALITY, optimize=True)
        print(f'  {clip_dir.name}  {THUMB_WIDTH}x{new_h}  {out.stat().st_size // 1024}KB')
        generated += 1

    print(f'\n{generated} generated, {skipped} skipped')

if __name__ == '__main__':
    main()
