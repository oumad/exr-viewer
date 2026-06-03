import { init, decodeRgbExr } from 'exrs';
import { HDRRenderer, DEFAULT_PARAMS, type RenderParams } from './renderer';
import { ColorWheel, computeHistogram, drawHistogram, drawParade } from './widgets';
import './style.css';

// ── Clip catalog ─────────────────────────────────────────
// Categories: 'SDR→HDR' (28 source-video remasters), 'T2V' (prompt-only HDR
// generation with the LTX 2.3 standard HDR LoRA), 'I2V' (raw photo → LogC3
// PNG → image-conditioned HDR video with the same LoRA).
const CLIPS = [
  // ── SDR → HDR remasters ─────────────────────────
  { id: 'dandelion_girl_sunset',      label: 'Dandelion Girl Sunset',      frames: 97,  category: 'SDR→HDR' },
  { id: 'airport_silhouettes_sunset', label: 'Airport Silhouettes Sunset', frames: 121, category: 'SDR→HDR' },
  { id: 'ballerina_arch_spotlight',   label: 'Ballerina Arch Spotlight',   frames: 121, category: 'SDR→HDR' },
  { id: 'ballerina_window_light',     label: 'Ballerina Window Light',     frames: 121, category: 'SDR→HDR' },
  { id: 'ballerina_window_reach',     label: 'Ballerina Window Reach',     frames: 121, category: 'SDR→HDR' },
  { id: 'big_ben_tower',              label: 'Big Ben Tower',              frames: 75,  category: 'SDR→HDR' },
  { id: 'boy_cozy_room_moody',        label: 'Boy Cozy Room Moody',        frames: 121, category: 'SDR→HDR' },
  { id: 'carousel_night_glow',        label: 'Carousel Night Glow',        frames: 121, category: 'SDR→HDR' },
  { id: 'cathedral_dome_light',       label: 'Cathedral Dome Light',       frames: 121, category: 'SDR→HDR' },
  { id: 'cattle_meadow_backlit',      label: 'Cattle Meadow Backlit',      frames: 121, category: 'SDR→HDR' },
  { id: 'city_highway_night',         label: 'City Highway Night',         frames: 121, category: 'SDR→HDR' },
  { id: 'city_rooftops_aerial',       label: 'City Rooftops Aerial',       frames: 121, category: 'SDR→HDR' },
  { id: 'city_roundabout_night',      label: 'City Roundabout Night',      frames: 121, category: 'SDR→HDR' },
  { id: 'dancer_blue_studio',         label: 'Dancer Blue Studio',         frames: 121, category: 'SDR→HDR' },
  { id: 'driver_golden_hour_car',     label: 'Driver Golden Hour Car',     frames: 121, category: 'SDR→HDR' },
  { id: 'dusk_field_clouds',          label: 'Dusk Field Clouds',          frames: 121, category: 'SDR→HDR' },
  { id: 'forest_stream_golden',       label: 'Forest Stream Golden',       frames: 121, category: 'SDR→HDR' },
  { id: 'girls_bokeh_picnic',         label: 'Girls Bokeh Picnic',         frames: 57,  category: 'SDR→HDR' },
  { id: 'golden_street_tower',        label: 'Golden Street Tower',        frames: 121, category: 'SDR→HDR' },
  { id: 'greek_alley_flowers',        label: 'Greek Alley Flowers',        frames: 121, category: 'SDR→HDR' },
  { id: 'horse_pasture_silhouette',   label: 'Horse Pasture Silhouette',   frames: 121, category: 'SDR→HDR' },
  { id: 'lakeside_arches_vista',      label: 'Lakeside Arches Vista',      frames: 121, category: 'SDR→HDR' },
  { id: 'misty_mountains_sunrise',    label: 'Misty Mountains Sunrise',    frames: 121, category: 'SDR→HDR' },
  { id: 'mountain_road_canyon',       label: 'Mountain Road Canyon',       frames: 121, category: 'SDR→HDR' },
  { id: 'mountain_sunrise_portrait',  label: 'Mountain Sunrise Portrait',  frames: 121, category: 'SDR→HDR' },
  { id: 'neon_dancer_club',           label: 'Neon Dancer Club',           frames: 121, category: 'SDR→HDR' },
  { id: 'night_vendor_cart',          label: 'Night Vendor Cart',          frames: 121, category: 'SDR→HDR' },
  { id: 'river_cascade_sunlit',       label: 'River Cascade Sunlit',       frames: 121, category: 'SDR→HDR' },
  // ── Text-to-Video (HDR LoRA, prompt only) ───────
  { id: 'skyline_sunset',             label: 'City Skyline Sunset',        frames: 121, category: 'T2V' },
  { id: 'desert_golden_hour',         label: 'Desert Golden Hour',         frames: 121, category: 'T2V' },
  { id: 'mountain_sunrise',           label: 'Mountain Sunrise Peaks',     frames: 121, category: 'T2V' },
  { id: 'cyberpunk_rain',             label: 'Cyberpunk Rain Neon',        frames: 121, category: 'T2V' },
  { id: 'cozy_window_daylight',       label: 'Cozy Living Room Window',    frames: 121, category: 'T2V' },
  { id: 'window_snowy_outside',       label: 'Dark Room Snow Window',      frames: 121, category: 'T2V' },
  { id: 'rustic_kitchen_sunrise',     label: 'Rustic Kitchen Sunrise',     frames: 121, category: 'T2V' },
  { id: 'abandoned_house_rays',       label: 'Abandoned House Light Rays', frames: 121, category: 'T2V' },
  { id: 'night_street_headlights',    label: 'Night Street Headlights',    frames: 121, category: 'T2V' },
  { id: 'concert_stage_spotlights',   label: 'Concert Stage Spotlights',   frames: 121, category: 'T2V' },
  { id: 'fireworks_water',            label: 'Fireworks Over Water',       frames: 121, category: 'T2V' },
  { id: 'lantern_festival',           label: 'Lantern Festival',           frames: 121, category: 'T2V' },
  { id: 'blacksmith_forge',           label: 'Blacksmith Forge',           frames: 121, category: 'T2V' },
  { id: 'forest_god_rays',            label: 'Forest God Rays',            frames: 121, category: 'T2V' },
  { id: 'neon_alley_steam',           label: 'Neon Alley Steam',           frames: 121, category: 'T2V' },
  { id: 'lamp_window_temp',           label: 'Lamp + Window Color Temp',   frames: 121, category: 'T2V' },
  { id: 'office_fluorescent',         label: 'Office Fluorescent',         frames: 121, category: 'T2V' },
  { id: 'bathroom_mirror',            label: 'Bathroom Mirror Lights',     frames: 121, category: 'T2V' },
  { id: 'subway_platform',            label: 'Subway Platform',            frames: 121, category: 'T2V' },
  // ── Image-to-Video (raw photo → LogC3 PNG → HDR LoRA + LogC3 decode) ──
  { id: 'dsc08348',                   label: 'Temple Elephant Procession', frames: 121, category: 'I2V' },
  { id: 'dsc01108',                   label: 'Chinese Temple Incense',     frames: 121, category: 'I2V' },
  { id: 'dsc02467',                   label: 'Old Town Pavilion',          frames: 121, category: 'I2V' },
  { id: 'dsc01021',                   label: 'Tropical Palms Lily Pond',   frames: 121, category: 'I2V' },
  { id: 'dsc0153',                    label: 'Mountain Ridge Sunset',      frames: 121, category: 'I2V' },
  { id: 'dsc0166',                    label: 'Mountain Summit Clouds',     frames: 121, category: 'I2V' },
  { id: 'dsc00326',                   label: 'Waterfall Yellow Raincoat',  frames: 121, category: 'I2V' },
  { id: 'dsc_0108',                   label: 'Window Light Lighter',       frames: 121, category: 'I2V' },
  { id: 'ryn03000',                   label: 'Photographer Sunset Peaks',  frames: 121, category: 'I2V' },
  { id: 'tag_ryan_photography_tag',   label: 'Chiaroscuro Denim Portrait', frames: 121, category: 'I2V' },
  { id: 'dsc02200',                   label: 'Thai Temple Pavilion',       frames: 121, category: 'I2V' },
  { id: 'dsc00830',                   label: 'Window Gold Leaf Buddha',    frames: 121, category: 'I2V' },
  { id: 'dsc00107',                   label: 'Temple Candles Incense',     frames: 121, category: 'I2V' },
] as const;

// ── State ────────────────────────────────────────────────
let renderer: HDRRenderer;
let rgbData: Float32Array | null = null;
let imgW = 0, imgH = 0;
let params: RenderParams = structuredClone(DEFAULT_PARAMS);
let currentClip: typeof CLIPS[number] = CLIPS[0];
let currentFrame = Math.floor(currentClip.frames / 2);
let loading = false;

let wheels: { lift: ColorWheel; gamma: ColorWheel; gain: ColorWheel; offset: ColorWheel };
let scopeCtx: CanvasRenderingContext2D;
let scopeMode: 'histogram' | 'parade' = 'histogram';
let histRafId = 0;
let lastHistPixels: Uint8Array | null = null;

// SDR compare
let compareOn = false;
let wipePos = 0.5;

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;

// ── Embed mode (for ComfyUI_Gear and other hosts) ───────
// Activated by `?embed=1`. Hides clip picker + timeline, waits for the
// host to push EXR bytes via postMessage instead of loading a default clip.
// Emits `gear:params_changed` on every grade update; accepts
// `gear:load_exr` and `gear:set_params` inbound.
const EMBED = typeof location !== 'undefined'
  && new URLSearchParams(location.search).has('embed');
let applyingRemoteParams = false;

function postToHost(msg: unknown) {
  if (!EMBED || window.parent === window) return;
  window.parent.postMessage(msg, '*');
}

// ── Boot ─────────────────────────────────────────────────
async function boot() {
  if (EMBED) document.body.classList.add('embed-mode');
  await init();
  renderer = new HDRRenderer($<HTMLCanvasElement>('#canvas'));
  scopeCtx = $<HTMLCanvasElement>('#scope-canvas').getContext('2d')!;

  const wc = $<HTMLElement>('#wheels-container');
  const lift   = new ColorWheel(wc, 'Lift',   0.45, 0);
  const gamma  = new ColorWheel(wc, 'Gamma',  0.50, 1);
  const gain   = new ColorWheel(wc, 'Gain',   0.30, 1);
  const offset = new ColorWheel(wc, 'Offset', 0.20, 0);
  wheels = { lift, gamma, gain, offset };
  lift.onUpdate   = () => { params.lift   = lift.values;   renderAndHist(); };
  gamma.onUpdate  = () => { params.gamma  = gamma.values;  renderAndHist(); };
  gain.onUpdate   = () => { params.gain   = gain.values;   renderAndHist(); };
  offset.onUpdate = () => { params.offset = offset.values; renderAndHist(); };

  wireToolbar();
  if (!EMBED) wireTimeline();  // embed mode wires the scrubber lazily in setupSequence()
  wirePanel();
  wireScopeTabs();
  wirePanelToggle();
  wirePanelResize();
  wireCompare();
  wireZoomPan($<HTMLCanvasElement>('#canvas'));
  wirePixelInspector($<HTMLCanvasElement>('#canvas'));

  if (EMBED) {
    wireEmbedHost();
    $<HTMLElement>('.loading').textContent = 'Waiting for image from host…';
    postToHost({ type: 'gear:ready' });
  } else {
    await loadFrame(currentClip.id, currentFrame);
  }
}

// ── Embed: inbound postMessage + param sync ──────────────
function wireEmbedHost() {
  window.addEventListener('message', async (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'gear:load_exr' && msg.buffer instanceof ArrayBuffer) {
      await loadExrBuffer(new Uint8Array(msg.buffer));
    } else if (msg.type === 'gear:load_exr_sequence' && Array.isArray(msg.urls)) {
      await setupSequence(msg.urls, msg.sdrUrls);
    } else if (msg.type === 'gear:load_sdr' && msg.buffer instanceof ArrayBuffer) {
      await loadSDRBuffer(new Uint8Array(msg.buffer), msg.mime || 'image/png');
    } else if (msg.type === 'gear:set_params' && msg.params) {
      applyParamsToUI(msg.params, msg.wheels);
    } else if (msg.type === 'gear:reset') {
      resetAll();
    }
  });
}

// ── Embed: batch / sequence navigation ──────────────────
// When the host passes multiple EXRs (a ComfyUI batch of N images),
// re-enable the bottom timeline as a frame scrubber that decodes on
// demand from the provided URLs. Single-image loads skip this and use
// `gear:load_exr` with a direct buffer transfer.
let sequenceUrls: string[] = [];
let sequenceSdrUrls: string[] | null = null;
let currentSeqIndex = 0;
let seqLoadToken = 0;  // cancels in-flight decodes when user scrubs fast

async function setupSequence(urls: string[], sdrUrls?: string[] | null) {
  sequenceUrls = urls;
  sequenceSdrUrls = (sdrUrls && Array.isArray(sdrUrls) && sdrUrls.length) ? sdrUrls : null;
  currentSeqIndex = 0;
  if (!urls.length) return;

  if (urls.length === 1) {
    // Degenerate "sequence" of 1: keep timeline hidden, fetch + load directly.
    await loadSequenceFrame(0);
    return;
  }

  document.body.classList.add('embed-seq');  // CSS re-enables .timeline

  const fs = $<HTMLInputElement>('#frame-slider');
  fs.min = '0';
  fs.max = String(urls.length - 1);
  fs.step = '1';
  fs.value = '0';
  $<HTMLElement>('#tl-start').textContent = '0';
  $<HTMLElement>('#tl-end').textContent = String(urls.length - 1);
  $<HTMLElement>('#frame-num').textContent = '0';

  fs.oninput = () => {
    currentSeqIndex = +fs.value;
    $<HTMLElement>('#frame-num').textContent = String(currentSeqIndex);
  };
  fs.onchange = () => {
    loadSequenceFrame(+fs.value);
  };

  await loadSequenceFrame(0);
}

async function loadSequenceFrame(i: number) {
  const url = sequenceUrls[i];
  if (!url) return;
  const token = ++seqLoadToken;
  const ov = $<HTMLElement>('.loading');
  ov.classList.remove('hidden');
  ov.textContent = 'Fetching…';
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (token !== seqLoadToken) return;  // superseded by a newer scrub
    currentSeqIndex = i;
    await loadExrBuffer(buf);
    // If host provided per-frame SDR, swap it in too so A|B compare works
    // across the whole sequence.
    if (sequenceSdrUrls && sequenceSdrUrls[i]) {
      try {
        const sdrResp = await fetch(sequenceSdrUrls[i]);
        if (sdrResp.ok && token === seqLoadToken) {
          const sdrBytes = new Uint8Array(await sdrResp.arrayBuffer());
          await loadSDRBuffer(sdrBytes, 'image/png');
        }
      } catch { /* SDR is best-effort */ }
    }
  } catch (e) {
    ov.textContent = `Error: ${(e as Error).message}`;
  }
}

async function loadSDRBuffer(bytes: Uint8Array, mime: string) {
  const blob = new Blob([bytes.slice().buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SDR image decode failed'));
      img.src = url;
    });
    renderer.uploadSDR(img);
    const sx = imgW / img.naturalWidth;
    const sy = imgH / img.naturalHeight;
    const ox = (1 - sx) / 2;
    const oy = (1 - sy) / 2;
    renderer.sdrCrop = [sx, sy, ox, oy];
    requestAnimationFrame(() => renderAndHist());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadExrBuffer(bytes: Uint8Array) {
  const ov = $<HTMLElement>('.loading');
  ov.classList.remove('hidden');
  ov.textContent = 'Decoding…';
  await new Promise(r => setTimeout(r, 0));
  try {
    const t0 = performance.now();
    const dec = decodeRgbExr(bytes);
    const dt = (performance.now() - t0).toFixed(0);
    rgbData = dec.interleavedRgbPixels;
    imgW = dec.width; imgH = dec.height;
    renderer.uploadImage(rgbData, imgW, imgH);
    resetView($<HTMLCanvasElement>('#canvas'));  // each new image starts fit-to-viewport
    // Render inside rAF so the GL draw lands in the next compositor pass.
    // Without this, the draw happens in a macrotask that the compositor
    // may skip — the canvas stays black until *some* subsequent event
    // (e.g. a slider move) forces a re-render in a compositor-synced frame.
    requestAnimationFrame(() => renderAndHist());
    $<HTMLElement>('#info-res').textContent = `${imgW}×${imgH}`;
    showExrDepth(bytes, rgbData, imgW, imgH);
    $<HTMLElement>('#info-decode').textContent = `${dt} ms`;
    ov.classList.add('hidden');
  } catch (e) {
    ov.textContent = `Error: ${(e as Error).message}`;
  }
}

interface WheelStates {
  lift?:   { dx?: number; dy?: number; master?: number };
  gamma?:  { dx?: number; dy?: number; master?: number };
  gain?:   { dx?: number; dy?: number; master?: number };
  offset?: { dx?: number; dy?: number; master?: number };
}

/**
 * Apply a params object to UI controls without re-emitting params_changed
 * back to the host. Tolerant: only keys present in `p` are applied.
 *
 * If `wheelStates` is provided, restore exact wheel dot + master position;
 * otherwise fall back to lossy rgb-only restoration via setValues().
 */
function applyParamsToUI(p: Partial<RenderParams>, wheelStates?: WheelStates) {
  applyingRemoteParams = true;
  try {
    if (p.exposure != null) {
      params.exposure = p.exposure;
      $<HTMLInputElement>('#sl-exposure').value = String(p.exposure);
      $<HTMLInputElement>('#tb-ev').value = p.exposure.toFixed(2);
      $<HTMLElement>('#ev-reset').classList.toggle('show', Math.abs(p.exposure) > 0.001);
    }
    if (p.toneMapping != null) {
      params.toneMapping = p.toneMapping;
      $<HTMLSelectElement>('#tm-select').value = String(p.toneMapping);
    }
    const scalarMap: Array<[keyof RenderParams, string]> = [
      ['softClip', '#sl-softclip'],
      ['contrast', '#sl-contrast'],
      ['pivot', '#sl-pivot'],
      ['shadows', '#sl-shadows'],
      ['highlights', '#sl-highlights'],
      ['temperature', '#sl-temperature'],
      ['tint', '#sl-tint'],
      ['saturation', '#sl-saturation'],
      ['vibrance', '#sl-vibrance'],
      ['hueShift', '#sl-hueshift'],
    ];
    for (const [key, sel] of scalarMap) {
      const v = p[key] as number | undefined;
      if (v == null) continue;
      (params as any)[key] = v;
      setSlider(sel, v);
    }
    // Prefer full wheel state (exact restoration) over rgb-only (lossy).
    if (wheelStates?.lift)   wheels.lift.setState(wheelStates.lift);
    else if (p.lift)         wheels.lift.setValues([...p.lift] as [number,number,number]);
    if (wheelStates?.gamma)  wheels.gamma.setState(wheelStates.gamma);
    else if (p.gamma)        wheels.gamma.setValues([...p.gamma] as [number,number,number]);
    if (wheelStates?.gain)   wheels.gain.setState(wheelStates.gain);
    else if (p.gain)         wheels.gain.setValues([...p.gain] as [number,number,number]);
    if (wheelStates?.offset) wheels.offset.setState(wheelStates.offset);
    else if (p.offset)       wheels.offset.setValues([...p.offset] as [number,number,number]);
    // Sync params.* to whatever the wheels now produce (setState recomputes).
    params.lift   = wheels.lift.values;
    params.gamma  = wheels.gamma.values;
    params.gain   = wheels.gain.values;
    params.offset = wheels.offset.values;
    if (p.falseColor != null) {
      params.falseColor = !!p.falseColor;
      $<HTMLInputElement>('#fc-check').checked = params.falseColor;
      $<HTMLElement>('.fc-legend').classList.toggle('show', params.falseColor);
    }
    requestAnimationFrame(() => renderAndHist());
  } finally {
    applyingRemoteParams = false;
  }
}

// Read the channel pixel type straight from the EXR header, so the reported
// bit depth reflects the actual file rather than an assumption. exrs' decoder
// hands back only {width,height,pixels} and drops the pixel type, so we sniff
// the header ourselves. Returns null for non-EXR / unparseable input.
// pixelType per the OpenEXR spec: 0=UINT (32b), 1=HALF (16b), 2=FLOAT (32b).
function exrChannelDepth(bytes: Uint8Array): { label: string; detail: string } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 8 || dv.getUint32(0, true) !== 20000630) return null;  // bad magic
  let p = 8;  // skip 4-byte magic + 4-byte version field
  const readStr = (limit: number): string => {
    let s = '';
    while (p < limit && bytes[p] !== 0) s += String.fromCharCode(bytes[p++]);
    p++;  // consume null terminator
    return s;
  };
  while (p < bytes.length) {
    const name = readStr(bytes.length);
    if (!name) break;  // empty name = end of header
    const type = readStr(bytes.length);
    const size = dv.getInt32(p, true); p += 4;
    const end = p + size;
    if (name === 'channels' && type === 'chlist') {
      let maxType = -1, count = 0;
      while (p < end) {
        let cname = '';
        while (p < end && bytes[p] !== 0) cname += String.fromCharCode(bytes[p++]);
        p++;
        if (!cname) break;  // empty name = end of channel list
        maxType = Math.max(maxType, dv.getInt32(p, true)); p += 4;
        p += 4 + 8;  // pLinear + 3 reserved, then xSampling + ySampling
        count++;
      }
      if (maxType < 0) return null;
      const bits = maxType === 1 ? 16 : 32;
      const label = maxType === 1 ? '16-bit half' : maxType === 2 ? '32-bit float' : '32-bit uint';
      const kind  = maxType === 1 ? 'half-float' : maxType === 2 ? 'float' : 'uint';
      return { label, detail: `${bits}-bit ${kind} per channel · ${count}×${bits} = ${count * bits} bpp` };
    }
    p = end;  // not the channels attr — skip its value
  }
  return null;
}

// Float32 → IEEE half-float bit pattern. Used to count how many of the
// container's 16-bit levels the signal actually occupies (its *effective*
// depth) — the bit pattern collapses sub-half noise and caps the count at the
// container, so the estimate can't exceed what the file can hold.
const _f32buf = new Float32Array(1);
const _i32buf = new Int32Array(_f32buf.buffer);
function f16bits(val: number): number {
  _f32buf[0] = val;
  const x = _i32buf[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = (x >>> 23) & 0xff;
  let mant = x & 0x007fffff;
  if (exp === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0);  // inf / nan
  exp = exp - 127 + 15;
  if (exp >= 31) return sign | 0x7c00;                           // overflow → inf
  if (exp <= 0) {                                                // subnormal / underflow
    if (exp < -10) return sign;
    mant = (mant | 0x00800000) >> (1 - exp);
    return sign | (mant >> 13);
  }
  return sign | (exp << 10) | (mant >> 13);
}

// Measure the tonal information the model actually produced, from the decoded
// linear buffer. "Effective bits" = log2(distinct half-levels occupied) — a
// pure tone curve over 8-bit input couldn't exceed 8; spatial synthesis pushes
// it toward the container ceiling. "stops" = how far highlights reach past SDR
// white (luminance 1.0), read off a robust p99.9 percentile.
function analyzeHdrDepth(rgb: Float32Array | null, n: number):
    { effBits: number; bitsGained: number; stops: number; distinct: number } | null {
  if (!rgb || n <= 0) return null;
  // Distinct-level counts are biased low under subsampling, so process every
  // pixel up to ~4M (these frames are ~2M → stride 1); only very large frames
  // get strided. This is a full-image pass — callers run it deferred.
  const stride = Math.max(1, Math.floor(n / 4_000_000));
  const pres = [new Uint8Array(65536), new Uint8Array(65536), new Uint8Array(65536)];
  const BINS = 256, LO = -12, HI = 12, SPAN = HI - LO;   // log2-luminance histogram
  const BSCALE = BINS / SPAN;
  const lh = new Uint32Array(BINS); let lcount = 0;
  for (let i = 0; i < n; i += stride) {
    const o = i * 3;
    const r = rgb[o], g = rgb[o + 1], b = rgb[o + 2];
    pres[0][f16bits(r)] = 1; pres[1][f16bits(g)] = 1; pres[2][f16bits(b)] = 1;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > 0) {
      // cheap log2 via the float exponent + linear-interpolated mantissa
      // (≤0.086 error — well under one 0.094-stop bin); avoids Math.log2.
      _f32buf[0] = lum;
      const xb = _i32buf[0];
      const log2lum = (((xb >>> 23) & 0xff) - 127) + (xb & 0x7fffff) / 0x800000;
      let bi = ((log2lum - LO) * BSCALE) | 0;
      if (bi < 0) bi = 0; else if (bi >= BINS) bi = BINS - 1;
      lh[bi]++; lcount++;
    }
  }
  const count = (p: Uint8Array) => { let c = 0; for (let i = 0; i < 65536; i++) c += p[i]; return c; };
  const d = [count(pres[0]), count(pres[1]), count(pres[2])].sort((a, b) => a - b);
  const distinct = d[1];                          // median channel — conservative
  const effBits = Math.log2(Math.max(distinct, 1));
  let acc = 0; const thr = lcount * 0.999; let pbin = BINS - 1;
  for (let i = 0; i < BINS; i++) { acc += lh[i]; if (acc >= thr) { pbin = i; break; } }
  const stops = Math.max(0, LO + ((pbin + 0.5) / BINS) * SPAN);
  return { effBits, bitsGained: effBits - 8, stops, distinct };
}

let _depthToken = 0;
function showExrDepth(bytes: Uint8Array, rgb: Float32Array | null, w: number, h: number) {
  const d = exrChannelDepth(bytes);
  const el = $<HTMLElement>('#info-depth');
  if (!d) { el.textContent = ''; el.title = ''; return; }
  // Container label is free (header sniff) — show it immediately.
  el.textContent = d.label;
  el.title = d.detail;
  // The effective-depth estimate is a full-image pass (~70ms). Run it off the
  // decode path and cancel if a newer frame arrives, so scrubbing stays smooth
  // and only the frame the user lands on pays the cost.
  const tok = ++_depthToken;
  setTimeout(() => {
    if (tok !== _depthToken) return;            // superseded by a newer frame
    const a = analyzeHdrDepth(rgb, w * h);
    if (tok !== _depthToken || !a) return;
    el.textContent = `${d.label} · ~${Math.round(a.effBits)}-bit effective`;
    el.title =
      `Container: ${d.detail}\n` +
      `Measured (live): 8-bit SDR in → ~${a.effBits.toFixed(1)}-bit out\n` +
      `+${a.bitsGained.toFixed(1)} bits tonal detail vs 8-bit · +${a.stops.toFixed(1)} stops over SDR white\n` +
      `${a.distinct.toLocaleString()} distinct levels/channel`;
  }, 50);
}

// ── EXR loading ──────────────────────────────────────────
// In dev: /clips/ is served by Vite middleware from ../clips/.
// In prod: Vite injects VITE_CLIP_BASE_URL (e.g. HuggingFace dataset URL).
const CLIP_BASE = (import.meta.env.VITE_CLIP_BASE_URL ?? '/clips').replace(/\/$/, '');

function frameUrl(clip: string, frame: number) {
  return `${CLIP_BASE}/${clip}/hdr_exr/frame_${String(frame).padStart(5, '0')}.exr`;
}
function sdrUrl(clip: string, frame: number) {
  return `${CLIP_BASE}/${clip}/sdr_png/frame_${String(frame).padStart(5, '0')}.png`;
}

async function loadFrame(clip: string, frame: number) {
  if (loading) return;
  loading = true;
  const ov = $<HTMLElement>('.loading');
  ov.classList.remove('hidden');
  ov.textContent = 'Loading EXR\u2026';
  try {
    const resp = await fetch(frameUrl(clip, frame));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    ov.textContent = 'Decoding\u2026';
    await new Promise(r => setTimeout(r, 0));
    const t0 = performance.now();
    const dec = decodeRgbExr(buf);
    const dt = (performance.now() - t0).toFixed(0);
    rgbData = dec.interleavedRgbPixels;
    imgW = dec.width; imgH = dec.height;
    renderer.uploadImage(rgbData, imgW, imgH);
    resetView($<HTMLCanvasElement>('#canvas'));  // standalone clip browser also fits each new frame
    renderAndHist();
    $<HTMLElement>('#info-res').textContent = `${imgW}\u00d7${imgH}`;
    showExrDepth(buf, rgbData, imgW, imgH);
    $<HTMLElement>('#info-decode').textContent = `${dt} ms`;
    // load SDR counterpart if compare is on
    if (compareOn) loadSDR(clip, frame);
  } catch (e) {
    ov.textContent = `Error: ${(e as Error).message}`;
    loading = false; return;
  }
  ov.classList.add('hidden');
  loading = false;
}

// ── .cube LUT parser ─────────────────────────────────────
function parseCube(text: string): { size: number; data: Float32Array } | null {
  const lines = text.split(/\r?\n/);
  let size = 0;
  const values: number[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('TITLE') || t.startsWith('DOMAIN')) continue;
    if (t.startsWith('LUT_3D_SIZE')) {
      size = parseInt(t.split(/\s+/)[1], 10);
      continue;
    }
    if (t.startsWith('LUT_1D_SIZE')) return null; // 1D LUTs not supported
    const parts = t.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
      if (!isNaN(r)) { values.push(r, g, b); }
    }
  }
  if (size < 2 || values.length !== size * size * size * 3) return null;
  return { size, data: new Float32Array(values) };
}

function loadSDR(clip: string, frame: number) {
  const img = new Image();
  // SDR is uploaded to a WebGL texture; a cross-origin image (prod clips come from
  // the HuggingFace dataset) must be CORS-approved or texImage2D throws SecurityError
  // and the SDR side renders black. HF sends ACAO:*, so anonymous CORS succeeds.
  // Harmless for same-origin dev (/clips/...).
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    renderer.uploadSDR(img);
    // Compute crop mapping: HDR UVs [0,1] → center crop of SDR
    const sx = imgW / img.naturalWidth;   // e.g. 1920/1920=1 or 1024/1080=0.948
    const sy = imgH / img.naturalHeight;  // e.g. 1024/1080=0.948 or 1920/1920=1
    const ox = (1 - sx) / 2;
    const oy = (1 - sy) / 2;
    renderer.sdrCrop = [sx, sy, ox, oy];
    renderAndHist();
  };
  img.src = sdrUrl(clip, frame);
}

// ── Render + scope ───────────────────────────────────────
function getWheelStates() {
  return {
    lift:   wheels.lift.getState(),
    gamma:  wheels.gamma.getState(),
    gain:   wheels.gain.getState(),
    offset: wheels.offset.getState(),
  };
}

function renderAndHist() {
  if (!rgbData) return;
  renderer.render(params);
  if (EMBED && !applyingRemoteParams) {
    postToHost({
      type: 'gear:params_changed',
      params: structuredClone(params),
      wheels: getWheelStates(),
    });
  }
  if (histRafId) return;
  histRafId = requestAnimationFrame(() => {
    histRafId = 0;
    if (!rgbData) return;
    lastHistPixels = renderer.readHistogramPixels(params);
    renderer.render(params);
    drawScope();
  });
}

function drawScope() {
  if (!lastHistPixels) return;
  const c = scopeCtx.canvas;
  if (scopeMode === 'parade') {
    drawParade(scopeCtx, lastHistPixels, 320, 180, c.width, c.height);
  } else {
    const [rH, gH, bH] = computeHistogram(lastHistPixels);
    drawHistogram(scopeCtx, rH, gH, bH, c.width, c.height);
  }
}

// ══════════════════════════════════════════════════════════
//  UI wiring
// ══════════════════════════════════════════════════════════

function wireToolbar() {
  // Thumbnail clip picker — only built in standalone mode. Embed mode has
  // no clip catalog, and even hidden <img src=...> elements would issue
  // (failing) HTTP requests for thumbnails the host doesn't serve.
  if (!EMBED) {
    const trigger = $<HTMLButtonElement>('#clip-trigger');
    const triggerThumb = $<HTMLImageElement>('#clip-trigger-thumb');
    const triggerName = $<HTMLElement>('#clip-trigger-name');
    const popup = $<HTMLElement>('#clip-popup');
    const grid = $<HTMLElement>('#clip-grid');

    const thumbUrl = (id: string) => `${CLIP_BASE}/${id}/thumbnail.jpg`;

    function updateTrigger() {
      triggerThumb.src = thumbUrl(currentClip.id);
      triggerName.textContent = currentClip.label;
    }

    function selectClip(i: number) {
      currentClip = CLIPS[i];
      const fs = $<HTMLInputElement>('#frame-slider');
      fs.max = String(currentClip.frames - 1);
      $<HTMLElement>('#tl-end').textContent = String(currentClip.frames - 1);
      currentFrame = Math.min(currentFrame, currentClip.frames - 1);
      fs.value = String(currentFrame);
      $<HTMLElement>('#frame-num').textContent = String(currentFrame);
      updateTrigger();
      grid.querySelectorAll('.clip-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === i);
      });
      popup.classList.remove('open');
      loadFrame(currentClip.id, currentFrame);
    }

    let prevCategory: string | null = null;
    CLIPS.forEach((c, i) => {
      // Category header — emitted once per category transition.
      if (c.category !== prevCategory) {
        const header = document.createElement('div');
        header.className = 'clip-category';
        header.textContent = c.category;
        grid.appendChild(header);
        prevCategory = c.category;
      }
      const item = document.createElement('div');
      item.className = 'clip-item' + (i === 0 ? ' active' : '');
      item.innerHTML =
        `<img class="clip-item-thumb" src="${thumbUrl(c.id)}" loading="lazy" alt=""/>` +
        `<div class="clip-item-name">${c.label}</div>`;
      item.addEventListener('click', () => selectClip(i));
      grid.appendChild(item);
    });
    updateTrigger();

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!popup.contains(e.target as Node) && e.target !== trigger) {
        popup.classList.remove('open');
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') popup.classList.remove('open');
    });
  }

  // EV slider + number input + reset
  const evSlider = $<HTMLInputElement>('#sl-exposure');
  const evNum = $<HTMLInputElement>('#tb-ev');
  const evReset = $<HTMLElement>('#ev-reset');

  function setEV(val: number) {
    val = Math.max(-6, Math.min(6, val));
    params.exposure = val;
    evSlider.value = String(val);
    evNum.value = val.toFixed(2);
    evReset.classList.toggle('show', Math.abs(val) > 0.001);
    renderAndHist();
  }

  evSlider.addEventListener('input', () => setEV(+evSlider.value));
  evNum.addEventListener('change', () => setEV(parseFloat(evNum.value) || 0));
  evNum.addEventListener('keydown', (e) => { if (e.key === 'Enter') evNum.blur(); });
  evReset.addEventListener('click', () => setEV(0));

  // tone mapping
  const tmSel = $<HTMLSelectElement>('#tm-select');
  tmSel.value = String(params.toneMapping);
  tmSel.addEventListener('change', () => { params.toneMapping = +tmSel.value; renderAndHist(); });

  // LUT loader
  const lutBtn = $<HTMLElement>('#btn-lut');
  const lutFile = $<HTMLInputElement>('#lut-file');
  const lutName = $<HTMLElement>('#lut-name');

  lutBtn.addEventListener('click', () => {
    if (renderer.lutEnabled) {
      // Toggle off
      renderer.clearLUT();
      lutBtn.classList.remove('active');
      lutName.textContent = '';
      renderAndHist();
    } else {
      lutFile.click();
    }
  });

  lutFile.addEventListener('change', () => {
    const file = lutFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCube(reader.result as string);
      if (!result) { alert('Could not parse .cube file (only 3D LUTs supported)'); return; }
      renderer.uploadLUT(result.data, result.size);
      lutBtn.classList.add('active');
      lutName.textContent = file.name.replace('.cube', '');
      renderAndHist();
    };
    reader.readAsText(file);
    lutFile.value = ''; // allow re-selecting same file
  });
}

function wireTimeline() {
  const fs = $<HTMLInputElement>('#frame-slider');
  fs.max = String(currentClip.frames - 1);
  fs.value = String(currentFrame);
  $<HTMLElement>('#frame-num').textContent = String(currentFrame);
  $<HTMLElement>('#tl-end').textContent = String(currentClip.frames - 1);

  fs.addEventListener('input', () => {
    currentFrame = +fs.value;
    $<HTMLElement>('#frame-num').textContent = String(currentFrame);
  });
  fs.addEventListener('change', () => {
    currentFrame = +fs.value;
    loadFrame(currentClip.id, currentFrame);
  });
}

function wirePanel() {
  bindSlider('#sl-softclip',    'softClip',    v => v.toFixed(2));
  bindSlider('#sl-contrast',    'contrast',    v => v.toFixed(2));
  bindSlider('#sl-pivot',       'pivot',       v => v.toFixed(2));
  bindSlider('#sl-shadows',     'shadows',     v => v.toFixed(2));
  bindSlider('#sl-highlights',  'highlights',  v => v.toFixed(2));
  bindSlider('#sl-temperature', 'temperature', v => v.toFixed(2));
  bindSlider('#sl-tint',        'tint',        v => v.toFixed(2));
  bindSlider('#sl-saturation',  'saturation',  v => v.toFixed(2));
  bindSlider('#sl-vibrance',    'vibrance',    v => v.toFixed(2));
  bindSlider('#sl-hueshift',    'hueShift',    v => `${v.toFixed(0)}\u00b0`);

  $<HTMLInputElement>('#fc-check').addEventListener('change', (e) => {
    params.falseColor = (e.target as HTMLInputElement).checked;
    $<HTMLElement>('.fc-legend').classList.toggle('show', params.falseColor);
    renderAndHist();
  });

  $<HTMLElement>('#btn-reset').addEventListener('click', resetAll);
}

function wireScopeTabs() {
  document.querySelectorAll<HTMLElement>('.scope-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scope-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scopeMode = btn.dataset.mode as 'histogram' | 'parade';
      drawScope();
    });
  });
}

function wirePanelToggle() {
  const wrap = $<HTMLElement>('#panel-wrap');
  const btn = $<HTMLElement>('#btn-panel');
  function toggle() {
    wrap.classList.toggle('hidden');
    btn.classList.toggle('active', !wrap.classList.contains('hidden'));
  }
  btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault(); toggle();
    }
  });
  btn.classList.add('active');
}

function wirePanelResize() {
  const wrap = $<HTMLElement>('#panel-wrap');
  const handle = $<HTMLElement>('#panel-resize');
  let dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    dragging = true; handle.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    wrap.style.width = Math.max(260, Math.min(600, document.documentElement.clientWidth - e.clientX)) + 'px';
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return; dragging = false;
    document.body.style.cursor = ''; document.body.style.userSelect = '';
  });
}

// ── SDR Compare (wipe) ───────────────────────────────────
function wireCompare() {
  const btn = $<HTMLElement>('#btn-compare');
  const wipeLine = $<HTMLElement>('#wipe-line');
  const lblL = $<HTMLElement>('#wipe-label-l');
  const lblR = $<HTMLElement>('#wipe-label-r');
  const canvas = $<HTMLCanvasElement>('#canvas');

  function toggleCompare() {
    compareOn = !compareOn;
    renderer.compareOn = compareOn;
    btn.classList.toggle('active', compareOn);
    wipeLine.classList.toggle('active', compareOn);
    lblL.classList.toggle('active', compareOn);
    lblR.classList.toggle('active', compareOn);
    if (compareOn) loadSDR(currentClip.id, currentFrame);
    renderAndHist();
    updateWipeUI();
  }

  btn.addEventListener('click', toggleCompare);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'c' && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') toggleCompare();
  });

  // wipe drag — on the canvas itself (not just the thin line)
  let wipeDrag = false;
  wipeLine.addEventListener('pointerdown', (e) => {
    wipeDrag = true; wipeLine.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!compareOn || e.ctrlKey) return;
    wipeDrag = true;
    const rect = canvas.getBoundingClientRect();
    wipePos = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    renderer.wipePos = wipePos;
    renderAndHist();
    updateWipeUI();
  });
  window.addEventListener('pointermove', (e) => {
    if (!wipeDrag || !compareOn) return;
    const rect = canvas.getBoundingClientRect();
    wipePos = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    renderer.wipePos = wipePos;
    renderAndHist();
    updateWipeUI();
  });
  window.addEventListener('pointerup', () => { wipeDrag = false; });
}

function updateWipeUI() {
  const wipeLine = $<HTMLElement>('#wipe-line');
  const lblL = $<HTMLElement>('#wipe-label-l');
  const lblR = $<HTMLElement>('#wipe-label-r');
  // Position CSS wipe line over the canvas area
  const canvas = $<HTMLCanvasElement>('#canvas');
  const rect = canvas.getBoundingClientRect();
  const viewport = canvas.closest('.viewport') as HTMLElement;
  const vRect = viewport.getBoundingClientRect();
  const lineX = rect.left - vRect.left + rect.width * wipePos;
  wipeLine.style.left = lineX + 'px';
  lblL.style.left = (rect.left - vRect.left + rect.width * wipePos * 0.5) + 'px';
  lblR.style.left = (rect.left - vRect.left + rect.width * (wipePos + (1 - wipePos) * 0.5)) + 'px';
}

// ── Pixel inspector ──────────────────────────────────────
// ── Zoom + Pan (CSS transform) ───────────────────────────
//   Wheel               — zoom in/out, centered on cursor
//   Middle-drag         — pan (always)
//   Left-drag           — pan (only when compare wipe is OFF; otherwise
//                         left-drag drives the wipe line)
//   Double-click / 0/F  — reset to fit
//
// CSS-transform-based so the canvas itself grows beyond its fit-to-
// viewport size at zoom > 1 (viewport has overflow:hidden). Pan and
// pixel inspection both use getBoundingClientRect, which returns the
// post-transform rect — no manual inverse math needed.
let viewZoom = 1;
let viewPanX = 0;  // CSS pixels
let viewPanY = 0;

function applyView(canvas: HTMLCanvasElement) {
  canvas.style.transformOrigin = '50% 50%';
  canvas.style.transform = `translate(${viewPanX}px, ${viewPanY}px) scale(${viewZoom})`;
  // Wipe overlay positions reference the canvas's bounding rect, which
  // is post-transform — keep them in sync after every change.
  if (compareOn) updateWipeUI();
}

function resetView(canvas: HTMLCanvasElement) {
  viewZoom = 1; viewPanX = 0; viewPanY = 0;
  applyView(canvas);
}

function wireZoomPan(canvas: HTMLCanvasElement) {
  let panning = false;
  let startX = 0, startY = 0, startPanX = 0, startPanY = 0;

  canvas.addEventListener('wheel', (e) => {
    if (!rgbData) return;
    e.preventDefault();
    // Cursor's image-UV BEFORE zoom — held constant after.
    const rect = canvas.getBoundingClientRect();
    const ux = (e.clientX - rect.left) / rect.width;
    const uy = (e.clientY - rect.top) / rect.height;
    const oldZ = viewZoom;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newZ = Math.max(0.1, Math.min(64, oldZ * factor));
    if (newZ === oldZ) return;
    // After zoom alone (with transform-origin: center), the rect grows
    // around its own center. We then translate so the cursor lands on
    // the same image-UV.
    const newW = rect.width  * (newZ / oldZ);
    const newH = rect.height * (newZ / oldZ);
    const newLeftIfNoPanChange = rect.left + rect.width  / 2 - newW / 2;
    const newTopIfNoPanChange  = rect.top  + rect.height / 2 - newH / 2;
    viewPanX += (e.clientX - ux * newW) - newLeftIfNoPanChange;
    viewPanY += (e.clientY - uy * newH) - newTopIfNoPanChange;
    viewZoom = newZ;
    applyView(canvas);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    if (!rgbData) return;
    if (e.ctrlKey) return;                     // Ctrl+click = probe
    if (e.button === 0 && compareOn) return;   // wipe owns left-drag
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    panning = true;
    canvas.setPointerCapture(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    startPanX = viewPanX; startPanY = viewPanY;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!panning) return;
    // Pan in screen pixels — drag direction matches image direction.
    viewPanX = startPanX + (e.clientX - startX);
    viewPanY = startPanY + (e.clientY - startY);
    applyView(canvas);
  });

  const endPan = () => {
    if (!panning) return;
    panning = false;
    canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', endPan);
  canvas.addEventListener('pointercancel', endPan);

  canvas.addEventListener('dblclick', (e) => {
    if (compareOn || e.ctrlKey) return;
    resetView(canvas);
  });

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;
    if (e.key === '0' || e.key === 'f' || e.key === 'F') resetView(canvas);
  });
}

function wirePixelInspector(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', (e) => {
    if (!rgbData) return;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) * imgW / rect.width);
    const py = Math.floor((e.clientY - rect.top) * imgH / rect.height);
    if (px < 0 || py < 0 || px >= imgW || py >= imgH) return;
    const idx = (py * imgW + px) * 3;
    const r = rgbData[idx], g = rgbData[idx+1], b = rgbData[idx+2];
    $<HTMLElement>('#px-coord').textContent = `(${px}, ${py})`;
    $<HTMLElement>('#px-rgb').textContent = `R:${fmtF(r)} G:${fmtF(g)} B:${fmtF(b)}`;
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    $<HTMLElement>('#px-lum').textContent = `L:${fmtF(lum)}`;
    $<HTMLElement>('#px-swatch').style.background = `rgb(${cl(r)*255|0},${cl(g)*255|0},${cl(b)*255|0})`;
  });
  canvas.addEventListener('mouseleave', () => {
    $<HTMLElement>('#px-coord').textContent = '';
    $<HTMLElement>('#px-rgb').textContent = '';
    $<HTMLElement>('#px-lum').textContent = '';
  });

  // Ctrl+click probe
  const probe = $<HTMLElement>('#probe');
  const probeLbl = probe.querySelector('.probe-label') as HTMLElement;
  const viewport = canvas.closest('.viewport') as HTMLElement;

  canvas.addEventListener('click', (e) => {
    if (!e.ctrlKey || !rgbData) { probe.classList.remove('show'); return; }
    const cRect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - cRect.left) * imgW / cRect.width);
    const py = Math.floor((e.clientY - cRect.top) * imgH / cRect.height);
    if (px < 0 || py < 0 || px >= imgW || py >= imgH) return;
    const idx = (py * imgW + px) * 3;
    const r = rgbData[idx], g = rgbData[idx+1], b = rgbData[idx+2];
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    const ev = lum > 1e-6 ? Math.log2(lum / 0.18) : -Infinity;
    const evStr = ev > -20 ? `${ev >= 0 ? '+' : ''}${ev.toFixed(1)} EV` : '\u2212\u221e EV';
    const vRect = viewport.getBoundingClientRect();
    const probeX = e.clientX - vRect.left, probeY = e.clientY - vRect.top;
    probe.style.left = probeX + 'px'; probe.style.top = probeY + 'px';
    if (probeX > vRect.width * 0.65) { probeLbl.style.left = 'auto'; probeLbl.style.right = '14px'; }
    else { probeLbl.style.left = '14px'; probeLbl.style.right = 'auto'; }
    probeLbl.innerHTML =
      `<span style="color:var(--dim)">(${px}, ${py})</span>` +
      `<span class="pr">R: ${fmtF(r)}</span><span class="pg">G: ${fmtF(g)}</span>` +
      `<span class="pb">B: ${fmtF(b)}</span><span class="pl">L: ${fmtF(lum)}</span>` +
      `<span class="pev">${evStr}</span>`;
    probe.classList.add('show');
  });

  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') probe.classList.remove('show'); });
}

// ══════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════

type ScalarKey = { [K in keyof RenderParams]: RenderParams[K] extends number ? K : never }[keyof RenderParams];

function bindSlider(sel: string, key: ScalarKey, fmt: (v: number) => string) {
  const slider = $<HTMLInputElement>(sel);
  const labelRow = slider.closest('.slider-row')!.querySelector('.label-row') as HTMLElement;
  const oldVal = labelRow.querySelector('.val') as HTMLElement;
  const defaultVal = DEFAULT_PARAMS[key] as number;

  const numInput = document.createElement('input');
  numInput.type = 'number'; numInput.className = 'val-input';
  numInput.step = slider.step; numInput.min = slider.min; numInput.max = slider.max;
  oldVal.replaceWith(numInput);

  const rst = document.createElement('button');
  rst.className = 'sl-reset'; rst.innerHTML = '&#x21ba;';
  rst.title = `Reset to ${fmt(defaultVal)}`;
  labelRow.insertBefore(rst, numInput);

  function syncAll(val: number) {
    (params as any)[key] = val;
    slider.value = String(val);
    numInput.value = fmt(val).replace('°', '');
    rst.classList.toggle('show', Math.abs(val - defaultVal) > 0.001);
    renderAndHist();
  }
  syncAll(params[key] as number);
  slider.addEventListener('input', () => syncAll(+slider.value));
  numInput.addEventListener('change', () => {
    let v = parseFloat(numInput.value); if (isNaN(v)) v = defaultVal;
    syncAll(Math.max(+slider.min, Math.min(+slider.max, v)));
  });
  numInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') numInput.blur(); });
  rst.addEventListener('click', () => syncAll(defaultVal));
}

function setSlider(sel: string, value: number) {
  $<HTMLInputElement>(sel).value = String(value);
  $<HTMLInputElement>(sel).dispatchEvent(new Event('input'));
}

function resetAll() {
  params = structuredClone(DEFAULT_PARAMS);
  // toolbar
  $<HTMLInputElement>('#sl-exposure').value = '0';
  $<HTMLInputElement>('#tb-ev').value = '0.00';
  $<HTMLElement>('#ev-reset').classList.remove('show');
  $<HTMLSelectElement>('#tm-select').value = String(params.toneMapping);
  // panel sliders
  setSlider('#sl-softclip', params.softClip);
  setSlider('#sl-contrast', params.contrast);
  setSlider('#sl-pivot', params.pivot);
  setSlider('#sl-shadows', params.shadows);
  setSlider('#sl-highlights', params.highlights);
  setSlider('#sl-temperature', params.temperature);
  setSlider('#sl-tint', params.tint);
  setSlider('#sl-saturation', params.saturation);
  setSlider('#sl-vibrance', params.vibrance);
  setSlider('#sl-hueshift', params.hueShift);
  wheels.lift.reset(); wheels.gamma.reset(); wheels.gain.reset(); wheels.offset.reset();
  $<HTMLInputElement>('#fc-check').checked = false;
  $<HTMLElement>('.fc-legend').classList.remove('show');
  renderAndHist();
}

function fmtF(v: number) { return Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(4); }
function cl(v: number) { return Math.max(0, Math.min(1, v)); }

boot().catch(console.error);
