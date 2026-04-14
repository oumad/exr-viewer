"""Create HF dataset and upload clips (EXR + PNG + thumbnails, skip mp4s)."""
import os, sys
from pathlib import Path
from huggingface_hub import HfApi, create_repo

TOKEN = os.environ['HF_TOKEN']
REPO_ID = 'oumoumad/hdr-demo-clips'
CLIPS_DIR = Path(__file__).resolve().parents[2] / 'clips'

# The 27 clips in our current catalog
KEEP_CLIPS = {
    'dandelion_girl_sunset', 'airport_silhouettes_sunset',
    'ballerina_arch_spotlight', 'ballerina_window_light', 'ballerina_window_reach',
    'big_ben_tower', 'boy_cozy_room_moody', 'carousel_night_glow',
    'cathedral_dome_light', 'cattle_meadow_backlit', 'city_highway_night',
    'city_rooftops_aerial', 'city_roundabout_night', 'dancer_blue_studio',
    'dusk_field_clouds', 'forest_stream_golden', 'girls_bokeh_picnic',
    'golden_street_tower', 'greek_alley_flowers', 'horse_pasture_silhouette',
    'lakeside_arches_vista', 'misty_mountains_sunrise', 'mountain_road_canyon',
    'mountain_sunrise_portrait', 'neon_dancer_club', 'night_vendor_cart',
    'river_cascade_sunlit',
}

def main():
    api = HfApi(token=TOKEN)

    # Create the dataset repo (idempotent)
    print(f'Creating dataset {REPO_ID}...')
    create_repo(repo_id=REPO_ID, repo_type='dataset', token=TOKEN, exist_ok=True, private=False)

    # Readme first, small
    readme = CLIPS_DIR.parent / 'exr-viewer' / 'HF_README.md'
    readme.write_text('''---
license: cc-by-nc-4.0
task_categories:
  - image-to-image
tags:
  - hdr
  - exr
  - video
  - sdr-to-hdr
---

# HDR Demo Clips (Lightricks SDR→HDR)

Paired SDR (input) / HDR (output) frame sequences from the Lightricks SDR-to-HDR pipeline (IC-LoRA on LTX-2).

Each clip contains:
- `hdr_exr/frame_XXXXX.exr` — HDR output (f16, linear Rec.709/sRGB primaries, scene-referred)
- `sdr_png/frame_XXXXX.png` — SDR input (8-bit sRGB, display-referred)
- `thumbnail.jpg` — 280px preview from the middle frame

Dimensions: HDR is symmetrically cropped from SDR to match model-friendly dimensions (typically 28–56px removed from top+bottom for landscape, or left+right for portrait).

Used by the [HDR EXR Viewer](https://oumad.github.io/exr-viewer/).
''', encoding='utf-8')
    api.upload_file(path_or_fileobj=str(readme), path_in_repo='README.md',
                    repo_id=REPO_ID, repo_type='dataset', token=TOKEN)
    print('README uploaded.')

    # Upload each clip one at a time so progress is visible
    clips = sorted([c for c in CLIPS_DIR.iterdir() if c.is_dir() and c.name in KEEP_CLIPS])
    print(f'Uploading {len(clips)} clips...')
    for i, clip_dir in enumerate(clips, 1):
        print(f'\n[{i}/{len(clips)}] {clip_dir.name}')
        api.upload_folder(
            folder_path=str(clip_dir),
            path_in_repo=clip_dir.name,
            repo_id=REPO_ID,
            repo_type='dataset',
            token=TOKEN,
            ignore_patterns=['*.mp4', '*.webp', '.DS_Store'],
            commit_message=f'Add {clip_dir.name}',
        )
    print('\n✅ All clips uploaded.')

if __name__ == '__main__':
    main()
