# EXR Viewer

A WebGL2 HDR EXR viewer for showcasing Lightricks' SDR→HDR pipeline. DaVinci Resolve-class color grading in the browser — color wheels, ACEScct grading space, scopes, 3D LUTs, SDR/HDR wipe compare.

**Live demo**: https://oumad.github.io/exr-viewer/

## Features

- **True EXR decoding** via the `exrs` Rust/WASM library — f16/f32 support, full precision
- **DaVinci-style grading** in ACEScct log space:
  - Lift/Gamma/Gain/Offset color wheels with master sliders
  - Contrast with pivot, Shadows/Highlights, Vibrance, Saturation, Hue Shift, Temperature/Tint
- **Tone mapping**: Stephen Hill ACES (AP1 round-trip), AgX (full pipeline), Reinhard, Hable, None
- **3D LUT support**: load any `.cube` file (13³/33³/65³), GPU-accelerated trilinear lookup
- **Real-time scopes**: RGB histogram or parade, rendered from a post-grade FBO
- **SDR/HDR wipe compare**: same grading pipeline applied to both sides — see exactly what HDR recovers
- **False color diagnostic**: heat-map showing scene-linear luminance (where SDR clips vs. where HDR has detail)
- **Pixel probe**: Ctrl+click for linear RGB values + EV stops
- **Resizable Nuke-style panel**, editable number inputs for every param, per-control reset dots

## Development

```bash
npm install
npm run dev
```

Clips (EXR + SDR PNG + thumbnails) are served from `../clips/` by a Vite middleware in dev mode.

## Production

`npm run build` produces a static site in `dist/`. The `VITE_CLIP_BASE_URL` env var points at the clip data source — in production, this is the HF dataset `oumoumad/hdr-demo-clips`.

## Data

Clip assets (~27 GB) live on Hugging Face: [oumoumad/hdr-demo-clips](https://huggingface.co/datasets/oumoumad/hdr-demo-clips).

Each clip contains:
- `hdr_exr/frame_XXXXX.exr` — HDR output (f16, linear Rec.709 primaries, scene-referred)
- `sdr_png/frame_XXXXX.png` — SDR input (8-bit sRGB)
- `thumbnail.jpg` — 280px JPEG from the middle frame

## Color pipeline

```
EXR (linear) → Exposure → White Balance →
  [sRGB → AP1 → ACEScct (log) →
    Lift/Gamma/Gain/Offset → Contrast → Shadows/Highlights →
    Vibrance → Saturation →
  ACEScct → AP1 → sRGB] →
Hue Shift → Tone Map → Soft Clip → sRGB OETF → 3D LUT → Dither
```

The ACEScct bracket matches DaVinci Resolve's ACEScct color science — grading in log space gives perceptually uniform control and reveals SDR quantization vs. smooth HDR.
