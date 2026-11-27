import type { Garment } from '../data/schema';
import type { BoardSlots, SlotKey } from './stylist';
import { detectGarmentSubtype, type GarmentSubtype } from '../components/GarmentSilhouette';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  color: string;
  slot: SlotKey | 'podium' | 'mannequin';
  shininess: number;
  doubleSided?: boolean;
}

export interface RenderedHitBox {
  slot: SlotKey;
  garment: Garment;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Render3DSceneOptions {
  slots: BoardSlots;
  byId: Map<string, Garment>;
  rotYDeg: number;
  rotXDeg: number;
  zoom: number;
  exploded: boolean;
  hoveredSlot?: SlotKey | null;
  selectedAccent?: string;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [140, 130, 118];
}

function shadeRgb(
  rgb: [number, number, number],
  nx: number,
  ny: number,
  nz: number,
  shininess: number,
  isHovered: boolean,
): string {
  // Key light: upper front-right
  const kx = 0.45;
  const ky = 0.68;
  const kz = 0.58;
  const keyDiff = Math.max(0, nx * kx + ny * ky + nz * kz);

  // Fill light: soft left-front
  const fillDiff = Math.max(0, nx * -0.65 + ny * 0.25 + nz * 0.42);

  // Rim light: crisp back-left separation (prevents dark black clothes from flattening)
  const rim = Math.pow(Math.max(0, 1 - Math.abs(nz)), 2.2) * (0.38 + 0.25 * Math.max(0, -nx + ny));

  // Blinn-Phong specular highlight (view vector ≈ (0,0,1))
  const hx = kx;
  const hy = ky;
  const hz = kz + 1;
  const hLen = Math.hypot(hx, hy, hz) || 1;
  const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);
  const spec = Math.pow(ndh, 18) * shininess;

  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const ambientLift = luminance < 0.14 ? 0.34 : 0.28;
  const intensity = ambientLift + keyDiff * 0.66 + fillDiff * 0.24 + (isHovered ? 0.14 : 0);

  const rimBoost = (rim * (luminance < 0.2 ? 95 : 42)) + spec * 150;
  const r = Math.min(255, Math.max(0, Math.round(rgb[0] * intensity + rimBoost)));
  const g = Math.min(255, Math.max(0, Math.round(rgb[1] * intensity + rimBoost * 0.98)));
  const b = Math.min(255, Math.max(0, Math.round(rgb[2] * intensity + rimBoost * 1.02)));
  return `rgb(${r},${g},${b})`;
}

interface RingDef {
  y: number;
  rx: number;
  rz: number;
  x?: number;
  z?: number;
  chestBulge?: number;
  backPinch?: number;
  squareness?: number;
}

function pushQuad(
  tris: Triangle[],
  p00: Vec3,
  p10: Vec3,
  p11: Vec3,
  p01: Vec3,
  color: string,
  slot: Triangle['slot'],
  shininess: number,
  doubleSided = false,
) {
  tris.push(
    { a: p00, b: p10, c: p11, color, slot, shininess, doubleSided },
    { a: p00, b: p11, c: p01, color, slot, shininess, doubleSided },
  );
}

/**
 * Generates a closed 3D sculpted mesh across elliptical rings with optional
 * chest contour, front opening gap, and top/bottom end caps.
 */
function addLoftedBody(
  tris: Triangle[],
  rings: RingDef[],
  color: string,
  slot: Triangle['slot'],
  shininess: number,
  segments = 20,
  capTop = true,
  capBottom = true,
  openFrontWidth = 0, // 0..0.35 radians half-gap around +Z axis (angle pi/2)
  innerColor?: string,
) {
  const ringVerts: Vec3[][] = [];
  const startAngle = openFrontWidth > 0 ? Math.PI * 0.5 + openFrontWidth : 0;
  const endAngle = openFrontWidth > 0 ? Math.PI * 2.5 - openFrontWidth : Math.PI * 2;
  const isOpen = openFrontWidth > 0;
  const steps = segments;

  for (const ring of rings) {
    const verts: Vec3[] = [];
    const cx = ring.x ?? 0;
    const cz = ring.z ?? 0;
    const sq = ring.squareness ?? 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = startAngle + t * (endAngle - startAngle);
      let cosA = Math.cos(ang);
      let sinA = Math.sin(ang);
      if (sq > 0) {
        const sgnX = Math.sign(cosA);
        const sgnZ = Math.sign(sinA);
        cosA = sgnX * Math.pow(Math.abs(cosA), 1 - sq * 0.55);
        sinA = sgnZ * Math.pow(Math.abs(sinA), 1 - sq * 0.55);
      }
      let zScale = 1;
      if (sinA > 0 && ring.chestBulge) zScale += ring.chestBulge * sinA;
      if (sinA < 0 && ring.backPinch) zScale -= ring.backPinch * Math.abs(sinA);
      verts.push({
        x: cx + cosA * ring.rx,
        y: ring.y,
        z: cz + sinA * ring.rz * zScale,
      });
    }
    ringVerts.push(verts);
  }

  for (let r = 0; r < ringVerts.length - 1; r++) {
    const lower = ringVerts[r]!;
    const upper = ringVerts[r + 1]!;
    for (let i = 0; i < steps; i++) {
      // Lower -> Upper CCW outward winding
      pushQuad(tris, lower[i]!, lower[i + 1]!, upper[i + 1]!, upper[i]!, color, slot, shininess, isOpen);
      if (isOpen && innerColor) {
        // Inner dark lining thickness inset slightly
        const inset = 0.88;
        const cl = rings[r]!;
        const cu = rings[r + 1]!;
        const il0: Vec3 = {
          x: (cl.x ?? 0) + (lower[i]!.x - (cl.x ?? 0)) * inset,
          y: lower[i]!.y,
          z: (cl.z ?? 0) + (lower[i]!.z - (cl.z ?? 0)) * inset,
        };
        const il1: Vec3 = {
          x: (cl.x ?? 0) + (lower[i + 1]!.x - (cl.x ?? 0)) * inset,
          y: lower[i + 1]!.y,
          z: (cl.z ?? 0) + (lower[i + 1]!.z - (cl.z ?? 0)) * inset,
        };
        const iu1: Vec3 = {
          x: (cu.x ?? 0) + (upper[i + 1]!.x - (cu.x ?? 0)) * inset,
          y: upper[i + 1]!.y,
          z: (cu.z ?? 0) + (upper[i + 1]!.z - (cu.z ?? 0)) * inset,
        };
        const iu0: Vec3 = {
          x: (cu.x ?? 0) + (upper[i]!.x - (cu.x ?? 0)) * inset,
          y: upper[i]!.y,
          z: (cu.z ?? 0) + (upper[i]!.z - (cu.z ?? 0)) * inset,
        };
        pushQuad(tris, iu0, iu1, il1, il0, innerColor, slot, shininess * 0.5, false);
      }
    }
  }

  if (!isOpen && capTop && ringVerts.length > 0) {
    const topRing = ringVerts[ringVerts.length - 1]!;
    const topDef = rings[rings.length - 1]!;
    const center: Vec3 = { x: topDef.x ?? 0, y: topDef.y, z: topDef.z ?? 0 };
    const capCol = innerColor ?? color;
    for (let i = 0; i < steps; i++) {
      tris.push({ a: center, b: topRing[i]!, c: topRing[i + 1]!, color: capCol, slot, shininess: shininess * 0.5 });
    }
  }
  if (!isOpen && capBottom && ringVerts.length > 0) {
    const botRing = ringVerts[0]!;
    const botDef = rings[0]!;
    const center: Vec3 = { x: botDef.x ?? 0, y: botDef.y, z: botDef.z ?? 0 };
    for (let i = 0; i < steps; i++) {
      tris.push({ a: center, b: botRing[i + 1]!, c: botRing[i]!, color, slot, shininess: shininess * 0.5 });
    }
  }
}

/**
 * Generates a tapered 3D tube between 3D waypoints (sleeves, trouser legs, straps).
 */
function addTube(
  tris: Triangle[],
  points: Array<{ pos: Vec3; rx: number; rz: number }>,
  color: string,
  slot: Triangle['slot'],
  shininess: number,
  segments = 14,
  capEnds = true,
) {
  const rings: Vec3[][] = [];
  for (let p = 0; p < points.length; p++) {
    const cur = points[p]!;
    const prev = points[Math.max(0, p - 1)]!.pos;
    const next = points[Math.min(points.length - 1, p + 1)]!.pos;
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    let tz = next.z - prev.z;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // Build stable orthonormal basis (N, B) perpendicular to tangent T
    const upX = Math.abs(ty) < 0.9 ? 0 : 0;
    const upY = Math.abs(ty) < 0.9 ? 1 : 0;
    const upZ = Math.abs(ty) < 0.9 ? 0 : 1;
    // B = normalize(T x Up)
    let bx = ty * upZ - tz * upY;
    let by = tz * upX - tx * upZ;
    let bz = tx * upY - ty * upX;
    const bLen = Math.hypot(bx, by, bz) || 1;
    bx /= bLen;
    by /= bLen;
    bz /= bLen;
    // N = B x T
    const nx = by * tz - bz * ty;
    const ny = bz * tx - bx * tz;
    const nz = bx * ty - by * tx;

    const ring: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const ca = Math.cos(ang) * cur.rx;
      const sa = Math.sin(ang) * cur.rz;
      ring.push({
        x: cur.pos.x + bx * ca + nx * sa,
        y: cur.pos.y + by * ca + ny * sa,
        z: cur.pos.z + bz * ca + nz * sa,
      });
    }
    rings.push(ring);
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const r0 = rings[r]!;
    const r1 = rings[r + 1]!;
    for (let i = 0; i < segments; i++) {
      pushQuad(tris, r0[i]!, r0[i + 1]!, r1[i + 1]!, r1[i]!, color, slot, shininess);
    }
  }

  if (capEnds && rings.length > 0) {
    const sRing = rings[0]!;
    const sPos = points[0]!.pos;
    const eRing = rings[rings.length - 1]!;
    const ePos = points[points.length - 1]!.pos;
    for (let i = 0; i < segments; i++) {
      tris.push({ a: sPos, b: sRing[i + 1]!, c: sRing[i]!, color, slot, shininess: shininess * 0.4 });
      tris.push({ a: ePos, b: eRing[i]!, c: eRing[i + 1]!, color, slot, shininess: shininess * 0.4 });
    }
  }
}

function addBox3D(
  tris: Triangle[],
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  color: string,
  slot: Triangle['slot'],
  shininess: number,
) {
  const p = (sx: number, sy: number, sz: number): Vec3 => ({
    x: cx + sx * hx,
    y: cy + sy * hy,
    z: cz + sz * hz,
  });
  const v000 = p(-1, -1, -1);
  const v100 = p(1, -1, -1);
  const v110 = p(1, 1, -1);
  const v010 = p(-1, 1, -1);
  const v001 = p(-1, -1, 1);
  const v101 = p(1, -1, 1);
  const v111 = p(1, 1, 1);
  const v011 = p(-1, 1, 1);

  pushQuad(tris, v001, v101, v111, v011, color, slot, shininess); // +Z front
  pushQuad(tris, v100, v000, v010, v110, color, slot, shininess); // -Z back
  pushQuad(tris, v101, v100, v110, v111, color, slot, shininess); // +X right
  pushQuad(tris, v000, v001, v011, v010, color, slot, shininess); // -X left
  pushQuad(tris, v011, v111, v110, v010, color, slot, shininess); // +Y top
  pushQuad(tris, v000, v100, v101, v001, color, slot, shininess * 0.6); // -Y bottom
}

function addGarmentTopOrCoat(
  tris: Triangle[],
  garment: Garment,
  slot: 'top' | 'outerwear',
  subtype: GarmentSubtype,
  spreadX: number,
  spreadZ: number,
) {
  const isOuter = slot === 'outerwear';
  const color = garment.color;
  const accent = garment.color2 ?? '#DDD4C3';
  const shininess =
    subtype === 'leather_jacket' || subtype === 'fur_coat'
      ? 0.48
      : subtype === 'silk_blouse' || subtype === 'puffer' || subtype === 'cropped_puffer' || subtype === 'anorak'
        ? 0.34
        : 0.14;

  const puff =
    subtype === 'puffer' || subtype === 'cropped_puffer' || subtype === 'fur_coat' || subtype === 'shearling'
      ? 1.18
      : isOuter
        ? 1.09
        : 1.0;

  const isLongCoat =
    subtype === 'palto' || subtype === 'trench' || subtype === 'mac_coat' || subtype === 'fur_coat' || subtype === 'cape';
  const isMidCoat = subtype === 'parka' || subtype === 'peacoat' || subtype === 'shearling' || subtype === 'kimono' || subtype === 'cardigan' || subtype === 'tunic';
  const isCropped = subtype === 'crop_top' || subtype === 'cropped_puffer';
  const hemY = isLongCoat ? -0.44 : isMidCoat ? -0.06 : isCropped ? 0.24 : 0.04;
  const shoulderY = 0.72;
  const xShift = spreadX;
  const zShift = spreadZ;

  // Ribbed rings for puffer jackets vs smooth lofted torso for coats/knit/tees
  const rings: RingDef[] = [];
  if (subtype === 'puffer' || subtype === 'cropped_puffer') {
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = hemY + t * (shoulderY - hemY);
      const wave = i > 0 && i < steps ? (i % 2 === 1 ? 0.032 : -0.01) : 0;
      const baseRx = t > 0.75 ? 0.34 - (t - 0.75) * 0.45 : 0.29 + Math.sin(t * Math.PI) * 0.06;
      const baseRz = t > 0.75 ? 0.21 - (t - 0.75) * 0.28 : 0.19 + Math.sin(t * Math.PI) * 0.04;
      rings.push({
        y,
        rx: (baseRx + wave) * puff,
        rz: (baseRz + wave) * puff,
        x: xShift,
        z: zShift,
        chestBulge: 0.14,
      });
    }
  } else {
    const hemFlare = isLongCoat ? (subtype === 'cape' ? 1.48 : 1.24) : 1.0;
    rings.push(
      { y: hemY, rx: 0.28 * puff * hemFlare, rz: 0.17 * puff * hemFlare, x: xShift, z: zShift },
      { y: (hemY + 0.36) * 0.5, rx: 0.255 * puff * (isLongCoat ? 1.06 : 1), rz: 0.16 * puff, x: xShift, z: zShift },
      { y: 0.36, rx: 0.27 * puff, rz: 0.175 * puff, x: xShift, z: zShift, chestBulge: 0.12 },
      { y: 0.56, rx: 0.315 * puff, rz: 0.185 * puff, x: xShift, z: zShift, chestBulge: 0.22, backPinch: 0.08 },
      { y: shoulderY, rx: 0.29 * puff, rz: 0.145 * puff, x: xShift, z: zShift },
      { y: 0.77, rx: 0.12 * puff, rz: 0.11 * puff, x: xShift, z: zShift },
    );
  }

  const openFrontGap =
    isOuter && subtype !== 'anorak' && subtype !== 'puffer' && subtype !== 'cropped_puffer'
      ? subtype === 'vest'
        ? 0.22
        : 0.26
      : 0;

  addLoftedBody(tris, rings, color, slot, shininess, 18, true, true, openFrontGap, accent);

  // Coat lapels or turtleneck/hood details
  if (subtype === 'hoodie' || subtype === 'ziphoodie' || subtype === 'parka' || subtype === 'anorak') {
    // 3D draped hood sitting behind neck at -Z
    addLoftedBody(
      tris,
      [
        { y: 0.72, rx: 0.17 * puff, rz: 0.14 * puff, x: xShift, z: zShift - 0.07 },
        { y: 0.84, rx: 0.16 * puff, rz: 0.16 * puff, x: xShift, z: zShift - 0.10 },
        { y: 0.92, rx: 0.09 * puff, rz: 0.10 * puff, x: xShift, z: zShift - 0.08 },
      ],
      color,
      slot,
      shininess,
      14,
      true,
      true,
    );
  } else if (subtype === 'turtleneck' || subtype === 'halfzip_knit') {
    addLoftedBody(
      tris,
      [
        { y: 0.75, rx: 0.115, rz: 0.105, x: xShift, z: zShift },
        { y: 0.86, rx: 0.105, rz: 0.098, x: xShift, z: zShift },
      ],
      color,
      slot,
      shininess,
      14,
    );
  } else if (subtype === 'palto' || subtype === 'trench' || subtype === 'blazer' || subtype === 'tuxedo_blazer' || subtype === 'peacoat') {
    // 3D sculpted collar lapels on +Z front chest
    const lapelCol = subtype === 'tuxedo_blazer' ? '#16161A' : accent;
    addBox3D(tris, xShift - 0.095, 0.62, zShift + 0.145, 0.042, 0.13, 0.025, lapelCol, slot, shininess * 1.3);
    addBox3D(tris, xShift + 0.095, 0.62, zShift + 0.145, 0.042, 0.13, 0.025, lapelCol, slot, shininess * 1.3);
  }

  // Sculpted 3D cylindrical sleeves (skipped for vest / tank_top / cape)
  const sleeveless = subtype === 'vest' || subtype === 'tank_top' || subtype === 'cape';
  if (!sleeveless) {
    const shortSleeve = subtype === 'tee' || subtype === 'polo' || subtype === 'knit_polo' || subtype === 'crop_top';
    const rArm = 0.078 * (puff > 1 ? 1.16 : 1);
    const rElbow = 0.068 * (puff > 1 ? 1.12 : 1);
    const rCuff = 0.056 * (puff > 1 ? 1.06 : 1);
    const shoulderX = 0.285 * puff;

    for (const side of [-1, 1] as const) {
      const pts = shortSleeve
        ? [
            { pos: { x: xShift + side * (shoulderX - 0.02), y: 0.68, z: zShift }, rx: rArm, rz: rArm },
            { pos: { x: xShift + side * (shoulderX + 0.10), y: 0.50, z: zShift + 0.01 }, rx: rElbow, rz: rElbow },
          ]
        : [
            { pos: { x: xShift + side * (shoulderX - 0.02), y: 0.68, z: zShift }, rx: rArm, rz: rArm },
            { pos: { x: xShift + side * (shoulderX + 0.11), y: 0.42, z: zShift + 0.015 }, rx: rElbow, rz: rElbow },
            { pos: { x: xShift + side * (shoulderX + 0.14), y: 0.13, z: zShift + 0.04 }, rx: rCuff, rz: rCuff },
          ];
      addTube(tris, pts, subtype === 'varsity' ? accent : color, slot, shininess, 12);
    }
  }
}

function addDress3D(
  tris: Triangle[],
  garment: Garment,
  subtype: GarmentSubtype,
  spreadZ: number,
) {
  const color = garment.color;
  const accent = garment.color2 ?? '#DDD4C3';
  const isSilk = subtype === 'midi_silk' || subtype === 'cocktail_dress' || subtype === 'atlas_dress';
  const shininess = isSilk ? 0.42 : 0.15;
  const flare =
    subtype === 'maxi_sundress' || subtype === 'aline_dress' || subtype === 'atlas_dress'
      ? 0.46
      : subtype === 'blazer_dress' || subtype === 'knit_dress'
        ? 0.29
        : 0.36;
  const hemY = subtype === 'maxi_sundress' ? -0.78 : subtype === 'cocktail_dress' || subtype === 'blazer_dress' ? -0.32 : -0.58;

  addLoftedBody(
    tris,
    [
      { y: hemY, rx: flare, rz: flare * 0.72, z: spreadZ, squareness: subtype === 'atlas_dress' ? 0.15 : 0 },
      { y: (hemY + 0.12) * 0.5, rx: flare * 0.78, rz: flare * 0.56, z: spreadZ },
      { y: 0.14, rx: 0.22, rz: 0.155, z: spreadZ },
      { y: 0.42, rx: 0.255, rz: 0.165, z: spreadZ, chestBulge: 0.2 },
      { y: 0.69, rx: 0.27, rz: 0.135, z: spreadZ },
      { y: 0.75, rx: 0.11, rz: 0.10, z: spreadZ },
    ],
    color,
    'dress',
    shininess,
    20,
    true,
    true,
    0,
    accent,
  );

  // Atlas geometric waist sash / motif belt
  if (subtype === 'atlas_dress' || subtype === 'shirt_dress' || subtype === 'blazer_dress') {
    addLoftedBody(
      tris,
      [
        { y: 0.11, rx: 0.232, rz: 0.165, z: spreadZ },
        { y: 0.18, rx: 0.228, rz: 0.162, z: spreadZ },
      ],
      accent,
      'dress',
      0.35,
      18,
    );
  }

  // Sleeves unless sundress/cocktail sleeveless
  if (subtype !== 'maxi_sundress' && subtype !== 'cocktail_dress') {
    for (const side of [-1, 1] as const) {
      addTube(
        tris,
        [
          { pos: { x: side * 0.25, y: 0.66, z: spreadZ }, rx: 0.068, rz: 0.068 },
          { pos: { x: side * 0.35, y: 0.42, z: spreadZ + 0.02 }, rx: 0.058, rz: 0.058 },
          { pos: { x: side * 0.38, y: 0.16, z: spreadZ + 0.04 }, rx: 0.048, rz: 0.048 },
        ],
        color,
        'dress',
        shininess,
        12,
      );
    }
  }
}

function addBottom3D(
  tris: Triangle[],
  garment: Garment,
  subtype: GarmentSubtype,
  spreadZ: number,
) {
  const color = garment.color;
  const accent = garment.color2 ?? '#383430';
  const shininess = subtype === 'leggings' ? 0.26 : 0.12;

  if (subtype === 'skirt' || subtype === 'a_line_skirt') {
    const flare = subtype === 'a_line_skirt' ? 0.42 : 0.31;
    const hemY = subtype === 'a_line_skirt' ? -0.52 : -0.34;
    addLoftedBody(
      tris,
      [
        { y: hemY, rx: flare, rz: flare * 0.72, z: spreadZ },
        { y: (hemY + 0.08) * 0.5, rx: flare * 0.82, rz: flare * 0.58, z: spreadZ },
        { y: 0.08, rx: 0.245, rz: 0.162, z: spreadZ },
      ],
      color,
      'bottom',
      shininess,
      20,
    );
    return;
  }

  // Waist & pelvis block
  addLoftedBody(
    tris,
    [
      { y: -0.14, rx: 0.255, rz: 0.16, z: spreadZ },
      { y: 0.08, rx: 0.245, rz: 0.155, z: spreadZ },
    ],
    color,
    'bottom',
    shininess,
    18,
  );

  const isWide = subtype === 'wide_trousers' || subtype === 'culottes' || subtype === 'pleated_trousers';
  const isShorts = subtype === 'shorts';
  const isSlim = subtype === 'slim_trousers' || subtype === 'leggings' || subtype === 'joggers';
  const hemY = isShorts ? -0.36 : subtype === 'culottes' ? -0.56 : -0.82;
  const thighR = isWide ? 0.145 : isSlim ? 0.112 : 0.128;
  const ankleR = isWide ? 0.138 : isSlim ? 0.072 : 0.095;

  for (const side of [-1, 1] as const) {
    addTube(
      tris,
      [
        { pos: { x: side * 0.125, y: -0.08, z: spreadZ }, rx: thighR, rz: thighR * 0.92 },
        { pos: { x: side * 0.135, y: (hemY - 0.08) * 0.5, z: spreadZ + 0.01 }, rx: (thighR + ankleR) * 0.5, rz: (thighR + ankleR) * 0.46 },
        { pos: { x: side * 0.142, y: hemY, z: spreadZ }, rx: ankleR, rz: ankleR * 0.9 },
      ],
      color,
      'bottom',
      shininess,
      14,
    );

    if (subtype === 'cargo' && !isShorts) {
      addBox3D(tris, side * 0.23, -0.38, spreadZ + 0.01, 0.032, 0.085, 0.07, accent, 'bottom', 0.1);
    }
  }
}

function addShoes3D(
  tris: Triangle[],
  garment: Garment,
  subtype: GarmentSubtype,
  spreadY: number,
  spreadZ: number,
) {
  const upper = garment.color;
  const sole = garment.color2 ?? (subtype === 'sneakers' || subtype === 'canvas_sneakers' || subtype === 'running_shoes' ? '#EDE8DE' : '#181614');
  const isBoot = subtype === 'chelsea_boots' || subtype === 'lug_boots';
  const isHeel = subtype === 'heels';
  const isFlat = subtype === 'loafers' || subtype === 'moccasins' || subtype === 'derbies' || subtype === 'ballet_flats';
  const yBase = -0.96 + spreadY;

  for (const side of [-1, 1] as const) {
    const x = side * 0.145;
    const z = spreadZ + 0.035;

    // 3D sculpted outsole
    addBox3D(
      tris,
      x,
      yBase + (isHeel ? 0.012 : 0.022),
      z,
      0.068,
      isHeel ? 0.012 : subtype === 'lug_boots' || subtype === 'running_shoes' ? 0.026 : 0.018,
      0.145,
      sole,
      'shoes',
      0.24,
    );

    if (isHeel) {
      // Stiletto heel pillar + elevated sloped vamp
      addBox3D(tris, x, yBase + 0.065, z - 0.11, 0.018, 0.055, 0.022, upper, 'shoes', 0.55);
      addBox3D(tris, x, yBase + 0.05, z + 0.02, 0.062, 0.03, 0.115, upper, 'shoes', 0.52);
    } else if (isBoot) {
      // Boot vamp + tall ankle shaft
      addBox3D(tris, x, yBase + 0.07, z + 0.02, 0.064, 0.038, 0.135, upper, 'shoes', 0.38);
      addLoftedBody(
        tris,
        [
          { y: yBase + 0.08, rx: 0.068, rz: 0.075, x, z: z - 0.04 },
          { y: yBase + 0.24, rx: 0.064, rz: 0.068, x, z: z - 0.04 },
        ],
        upper,
        'shoes',
        0.35,
        14,
      );
    } else if (subtype === 'sandals' || subtype === 'mules') {
      addBox3D(tris, x, yBase + 0.048, z + 0.055, 0.062, 0.016, 0.055, upper, 'shoes', 0.34);
    } else {
      // Sneaker / Loafer sculpted upper + heel collar
      addBox3D(tris, x, yBase + 0.065, z + 0.01, 0.063, 0.034, 0.132, upper, 'shoes', isFlat ? 0.42 : 0.22);
      addBox3D(tris, x, yBase + 0.105, z - 0.065, 0.061, 0.025, 0.055, isFlat ? upper : sole, 'shoes', 0.25);
    }
  }
}

function addBag3D(
  tris: Triangle[],
  garment: Garment,
  subtype: GarmentSubtype,
  spreadX: number,
  spreadZ: number,
) {
  const body = garment.color;
  const strap = garment.color2 ?? '#A68868';
  const shininess = 0.42;

  if (subtype === 'backpack') {
    // Mounted realistically on the back (-Z)
    addBox3D(tris, 0, 0.42, -0.27 - spreadZ * 0.5, 0.18, 0.22, 0.095, body, 'bag', 0.28);
    addBox3D(tris, 0, 0.35, -0.37 - spreadZ * 0.5, 0.13, 0.09, 0.025, strap, 'bag', 0.35);
    return;
  }

  const x = 0.62 + spreadX;
  const y = subtype === 'belt_bag' ? 0.05 : subtype === 'baguette' || subtype === 'clutch' ? -0.14 : -0.18;
  const z = 0.1 + spreadZ;

  const hx = subtype === 'duffle' ? 0.18 : subtype === 'clutch' || subtype === 'baguette' ? 0.13 : 0.14;
  const hy = subtype === 'tote' || subtype === 'woven_tote' ? 0.17 : subtype === 'clutch' || subtype === 'baguette' ? 0.08 : 0.13;
  const hz = subtype === 'clutch' ? 0.038 : 0.072;

  addBox3D(tris, x, y, z, hx, hy, hz, body, 'bag', shininess);
  // Flap / gold clasp detail
  addBox3D(tris, x, y + hy * 0.45, z + hz + 0.008, hx * 0.88, hy * 0.32, 0.01, body, 'bag', shininess);
  addBox3D(tris, x, y + hy * 0.15, z + hz + 0.018, 0.022, 0.018, 0.01, '#D8B36C', 'bag', 0.7);

  if (subtype !== 'clutch') {
    // Sculpted arched 3D carry handle / shoulder strap
    addTube(
      tris,
      [
        { pos: { x: x - hx * 0.48, y: y + hy, z }, rx: 0.014, rz: 0.014 },
        { pos: { x, y: y + hy + 0.14, z }, rx: 0.015, rz: 0.015 },
        { pos: { x: x + hx * 0.48, y: y + hy, z }, rx: 0.014, rz: 0.014 },
      ],
      strap,
      'bag',
      0.35,
      8,
    );
  }
}

function addAccessory3D(
  tris: Triangle[],
  garment: Garment,
  slot: 'accessory1' | 'accessory2',
  subtype: GarmentSubtype,
  spreadX: number,
  spreadZ: number,
) {
  const col = garment.color;
  const accent = garment.color2 ?? '#F2EFE8';
  const shininess =
    subtype === 'watch' || subtype === 'bracelet' || subtype === 'earrings' || subtype === 'necklace' || subtype === 'sunglasses'
      ? 0.65
      : 0.2;

  if (subtype === 'doppi') {
    // Iconic square-lobed Uzbek doppi crown
    addLoftedBody(
      tris,
      [
        { y: 0.99, rx: 0.145, rz: 0.145, squareness: 0.82, z: spreadZ * 0.3 },
        { y: 1.07, rx: 0.135, rz: 0.135, squareness: 0.88, z: spreadZ * 0.3 },
        { y: 1.13, rx: 0.04, rz: 0.04, squareness: 0.5, z: spreadZ * 0.3 },
      ],
      col,
      slot,
      0.24,
      16,
    );
    // Corner embroidered white qalampir motif studs
    for (const sx of [-0.075, 0.075]) {
      for (const sz of [-0.075, 0.075]) {
        addBox3D(tris, sx, 1.06, sz + spreadZ * 0.3, 0.022, 0.014, 0.022, accent, slot, 0.3);
      }
    }
    return;
  }

  if (subtype === 'fedora' || subtype === 'bucket_hat' || subtype === 'cap' || subtype === 'beanie') {
    const brimRx = subtype === 'fedora' ? 0.25 : subtype === 'bucket_hat' ? 0.21 : 0.14;
    if (subtype !== 'beanie') {
      addLoftedBody(
        tris,
        [
          { y: 1.0, rx: brimRx, rz: brimRx, z: spreadZ * 0.3 },
          { y: 1.02, rx: 0.135, rz: 0.145, z: spreadZ * 0.3 },
        ],
        col,
        slot,
        0.18,
        18,
      );
    }
    addLoftedBody(
      tris,
      [
        { y: 1.01, rx: 0.132, rz: 0.142, z: spreadZ * 0.3 },
        { y: 1.11, rx: 0.115, rz: 0.12, z: spreadZ * 0.3 },
        { y: 1.15, rx: 0.05, rz: 0.05, z: spreadZ * 0.3 },
      ],
      col,
      slot,
      0.18,
      16,
    );
    if (subtype === 'cap') {
      addBox3D(tris, 0, 1.01, 0.19 + spreadZ * 0.3, 0.105, 0.012, 0.08, col, slot, 0.22);
    }
    return;
  }

  if (subtype === 'sunglasses') {
    addBox3D(tris, -0.062, 0.94, 0.15 + spreadZ * 0.4, 0.048, 0.028, 0.014, col, slot, 0.8);
    addBox3D(tris, 0.062, 0.94, 0.15 + spreadZ * 0.4, 0.048, 0.028, 0.014, col, slot, 0.8);
    addBox3D(tris, 0, 0.945, 0.15 + spreadZ * 0.4, 0.025, 0.008, 0.01, accent, slot, 0.7);
    return;
  }

  if (subtype === 'scarf' || subtype === 'silk_scarf') {
    addLoftedBody(
      tris,
      [
        { y: 0.72, rx: 0.155, rz: 0.14, z: spreadZ * 0.5 },
        { y: 0.81, rx: 0.145, rz: 0.135, z: spreadZ * 0.5 },
      ],
      col,
      slot,
      subtype === 'silk_scarf' ? 0.45 : 0.12,
      18,
    );
    // Front hanging drape
    addBox3D(tris, 0.055, 0.52, 0.175 + spreadZ * 0.5, 0.048, 0.22, 0.02, col, slot, shininess);
    return;
  }

  if (subtype === 'belt') {
    addLoftedBody(
      tris,
      [
        { y: 0.03, rx: 0.258, rz: 0.168, z: spreadZ * 0.4 },
        { y: 0.085, rx: 0.258, rz: 0.168, z: spreadZ * 0.4 },
      ],
      col,
      slot,
      0.45,
      18,
    );
    addBox3D(tris, 0, 0.058, 0.175 + spreadZ * 0.4, 0.035, 0.03, 0.016, '#D8B36C', slot, 0.8);
    return;
  }

  // Side floating/worn jewelry, tie, gloves, watch, umbrella
  const sideX = slot === 'accessory1' ? -0.58 - spreadX : 0.58 + spreadX;
  const baseY = subtype === 'tie' || subtype === 'bowtie' || subtype === 'necklace' ? 0.66 : 0.26;
  const cx = subtype === 'tie' || subtype === 'bowtie' || subtype === 'necklace' ? 0 : sideX;
  const cz = subtype === 'tie' || subtype === 'bowtie' || subtype === 'necklace' ? 0.18 + spreadZ * 0.5 : 0.12 + spreadZ * 0.5;
  addBox3D(
    tris,
    cx,
    baseY,
    cz,
    subtype === 'tie' ? 0.026 : 0.065,
    subtype === 'tie' || subtype === 'umbrella' ? 0.19 : 0.065,
    0.045,
    col,
    slot,
    shininess,
  );
}

export function buildOutfitMeshGeometry(
  slots: BoardSlots,
  byId: Map<string, Garment>,
  exploded = false,
): { tris: Triangle[]; slotGarmentMap: Map<SlotKey, Garment> } {
  const tris: Triangle[] = [];
  const zSpread = exploded ? 0.18 : 0;
  const xSpread = exploded ? 0.16 : 0;

  // 1. Sculpted 3D Display Podium + Minimal Neck Form
  addLoftedBody(
    tris,
    [
      { y: -1.10, rx: 0.46, rz: 0.46 },
      { y: -1.03, rx: 0.44, rz: 0.44 },
    ],
    '#2C2925',
    'podium',
    0.35,
    24,
    true,
    true,
    0,
    '#3B3630',
  );
  // Subtle mannequin neck stand when upper garments exist
  if (slots.top || slots.outerwear || slots.dress) {
    addLoftedBody(
      tris,
      [
        { y: 0.72, rx: 0.088, rz: 0.082 },
        { y: 0.90, rx: 0.072, rz: 0.072 },
        { y: 0.96, rx: 0.095, rz: 0.105 },
      ],
      '#C8BCAE',
      'mannequin',
      0.16,
      14,
    );
  }

  const slotGarmentMap = new Map<SlotKey, Garment>();

  // 2. Dress OR Top + Bottom
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  if (dress) {
    slotGarmentMap.set('dress', dress);
    addDress3D(tris, dress, detectGarmentSubtype('dress', dress.id, dress.name_uz), 0);
  } else {
    if (bottom) {
      slotGarmentMap.set('bottom', bottom);
      addBottom3D(tris, bottom, detectGarmentSubtype('bottom', bottom.id, bottom.name_uz), 0);
    }
    if (top) {
      slotGarmentMap.set('top', top);
      addGarmentTopOrCoat(tris, top, 'top', detectGarmentSubtype('top', top.id, top.name_uz), 0, 0);
    }
  }

  if (outer) {
    slotGarmentMap.set('outerwear', outer);
    addGarmentTopOrCoat(
      tris,
      outer,
      'outerwear',
      detectGarmentSubtype('outerwear', outer.id, outer.name_uz),
      exploded ? -xSpread * 1.4 : 0,
      exploded ? zSpread * 1.2 : 0.012,
    );
  }

  if (shoes) {
    slotGarmentMap.set('shoes', shoes);
    addShoes3D(tris, shoes, detectGarmentSubtype('shoes', shoes.id, shoes.name_uz), 0, zSpread * 0.4);
  }

  if (bag) {
    slotGarmentMap.set('bag', bag);
    addBag3D(tris, bag, detectGarmentSubtype('bag', bag.id, bag.name_uz), xSpread * 0.8, zSpread * 0.6);
  }

  if (acc1) {
    slotGarmentMap.set('accessory1', acc1);
    addAccessory3D(tris, acc1, 'accessory1', detectGarmentSubtype('accessory', acc1.id, acc1.name_uz), xSpread, zSpread);
  }
  if (acc2) {
    slotGarmentMap.set('accessory2', acc2);
    addAccessory3D(tris, acc2, 'accessory2', detectGarmentSubtype('accessory', acc2.id, acc2.name_uz), xSpread, zSpread);
  }

  return { tris, slotGarmentMap };
}

/**
 * Renders the complete active outfit onto a 2D canvas using true 3D triangle geometry,
 * directional key + rim lighting, Z-buffering painter's sort, and 360-degree camera rotation.
 */
export function render3DOutfitToCanvas(
  canvas: HTMLCanvasElement,
  options: Render3DSceneOptions,
): RenderedHitBox[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(240, Math.round((rect.width || canvas.clientWidth || 320) * dpr));
  const h = Math.max(260, Math.round((rect.height || canvas.clientHeight || 360) * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.clearRect(0, 0, w, h);

  const { slots, byId, exploded } = options;
  const { tris, slotGarmentMap } = buildOutfitMeshGeometry(slots, byId, exploded);

  // 3. Transform, Perspective Project, Back-face Cull & Painter Z-Sort
  const yaw = (options.rotYDeg * Math.PI) / 180;
  const pitch = (options.rotXDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);

  const rotatePt = (v: Vec3): Vec3 => {
    // Rotate around Y first (turntable), then tilt X
    const x1 = v.x * cy + v.z * sy;
    const z1 = -v.x * sy + v.z * cy;
    const y2 = v.y * cx - z1 * sx;
    const z2 = v.y * sx + z1 * cx;
    return { x: x1, y: y2, z: z2 };
  };

  const camDist = 3.85;
  const fovScale = Math.min(w, h) * 0.56 * options.zoom;
  const halfW = w * 0.5;
  const halfH = h * 0.51;

  interface DrawTri {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    depth: number;
    fill: string;
    slot: Triangle['slot'];
  }

  const drawList: DrawTri[] = [];
  const rgbCache = new Map<string, [number, number, number]>();

  for (const tri of tris) {
    const a = rotatePt(tri.a);
    const b = rotatePt(tri.b);
    const c = rotatePt(tri.c);

    // Face normal in camera space
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abz = b.z - a.z;
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const acz = c.z - a.z;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 1e-6) continue;
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;

    // Perspective projection
    const za = camDist - a.z;
    const zb = camDist - b.z;
    const zc = camDist - c.z;
    if (za <= 0.3 || zb <= 0.3 || zc <= 0.3) continue;

    const sx0 = halfW + (a.x / za) * fovScale;
    const sy0 = halfH - (a.y / za) * fovScale;
    const sx1 = halfW + (b.x / zb) * fovScale;
    const sy1 = halfH - (b.y / zb) * fovScale;
    const sx2 = halfW + (c.x / zc) * fovScale;
    const sy2 = halfH - (c.y / zc) * fovScale;

    // Screen-space winding check (+Z faces camera -> CCW on screen where +Y is down has negative area)
    const cross2d = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
    if (!tri.doubleSided && cross2d >= 0.05) continue;
    if (tri.doubleSided && cross2d > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    let rgb = rgbCache.get(tri.color);
    if (!rgb) {
      rgb = parseHexRgb(tri.color);
      rgbCache.set(tri.color, rgb);
    }

    const fill = shadeRgb(rgb, nx, ny, nz, tri.shininess, tri.slot === options.hoveredSlot);
    drawList.push({
      x0: sx0,
      y0: sy0,
      x1: sx1,
      y1: sy1,
      x2: sx2,
      y2: sy2,
      depth: (a.z + b.z + c.z) / 3,
      fill,
      slot: tri.slot,
    });
  }

  // Far-to-near Painter sort
  drawList.sort((p, q) => p.depth - q.depth);

  // Soft radial studio shadow underneath podium
  const podScreenY = halfH + (1.12 / camDist) * fovScale;
  const shadowGrad = ctx.createRadialGradient(halfW, podScreenY, 8, halfW, podScreenY, fovScale * 0.25);
  shadowGrad.addColorStop(0, 'rgba(18, 16, 14, 0.36)');
  shadowGrad.addColorStop(1, 'rgba(18, 16, 14, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(halfW, podScreenY, fovScale * 0.24, fovScale * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  const boundsBySlot = new Map<SlotKey, { minX: number; minY: number; maxX: number; maxY: number }>();

  for (const d of drawList) {
    ctx.beginPath();
    ctx.moveTo(d.x0, d.y0);
    ctx.lineTo(d.x1, d.y1);
    ctx.lineTo(d.x2, d.y2);
    ctx.closePath();
    ctx.fillStyle = d.fill;
    ctx.fill();
    // 0.6px matching stroke eliminates hairline seams between adjacent triangles
    ctx.strokeStyle = d.fill;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    if (d.slot !== 'podium' && d.slot !== 'mannequin') {
      const prev = boundsBySlot.get(d.slot);
      const minX = Math.min(d.x0, d.x1, d.x2);
      const maxX = Math.max(d.x0, d.x1, d.x2);
      const minY = Math.min(d.y0, d.y1, d.y2);
      const maxY = Math.max(d.y0, d.y1, d.y2);
      if (prev) {
        prev.minX = Math.min(prev.minX, minX);
        prev.maxX = Math.max(prev.maxX, maxX);
        prev.minY = Math.min(prev.minY, minY);
        prev.maxY = Math.max(prev.maxY, maxY);
      } else {
        boundsBySlot.set(d.slot, { minX, minY, maxX, maxY });
      }
    }
  }

  const hits: RenderedHitBox[] = [];
  for (const [slot, box] of boundsBySlot.entries()) {
    const garment = slotGarmentMap.get(slot);
    if (!garment) continue;
    hits.push({
      slot,
      garment,
      minX: box.minX / dpr,
      minY: box.minY / dpr,
      maxX: box.maxX / dpr,
      maxY: box.maxY / dpr,
    });
  }
  return hits;
}
