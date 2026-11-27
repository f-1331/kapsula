import * as THREE from 'three';
import type { Garment, UserGenderFilter } from '../data/schema';
import type { BoardSlots, SlotKey } from './stylist';
import { detectGarmentSubtype, type GarmentSubtype } from '../components/GarmentSilhouette';

export const FLOOR_Y = -0.046;
export const PLINTH_TOP_Y = 0.0225;

/**
 * Shared anatomical rig & proportion constants (in metres, +Y up).
 * All clothing shells, sleeves, shoes, and accessories reference these exact coordinates
 * so limbs stay continuous, clothing layers never intersect, and objects obey gravity.
 */
const RIG = {
  footX: 0.115,
  footZ: 0.032,
  ankleY: 0.095,
  calfY: 0.30,
  kneeY: 0.50,
  thighY: 0.72,
  hipY: 0.88,
  waistY: 1.00,
  chestY: 1.26,
  shoulderY: 1.43,
  neckBaseY: 1.49,
  neckTopY: 1.60,
  headCenterY: 1.665,
  headCenterZ: 0.012,
  headRx: 0.088,
  headRy: 0.112,
  headRz: 0.098,
  shoulderJoint: [0.206, 1.402, 0.0] as const,
  elbowJoint: [0.284, 1.150, -0.012] as const,
  wristJoint: [0.308, 0.895, 0.036] as const,
  handTip: [0.312, 0.798, 0.048] as const,
  armRadiusTop: 0.043,
  armRadiusElbow: 0.035,
  armRadiusWrist: 0.027,
  riserX: 0.39,
  riserZ: 0.06,
  riserTopY: 0.22,
} as const;

export interface OutfitSlotGroups {
  root: THREE.Group;
  pedestal: THREE.Group;
  slotGroups: Partial<Record<SlotKey, THREE.Group>>;
  basePositions: Partial<Record<SlotKey, THREE.Vector3>>;
  explodedOffsets: Partial<Record<SlotKey, THREE.Vector3>>;
  garmentsBySlot: Partial<Record<SlotKey, Garment>>;
  interactiveMeshes: THREE.Object3D[];
}

interface LoftRing {
  y: number;
  rx: number;
  rz: number;
  x?: number;
  z?: number;
  chest?: number;
  pleats?: number;
}

/**
 * Translates a 3D group vertically so its actual geometry lowest vertex rests
 * flush on `targetY` (zero levitation and zero sinking into surfaces).
 */
export function groundGroupToY(group: THREE.Object3D, targetY: number): void {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (!box.isEmpty() && Number.isFinite(box.min.y)) {
    group.position.y += targetY - box.min.y;
    group.updateMatrixWorld(true);
  }
}

function makeFabricMaterial(
  hex: string,
  opts: {
    roughness?: number;
    metalness?: number;
    sheen?: number;
    clearcoat?: number;
    doubleSided?: boolean;
    transparent?: boolean;
    opacity?: number;
  } = {},
): THREE.MeshPhysicalMaterial {
  const color = new THREE.Color(hex || '#8C8276');
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.04,
    sheen: opts.sheen ?? 0.55,
    sheenRoughness: 0.65,
    sheenColor: color.clone().lerp(new THREE.Color('#ffffff'), 0.45),
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: 0.35,
    side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

function makeMetalMaterial(hex = '#D4AF6A'): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    metalness: 0.88,
    roughness: 0.24,
  });
}

/**
 * Generates a contoured lofted garment shell with natural fabric waves, chest curvature,
 * optional front lapel opening, and sealed inner thickness wall.
 */
function buildLoftedShellGeometry(
  rings: LoftRing[],
  radialSegs = 40,
  openFrontRad = 0,
  thickness = 0.012,
): THREE.BufferGeometry {
  const isOpen = openFrontRad > 0.01;
  const startAng = isOpen ? Math.PI * 0.5 + openFrontRad : 0;
  const endAng = isOpen ? Math.PI * 2.5 - openFrontRad : Math.PI * 2;
  const positions: number[] = [];
  const indices: number[] = [];

  const ringCount = rings.length;
  const cols = radialSegs + 1;

  const pushShell = (scale: number): number => {
    const offset = positions.length / 3;
    for (let r = 0; r < ringCount; r++) {
      const ring = rings[r]!;
      const cx = ring.x ?? 0;
      const cz = ring.z ?? 0;
      const pleats = ring.pleats ?? 0;
      for (let c = 0; c <= radialSegs; c++) {
        const u = c / radialSegs;
        const a = startAng + u * (endAng - startAng);
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        const pleatDelta = pleats > 0 ? 1 + Math.sin(a * pleats) * 0.042 : 1;
        const chestMul = sinA > 0 && ring.chest ? 1 + ring.chest * sinA : 1;
        const rx = ring.rx * scale * pleatDelta;
        const rz = ring.rz * scale * chestMul * pleatDelta;
        positions.push(cx + cosA * rx, ring.y, cz + sinA * rz);
      }
    }
    return offset;
  };

  const outerOff = pushShell(1);
  for (let r = 0; r < ringCount - 1; r++) {
    for (let c = 0; c < radialSegs; c++) {
      const a = outerOff + r * cols + c;
      const b = a + 1;
      const d = outerOff + (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, b, e, a, e, d);
    }
  }

  if (isOpen && thickness > 0) {
    const innerOff = pushShell(0.94);
    for (let r = 0; r < ringCount - 1; r++) {
      for (let c = 0; c < radialSegs; c++) {
        const a = innerOff + r * cols + c;
        const b = a + 1;
        const d = innerOff + (r + 1) * cols + c;
        const e = d + 1;
        indices.push(a, e, b, a, d, e);
      }
      const oL0 = outerOff + r * cols;
      const oL1 = outerOff + (r + 1) * cols;
      const iL0 = innerOff + r * cols;
      const iL1 = innerOff + (r + 1) * cols;
      indices.push(oL0, oL1, iL1, oL0, iL1, iL0);

      const oR0 = outerOff + r * cols + radialSegs;
      const oR1 = outerOff + (r + 1) * cols + radialSegs;
      const iR0 = innerOff + r * cols + radialSegs;
      const iR1 = innerOff + (r + 1) * cols + radialSegs;
      indices.push(oR0, iR1, oR1, oR0, iR0, iR1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a tapered anatomical or garment limb/sleeve along a smooth 3-point curve,
 * oriented along gravity hang with zero gaps or flat box caps.
 */
function addTaperedLimb(
  group: THREE.Group,
  side: -1 | 1,
  pts: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]],
  radiusTop: number,
  radiusBot: number,
  mat: THREE.Material,
  cuffMat?: THREE.Material,
): void {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * pts[0][0], pts[0][1], pts[0][2]),
    new THREE.Vector3(side * pts[1][0], pts[1][1], pts[1][2]),
    new THREE.Vector3(side * pts[2][0], pts[2][1], pts[2][2]),
  ]);
  const radialSegs = 20;
  const tubularSegs = 18;
  const baseRadius = (radiusTop + radiusBot) * 0.5;
  const geo = new THREE.TubeGeometry(curve, tubularSegs, baseRadius, radialSegs, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const cPts = curve.getSpacedPoints(tubularSegs);
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.min(tubularSegs, Math.floor(i / (radialSegs + 1)));
    const u = ringIdx / tubularSegs;
    const center = cPts[ringIdx] ?? cPts[0]!;
    v.fromBufferAttribute(pos, i).sub(center);
    const ratio = (radiusTop * (1 - u) + radiusBot * u) / Math.max(0.001, baseRadius);
    v.multiplyScalar(ratio).add(center);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Spherical shoulder joint cap so limb connects smoothly without seam gaps
  const cap = new THREE.Mesh(new THREE.SphereGeometry(radiusTop * 0.96, 16, 12), mat);
  cap.position.set(side * pts[0][0], pts[0][1], pts[0][2]);
  cap.castShadow = true;
  group.add(cap);

  if (cuffMat) {
    const dir = new THREE.Vector3(
      side * (pts[2][0] - pts[1][0]),
      pts[2][1] - pts[1][1],
      pts[2][2] - pts[1][2],
    ).normalize();
    const cuffGeo = new THREE.TorusGeometry(radiusBot * 0.96, 0.013, 10, 24);
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.position.set(side * pts[2][0], pts[2][1], pts[2][2]);
    // Torus local axis is Z; align local Z with forearm tangent so cuff wraps perpendicular to arm
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    cuff.castShadow = true;
    group.add(cuff);
  }
}

/**
 * Computes surface Z coordinate on the torso shell for a given normalized front height.
 */
function torsoFrontZ(y: number): number {
  if (y >= 1.43) return 0.118;
  if (y >= 1.24) return 0.145;
  if (y >= 1.00) return 0.125;
  return 0.132;
}

function getFabricPropsForSubtype(subtype: GarmentSubtype): {
  roughness: number;
  sheen: number;
  clearcoat: number;
} {
  if (
    subtype === 'leather_jacket' ||
    subtype === 'chelsea_boots' ||
    subtype === 'lug_boots' ||
    subtype === 'loafers' ||
    subtype === 'derbies'
  ) {
    return { roughness: 0.36, sheen: 0.25, clearcoat: 0.42 };
  }
  if (subtype === 'puffer' || subtype === 'cropped_puffer' || subtype === 'anorak') {
    return { roughness: 0.34, sheen: 0.72, clearcoat: 0.38 };
  }
  if (subtype === 'silk_blouse' || subtype === 'midi_silk' || subtype === 'silk_scarf' || subtype === 'atlas_dress') {
    return { roughness: 0.32, sheen: 0.95, clearcoat: 0.16 };
  }
  if (subtype === 'sweater' || subtype === 'cardigan' || subtype === 'knit_dress' || subtype === 'hoodie' || subtype === 'ziphoodie') {
    return { roughness: 0.88, sheen: 0.68, clearcoat: 0 };
  }
  return { roughness: 0.72, sheen: 0.48, clearcoat: 0.04 };
}

/**
 * Continuous, physically-grounded sculptural Atelier Mannequin standing strictly on PLINTH_TOP_Y.
 * Prevents hollow disembodied garments, connects head/neck/shoulders/arms/ankles continuously,
 * and plants weight solidly through two feet into the shoes on the podium.
 */
function buildAtelierMannequin(hasShoes: boolean, gender: UserGenderFilter = 'all'): THREE.Group {
  const grp = new THREE.Group();
  const isMale = gender === 'm';
  const bodyMat = makeFabricMaterial(isMale ? '#C7BEB3' : '#D5CBC0', {
    roughness: 0.62,
    sheen: 0.2,
    clearcoat: 0.08,
  });
  const jointMat = makeMetalMaterial('#A69E92');

  // Anatomical mannequin proportions adapt cleanly for Menswear vs Womenswear
  const torso = new THREE.Mesh(
    buildLoftedShellGeometry(
      [
        { y: RIG.hipY - 0.04, rx: isMale ? 0.148 : 0.158, rz: isMale ? 0.106 : 0.114 },
        { y: RIG.waistY, rx: isMale ? 0.144 : 0.130, rz: isMale ? 0.100 : 0.094 },
        { y: RIG.chestY, rx: isMale ? 0.178 : 0.162, rz: isMale ? 0.118 : 0.112, chest: isMale ? 0.04 : 0.09 },
        { y: RIG.shoulderY, rx: isMale ? 0.194 : 0.172, rz: isMale ? 0.106 : 0.098, chest: 0.03 },
        { y: RIG.neckBaseY, rx: isMale ? 0.070 : 0.062, rz: isMale ? 0.066 : 0.060 },
      ],
      34,
      0,
    ),
    bodyMat,
  );
  torso.castShadow = true;
  torso.receiveShadow = true;
  grp.add(torso);

  // Pelvis floor cap (prevents underside hollow gap)
  const pelvisCap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 12), bodyMat);
  pelvisCap.scale.set(1.06, 0.55, 0.76);
  pelvisCap.position.set(0, RIG.hipY - 0.04, 0);
  grp.add(pelvisCap);

  // Continuous Neck overlapping jaw and collar cleanly (zero air gap!)
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.068, RIG.neckTopY - RIG.neckBaseY + 0.05, 24),
    bodyMat,
  );
  neck.position.set(0, (RIG.neckBaseY + RIG.neckTopY) * 0.5, 0.004);
  neck.castShadow = true;
  grp.add(neck);

  // Sculpted matte architectural Head (chin down to 1.553 merges directly into neckTopY=1.60)
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), bodyMat);
  head.scale.set(RIG.headRx, RIG.headRy, RIG.headRz);
  head.position.set(0, RIG.headCenterY, RIG.headCenterZ);
  head.castShadow = true;
  head.receiveShadow = true;
  grp.add(head);

  // Both articulated arms & sculpted hands hanging strictly along gravity line
  for (const side of [-1, 1] as const) {
    addTaperedLimb(
      grp,
      side,
      [RIG.shoulderJoint, RIG.elbowJoint, RIG.wristJoint],
      RIG.armRadiusTop,
      RIG.armRadiusWrist,
      bodyMat,
    );
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.029, 14, 12), bodyMat);
    hand.scale.set(0.76, 1.85, 0.56);
    hand.position.set(
      side * ((RIG.wristJoint[0] + RIG.handTip[0]) * 0.5),
      (RIG.wristJoint[1] + RIG.handTip[1]) * 0.5 + 0.006,
      (RIG.wristJoint[2] + RIG.handTip[2]) * 0.5,
    );
    hand.castShadow = true;
    grp.add(hand);
  }

  // Continuous Legs (pelvis -> knees -> calves -> ankles -> planted feet on plinth!)
  for (const side of [-1, 1] as const) {
    addTaperedLimb(
      grp,
      side,
      [
        [RIG.footX * 0.88, RIG.hipY - 0.02, 0.0],
        [RIG.footX * 0.96, RIG.kneeY, 0.015],
        [RIG.footX, RIG.ankleY - 0.03, 0.005],
      ],
      0.072,
      0.038,
      bodyMat,
    );

    if (!hasShoes) {
      // Bare mannequin foot rests flush on PLINTH_TOP_Y
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 12), bodyMat);
      foot.scale.set(0.88, 0.52, 2.2);
      foot.position.set(side * RIG.footX, PLINTH_TOP_Y + 0.022, 0.055);
      foot.castShadow = true;
      foot.receiveShadow = true;
      grp.add(foot);
    }
  }

  // Rear chrome museum brace anchoring pelvis cleanly to pedestal PLINTH_TOP_Y
  const postHeight = 0.88 - PLINTH_TOP_Y;
  const rearPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, postHeight, 16),
    jointMat,
  );
  rearPost.position.set(0, PLINTH_TOP_Y + postHeight * 0.5, -0.22);
  rearPost.castShadow = true;
  grp.add(rearPost);

  const footFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.012, 20), jointMat);
  footFlange.position.set(0, PLINTH_TOP_Y + 0.006, -0.22);
  grp.add(footFlange);

  const waistArm = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.14, 12), jointMat);
  waistArm.rotation.x = Math.PI * 0.5;
  waistArm.position.set(0, 0.88, -0.15);
  grp.add(waistArm);

  return grp;
}

function sampleLoftFrontZ(rings: LoftRing[], targetY: number, xOffset: number): number {
  let lo = rings[0]!;
  let hi = rings[rings.length - 1]!;
  for (let i = 0; i < rings.length - 1; i++) {
    if (targetY >= rings[i]!.y && targetY <= rings[i + 1]!.y) {
      lo = rings[i]!;
      hi = rings[i + 1]!;
      break;
    }
  }
  const span = Math.max(0.001, hi.y - lo.y);
  const t = Math.max(0, Math.min(1, (targetY - lo.y) / span));
  const rx = lo.rx + (hi.rx - lo.rx) * t;
  const rz = lo.rz + (hi.rz - lo.rz) * t;
  const chest = (lo.chest ?? 0) + ((hi.chest ?? 0) - (lo.chest ?? 0)) * t;
  const cosA = Math.max(-0.96, Math.min(0.96, xOffset / Math.max(0.05, rx)));
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  return rz * (1 + chest * sinA) * sinA;
}

function makeContourBeltGeometry(rx: number, rz: number, radius = 0.013): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const segs = 32;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 40, radius, 10, true);
}

function buildOuterwearGroup(
  g: Garment,
  subtype: GarmentSubtype,
  hasInnerBottom: boolean,
): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const trimMat = makeFabricMaterial(g.color2 ?? '#23201C', { roughness: 0.65, sheen: 0.3 });
  const metalMat = makeMetalMaterial(g.color2 ?? '#D4B475');

  const isLong = subtype === 'palto' || subtype === 'trench' || subtype === 'parka' || subtype === 'mac_coat';
  const isPuffer = subtype === 'puffer' || subtype === 'cropped_puffer';
  const isVest = subtype === 'vest';
  const isCape = subtype === 'cape' || subtype === 'kimono';
  const isOpen = subtype === 'blazer' || subtype === 'tuxedo_blazer' || subtype === 'cardigan' || subtype === 'vest';
  const openGap = isOpen ? 0.24 : 0.12;

  const botY = isLong ? 0.42 : subtype === 'cropped_puffer' || subtype === 'bomber' || subtype === 'varsity' ? 0.96 : 0.78;
  // Smooth tailored shoulder slopes into sleeves without protruding wing corners
  const skirtBotRx = hasInnerBottom ? 0.35 : 0.33;
  const skirtBotRz = hasInnerBottom ? 0.25 : 0.23;

  const rings: LoftRing[] = isLong
    ? [
        { y: botY, rx: skirtBotRx, rz: skirtBotRz, chest: 0.04, pleats: 4 },
        { y: 0.74, rx: 0.292, rz: 0.212, chest: 0.07 },
        { y: 1.02, rx: 0.248, rz: 0.182, chest: 0.09 },
        { y: 1.25, rx: 0.254, rz: 0.182, chest: 0.10 },
        { y: 1.43, rx: 0.236, rz: 0.145, chest: 0.04 },
        { y: 1.495, rx: 0.118, rz: 0.105 },
      ]
    : isCape
      ? [
          { y: 0.68, rx: 0.43, rz: 0.30, pleats: 6 },
          { y: 1.02, rx: 0.34, rz: 0.235, pleats: 4 },
          { y: 1.36, rx: 0.25, rz: 0.165 },
          { y: 1.495, rx: 0.118, rz: 0.105 },
        ]
      : [
          { y: botY, rx: isPuffer ? 0.305 : 0.254, rz: isPuffer ? 0.212 : 0.182, chest: 0.08 },
          { y: (botY + 1.45) * 0.52, rx: isPuffer ? 0.308 : 0.258, rz: isPuffer ? 0.218 : 0.185, chest: 0.11 },
          { y: 1.43, rx: isPuffer ? 0.275 : 0.236, rz: isPuffer ? 0.175 : 0.145, chest: 0.05 },
          { y: 1.495, rx: 0.118, rz: 0.105 },
        ];

  const bodyMesh = new THREE.Mesh(buildLoftedShellGeometry(rings, 44, openGap, 0.015), mat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  grp.add(bodyMesh);

  // Puffer quilted chambers conforming snugly around rib radii
  if (isPuffer) {
    const numRibs = subtype === 'cropped_puffer' ? 4 : 5;
    for (let i = 0; i < numRibs; i++) {
      const t = (i + 0.55) / numRibs;
      const ry = botY + t * (1.38 - botY);
      const ribGeo = makeContourBeltGeometry(0.272, 0.195, 0.030);
      const rib = new THREE.Mesh(ribGeo, mat);
      rib.position.set(0, ry, 0.008);
      rib.castShadow = true;
      grp.add(rib);
    }
  }

  // Tailored lapels seated flush against exact cloth slope
  const lapelAng = Math.PI * 0.5 + openGap + 0.10;
  for (const side of [-1, 1] as const) {
    const lx = side * Math.abs(Math.cos(lapelAng)) * 0.21;
    const lz = sampleLoftFrontZ(rings, 1.35, lx) + 0.005;
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.22, 0.014), trimMat);
    lapel.position.set(lx, 1.35, lz);
    lapel.rotation.z = side * -0.22;
    lapel.rotation.y = side * 0.34;
    lapel.castShadow = true;
    grp.add(lapel);
  }

  // Tailored stand collar seamlessly extending coat neck line
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.110, 0.018, 12, 26, Math.PI * 1.48),
    mat,
  );
  collar.position.set(0, 1.502, -0.004);
  collar.rotation.x = Math.PI * 0.5;
  collar.rotation.z = Math.PI * 0.76;
  grp.add(collar);

  // Placket buttons computed dynamically onto outer cloth Z surface (all buttons cleanly visible!)
  const btnCount = isLong ? 4 : 3;
  const btnOffsetX = openGap > 0.2 ? 0.095 : 0.072;
  for (let i = 0; i < btnCount; i++) {
    const by = botY + 0.22 + i * ((1.22 - botY) / Math.max(1, btnCount - 1));
    const xs = subtype === 'peacoat' || subtype === 'trench' ? [-btnOffsetX, btnOffsetX] : [btnOffsetX];
    for (const bx of xs) {
      const bz = sampleLoftFrontZ(rings, by, bx) + 0.006;
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.009, 16), metalMat);
      btn.rotation.x = Math.PI * 0.5;
      btn.position.set(bx, by, bz);
      grp.add(btn);
    }
  }

  // Contour belt strictly wrapping OUTSIDE the waist cloth + front metallic buckle flush on belt
  if (subtype === 'trench' || subtype === 'palto') {
    const waistZ = sampleLoftFrontZ(rings, 1.02, 0);
    const beltRx = 0.264;
    const beltRz = waistZ + 0.014;
    const belt = new THREE.Mesh(makeContourBeltGeometry(beltRx, beltRz, 0.014), trimMat);
    belt.position.set(0, 1.02, 0);
    belt.castShadow = true;
    grp.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.040, 0.016), metalMat);
    buckle.position.set(0.055, 1.02, sampleLoftFrontZ(rings, 1.02, 0.055) + 0.022);
    grp.add(buckle);
  }

  if (!isVest && !isCape) {
    const armRadius = isPuffer ? 0.084 : 0.068;
    const wristRadius = isPuffer ? 0.062 : 0.050;
    for (const side of [-1, 1] as const) {
      addTaperedLimb(
        grp,
        side,
        [RIG.shoulderJoint, RIG.elbowJoint, RIG.wristJoint],
        armRadius,
        wristRadius,
        mat,
        trimMat,
      );
    }
  }

  return grp;
}

function buildTopGroup(
  g: Garment,
  subtype: GarmentSubtype,
  tuckedUnderCoat: boolean,
): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const trimMat = makeFabricMaterial(g.color2 ?? g.color, { roughness: 0.72, sheen: 0.4 });
  const cordMat = makeFabricMaterial('#FAF5EB', { roughness: 0.7 });
  const metalMat = makeMetalMaterial('#D0D4DC');

  // Trim outer torso scale cleanly inside coat envelope when worn under outerwear
  const sc = tuckedUnderCoat ? 0.91 : 1.0;
  const botY = subtype === 'crop_top' ? 1.10 : 0.96;

  const rings: LoftRing[] = [
    { y: botY, rx: 0.188 * sc, rz: 0.132 * sc },
    { y: 1.12, rx: 0.192 * sc, rz: 0.136 * sc, chest: 0.09 },
    { y: 1.28, rx: 0.214 * sc, rz: 0.146 * sc, chest: 0.14 },
    { y: 1.43, rx: 0.220 * sc, rz: 0.124 * sc, chest: 0.04 },
    { y: 1.488, rx: tuckedUnderCoat ? 0.080 : 0.096, rz: tuckedUnderCoat ? 0.074 : 0.088 },
  ];
  const torso = new THREE.Mesh(buildLoftedShellGeometry(rings, 40, 0), mat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  grp.add(torso);

  // Snug ribbed hem band wrapping waistline
  if (subtype !== 'tank_top' && subtype !== 'shirt' && subtype !== 'silk_blouse') {
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.168 * sc, 0.017, 10, 32), trimMat);
    hem.position.set(0, botY, 0);
    hem.rotation.x = Math.PI * 0.5;
    hem.scale.set(1.13, 0.79, 1);
    grp.add(hem);
  }

  // Hoodie draped collar hood (sitting smoothly over trapezius/upper back) + gravity-plumb drawstrings
  if (subtype === 'hoodie' || subtype === 'ziphoodie' || subtype === 'hoodie_dress') {
    const hoodCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.036, 14, 28, Math.PI * 1.55),
      mat,
    );
    hoodCollar.position.set(0, 1.505, -0.02);
    hoodCollar.rotation.x = Math.PI * 0.42;
    hoodCollar.rotation.z = Math.PI * 0.72;
    hoodCollar.castShadow = true;
    grp.add(hoodCollar);

    const hoodFold = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12), mat);
    hoodFold.scale.set(1.15, 0.65, 0.78);
    hoodFold.position.set(0, 1.47, -0.13);
    hoodFold.castShadow = true;
    grp.add(hoodFold);

    // Drawstrings hang vertically along gravity with metallic aglets
    for (const side of [-1, 1] as const) {
      const cz = torsoFrontZ(1.36) * sc + 0.018;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8), cordMat);
      cord.position.set(side * 0.036, 1.38, cz);
      grp.add(cord);
      const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.018, 8), metalMat);
      aglet.position.set(side * 0.036, 1.295, cz);
      grp.add(aglet);
    }

    if (subtype === 'ziphoodie') {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.49, 0.012), metalMat);
      zip.position.set(0, 1.22, 0.155 * sc);
      grp.add(zip);
    }
  } else if (subtype === 'turtleneck') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.088, 0.105, 28), mat);
    neck.position.set(0, 1.535, 0.004);
    neck.castShadow = true;
    grp.add(neck);
  } else if (subtype === 'shirt' || subtype === 'overshirt' || subtype === 'polo' || subtype === 'knit_polo') {
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(tuckedUnderCoat ? 0.074 : 0.088, 0.013, 10, 26, Math.PI * 1.6),
      trimMat,
    );
    collarRing.position.set(0, tuckedUnderCoat ? 1.486 : 1.495, 0.004);
    collarRing.rotation.x = Math.PI * 0.48;
    collarRing.rotation.z = Math.PI * 0.7;
    grp.add(collarRing);
  }

  // Sleeves follow exact arm rig; hide full sleeves when tucked inside outerwear sleeves
  const isSleeveless = subtype === 'tank_top';
  const isShortSleeve = subtype === 'tee' || subtype === 'polo' || subtype === 'crop_top' || subtype === 'knit_polo';
  if (!isSleeveless && !tuckedUnderCoat) {
    for (const side of [-1, 1] as const) {
      if (isShortSleeve) {
        addTaperedLimb(
          grp,
          side,
          [
            RIG.shoulderJoint,
            [0.245, 1.31, -0.004],
            [0.268, 1.24, -0.008],
          ],
          0.056,
          0.049,
          mat,
        );
      } else {
        addTaperedLimb(
          grp,
          side,
          [RIG.shoulderJoint, RIG.elbowJoint, RIG.wristJoint],
          0.056,
          0.040,
          mat,
          trimMat,
        );
      }
    }
  }

  return grp;
}

function buildBottomGroup(
  g: Garment,
  subtype: GarmentSubtype,
  underLongCover: boolean,
): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const trimMat = makeFabricMaterial(g.color2 ?? '#25221E', { roughness: 0.7 });
  const metalMat = makeMetalMaterial('#C9A86A');

  const isSkirt = subtype === 'skirt' || subtype === 'a_line_skirt';
  const isShorts = subtype === 'shorts';
  const isWide = subtype === 'wide_trousers' || subtype === 'pleated_trousers' || subtype === 'culottes';

  // Fit skirt inside coat hemline when worn underneath long coats
  const skirtBotRx = underLongCover ? 0.28 : 0.35;
  const skirtBotRz = underLongCover ? 0.20 : 0.26;
  const skirtBotY = subtype === 'a_line_skirt' ? 0.50 : 0.44;

  const waist = new THREE.Mesh(
    buildLoftedShellGeometry(
      [
        {
          y: isSkirt ? skirtBotY : 0.84,
          rx: isSkirt ? skirtBotRx : 0.184,
          rz: isSkirt ? skirtBotRz : 0.130,
          pleats: isSkirt ? 10 : 0,
        },
        {
          y: isSkirt ? 0.74 : 0.92,
          rx: isSkirt ? 0.225 : 0.178,
          rz: isSkirt ? 0.165 : 0.128,
          pleats: isSkirt ? 8 : 0,
        },
        { y: 1.00, rx: 0.165, rz: 0.118 },
      ],
      40,
      0,
    ),
    mat,
  );
  waist.castShadow = true;
  waist.receiveShadow = true;
  grp.add(waist);

  const beltBand = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.014, 10, 32), trimMat);
  beltBand.position.set(0, 0.995, 0);
  beltBand.rotation.x = Math.PI * 0.5;
  beltBand.scale.set(1.13, 0.81, 1);
  grp.add(beltBand);

  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.010, 16), metalMat);
  button.rotation.x = Math.PI * 0.5;
  button.position.set(0, 0.995, 0.124);
  grp.add(button);

  if (!isSkirt) {
    // Full-length trousers drape naturally down to meet shoe upper collar (y = 0.145)
    const legBot = isShorts ? 0.58 : subtype === 'culottes' ? 0.34 : 0.145;
    const thighRx = isWide ? 0.105 : subtype === 'leggings' ? 0.068 : 0.090;
    const ankleRx = isWide ? 0.102 : subtype === 'joggers' || subtype === 'track_pants' ? 0.058 : subtype === 'leggings' ? 0.048 : 0.076;

    for (const side of [-1, 1] as const) {
      const legGeo = buildLoftedShellGeometry(
        [
          { y: legBot, rx: ankleRx, rz: ankleRx * 0.92, x: side * RIG.footX, z: 0.008 },
          {
            y: (legBot + 0.88) * 0.5,
            rx: (thighRx + ankleRx) * 0.52,
            rz: (thighRx + ankleRx) * 0.48,
            x: side * (RIG.footX * 0.96),
            z: 0.012,
          },
          { y: 0.88, rx: thighRx, rz: thighRx * 0.92, x: side * (RIG.footX * 0.88), z: 0.0 },
        ],
        28,
        0,
      );
      const leg = new THREE.Mesh(legGeo, mat);
      leg.castShadow = true;
      leg.receiveShadow = true;
      grp.add(leg);

      if (subtype === 'cargo') {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.13, 0.09), trimMat);
        pocket.position.set(side * (RIG.footX + thighRx * 0.85), 0.62, 0.01);
        pocket.castShadow = true;
        grp.add(pocket);
      }
      if (subtype === 'joggers' || subtype === 'track_pants') {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(ankleRx * 0.95, 0.012, 10, 22), trimMat);
        rib.position.set(side * RIG.footX, legBot + 0.01, 0.008);
        rib.rotation.x = Math.PI * 0.5;
        grp.add(rib);
      }
    }
  }

  return grp;
}

function buildDressGroup(
  g: Garment,
  subtype: GarmentSubtype,
  underCoat: boolean,
): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const beltMat = makeFabricMaterial(g.color2 ?? '#2F2722', { roughness: 0.45, clearcoat: 0.25 });

  const isHoodieDress = subtype === 'hoodie_dress';
  const botRx = underCoat ? 0.29 : isHoodieDress ? 0.30 : 0.39;
  const botRz = underCoat ? 0.20 : isHoodieDress ? 0.21 : 0.27;
  const rings: LoftRing[] = [
    { y: 0.36, rx: botRx, rz: botRz, pleats: isHoodieDress ? 4 : 10 },
    { y: 0.68, rx: underCoat ? 0.24 : 0.275, rz: underCoat ? 0.17 : 0.195, pleats: 8 },
    { y: 1.00, rx: 0.168, rz: 0.120 },
    { y: 1.25, rx: 0.205, rz: 0.140, chest: 0.14 },
    { y: 1.43, rx: 0.222, rz: 0.122, chest: 0.05 },
    { y: 1.495, rx: 0.095, rz: 0.088 },
  ];
  const mesh = new THREE.Mesh(buildLoftedShellGeometry(rings, 44, 0), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.014, 10, 32), beltMat);
  belt.position.set(0, 1.00, 0);
  belt.rotation.x = Math.PI * 0.5;
  belt.scale.set(1.13, 0.81, 1);
  grp.add(belt);

  if (!underCoat && subtype !== 'cocktail_dress' && subtype !== 'maxi_sundress') {
    for (const side of [-1, 1] as const) {
      addTaperedLimb(
        grp,
        side,
        [RIG.shoulderJoint, RIG.elbowJoint, subtype === 'midi_silk' ? [0.27, 1.18, 0.0] : RIG.wristJoint],
        0.052,
        0.040,
        mat,
      );
    }
  }
  return grp;
}

function buildShoesGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const upperMat = makeFabricMaterial(g.color, fp);
  const soleMat = makeFabricMaterial(
    subtype === 'sneakers' || subtype === 'running_shoes' || subtype === 'canvas_sneakers'
      ? g.color2 ?? '#F4F1EA'
      : '#1E1B18',
    { roughness: 0.55 },
  );
  const metalMat = makeMetalMaterial('#D0C4A8');

  const isBoot = subtype === 'chelsea_boots' || subtype === 'lug_boots';
  const isHeel = subtype === 'heels';
  const shaftH = isBoot ? 0.14 : isHeel ? 0.045 : 0.068;

  for (const side of [-1, 1] as const) {
    const shoe = new THREE.Group();
    shoe.position.set(side * RIG.footX, 0, RIG.footZ);
    shoe.rotation.y = side * 0.06;

    // Extruded outsole silhouette with local minY = 0
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-0.044, -0.095);
    soleShape.quadraticCurveTo(-0.052, 0.04, -0.040, 0.125);
    soleShape.quadraticCurveTo(0, 0.165, 0.040, 0.125);
    soleShape.quadraticCurveTo(0.052, 0.04, 0.044, -0.095);
    soleShape.quadraticCurveTo(0, -0.115, -0.044, -0.095);

    const soleDepth = subtype === 'lug_boots' || subtype === 'running_shoes' ? 0.028 : 0.018;
    const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
      depth: soleDepth,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 14,
    });
    soleGeo.rotateX(Math.PI * 0.5);
    soleGeo.computeBoundingBox();
    const soleMinY = soleGeo.boundingBox?.min.y ?? 0;

    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.y = -soleMinY;
    sole.castShadow = true;
    sole.receiveShadow = true;
    shoe.add(sole);

    const soleTopY = (soleGeo.boundingBox?.max.y ?? soleDepth) - soleMinY;

    if (isHeel) {
      const heelBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.055, 12), soleMat);
      heelBlock.position.set(0, 0.028, -0.068);
      shoe.add(heelBlock);
    }

    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.044, 18, 14), upperMat);
    toe.scale.set(1, 0.68, 1.45);
    toe.position.set(0, soleTopY + 0.014, 0.065);
    toe.castShadow = true;
    shoe.add(toe);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.048, shaftH, 20),
      upperMat,
    );
    shaft.scale.set(0.95, 1, 1.15);
    shaft.position.set(0, soleTopY + shaftH * 0.45, -0.035);
    shaft.castShadow = true;
    shoe.add(shaft);

    if (subtype === 'sneakers' || subtype === 'running_shoes' || subtype === 'canvas_sneakers') {
      for (let l = 0; l < 3; l++) {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.007, 0.011), soleMat);
        lace.position.set(0, soleTopY + 0.042 - l * 0.006, 0.015 + l * 0.024);
        shoe.add(lace);
      }
    } else if (subtype === 'loafers' || subtype === 'moccasins') {
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.009, 0.014), metalMat);
      bit.position.set(0, soleTopY + 0.038, 0.042);
      shoe.add(bit);
    }

    grp.add(shoe);
  }

  // Strictly plant shoe outsoles on the marble podium top (zero gap!)
  groundGroupToY(grp, PLINTH_TOP_Y);
  return grp;
}

/**
 * Builds physically-supported Bags:
 * - Backpack: contoured to back with twin continuous over-shoulder straps (held against gravity)
 * - Belt bag: worn around waist with continuous waist strap
 * - Handheld / Tote / Clutch / Crossbody / Duffle / Briefcase: resting firmly on a stone/brass showroom riser plinth standing directly on PLINTH_TOP_Y!
 */
function buildBagGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const bodyMat = makeFabricMaterial(g.color, { roughness: 0.42, sheen: 0.35, clearcoat: 0.34 });
  const accentMat = makeFabricMaterial(g.color2 ?? '#C4A27A', { roughness: 0.5 });
  const metalMat = makeMetalMaterial('#D6B26B');

  const isBackpack = subtype === 'backpack';
  const isBeltBag = subtype === 'belt_bag';
  const isClutch = subtype === 'clutch' || subtype === 'baguette';
  const isTote = subtype === 'tote' || subtype === 'woven_tote' || subtype === 'duffle' || subtype === 'briefcase';

  if (isBackpack) {
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.30, 0.12),
      bodyMat,
    );
    pack.position.set(0, 1.24, -0.205);
    pack.castShadow = true;
    pack.receiveShadow = true;
    grp.add(pack);

    const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.03), accentMat);
    frontPocket.position.set(0, 1.15, -0.27);
    grp.add(frontPocket);

    // Full continuous padded shoulder straps curving over shoulders -> chest -> underarm -> lower pack
    for (const side of [-1, 1] as const) {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.085, 1.38, -0.15),
        new THREE.Vector3(side * 0.115, 1.46, 0.02),
        new THREE.Vector3(side * 0.145, 1.28, 0.12),
        new THREE.Vector3(side * 0.145, 1.09, -0.02),
        new THREE.Vector3(side * 0.105, 1.09, -0.16),
      ]);
      const strapMesh = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 22, 0.013, 8, false), accentMat);
      strapMesh.castShadow = true;
      grp.add(strapMesh);
    }
    return grp;
  }

  if (isBeltBag) {
    const beltStrap = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.015, 10, 32), accentMat);
    beltStrap.position.set(0, 1.00, 0);
    beltStrap.rotation.x = Math.PI * 0.5;
    beltStrap.scale.set(1.14, 0.84, 1);
    grp.add(beltStrap);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.095, 0.065), bodyMat);
    pouch.position.set(0.05, 1.00, 0.165);
    pouch.castShadow = true;
    grp.add(pouch);

    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.010, 0.012), metalMat);
    zip.position.set(0.05, 1.03, 0.20);
    grp.add(zip);
    return grp;
  }

  // Grounded Display Riser Pedestal (base strictly flush on PLINTH_TOP_Y = 0.0225)
  const riserGeo = new THREE.CylinderGeometry(0.135, 0.15, RIG.riserTopY - PLINTH_TOP_Y, 32);
  const riserMat = makeFabricMaterial('#EAE2D4', { roughness: 0.4, clearcoat: 0.35 });
  const riser = new THREE.Mesh(riserGeo, riserMat);
  riser.position.set(RIG.riserX, PLINTH_TOP_Y + (RIG.riserTopY - PLINTH_TOP_Y) * 0.5, RIG.riserZ);
  riser.castShadow = true;
  riser.receiveShadow = true;
  grp.add(riser);

  const riserTrim = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.005, 10, 32), metalMat);
  riserTrim.rotation.x = Math.PI * 0.5;
  riserTrim.position.set(RIG.riserX, RIG.riserTopY - 0.004, RIG.riserZ);
  grp.add(riserTrim);

  // Build bag shell separately so its bottom sits strictly flush ON TOP of riserTopY
  const bagUnit = new THREE.Group();
  const w = isClutch ? 0.20 : isTote ? 0.23 : 0.185;
  const h = isClutch ? 0.12 : isTote ? 0.23 : 0.19;
  const d = isClutch ? 0.05 : 0.095;

  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = 0.022;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const bagGeo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.010,
    bevelSegments: 3,
    curveSegments: 10,
  });
  bagGeo.center();
  const shell = new THREE.Mesh(bagGeo, bodyMat);
  shell.position.set(0, h * 0.5 + 0.01, 0);
  shell.castShadow = true;
  shell.receiveShadow = true;
  bagUnit.add(shell);

  if (!isTote) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.42, 0.014), accentMat);
    flap.position.set(0, h * 0.72, d * 0.54);
    bagUnit.add(flap);
  }
  const clasp = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 10, 20), metalMat);
  clasp.position.set(0, h * 0.54, d * 0.60);
  bagUnit.add(clasp);

  if (isTote) {
    for (const zOff of [-0.028, 0.028]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.010, 10, 24, Math.PI), accentMat);
      handle.position.set(0, h + 0.008, zOff);
      bagUnit.add(handle);
    }
  } else if (!isClutch) {
    // Dropped strap resting coiled nicely beside bag on the riser surface (obeys gravity!)
    const restingChain = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.005, 8, 28), metalMat);
    restingChain.rotation.x = Math.PI * 0.5;
    restingChain.position.set(0, 0.008, 0.02);
    bagUnit.add(restingChain);
  }

  bagUnit.position.set(RIG.riserX, 0, RIG.riserZ);
  bagUnit.rotation.y = -0.28;
  groundGroupToY(bagUnit, RIG.riserTopY);
  grp.add(bagUnit);

  return grp;
}

/**
 * Places and orients all 17 accessory subtypes so every item physically clasps a body part,
 * rests against chest drape, or stands on the marble podium floor (zero floating!).
 */
function buildAccessoryGroup(
  g: Garment,
  subtype: GarmentSubtype,
  sideIndex: -1 | 1,
  state: { headOccupied: boolean },
): THREE.Group {
  const grp = new THREE.Group();
  const mainMat = makeFabricMaterial(g.color, { roughness: 0.55, sheen: 0.6, clearcoat: 0.2 });
  const accentMat = makeFabricMaterial(g.color2 ?? '#2A2520', { roughness: 0.6 });
  const metalMat = makeMetalMaterial(g.color2 ?? '#D4B26E');

  // 1. Headwear seated snugly ON mannequin head crown
  if (
    subtype === 'cap' ||
    subtype === 'bucket_hat' ||
    subtype === 'fedora' ||
    subtype === 'doppi' ||
    subtype === 'beanie'
  ) {
    const hatGroup = new THREE.Group();
    if (subtype === 'doppi') {
      // Structured Uzbek embroidered square-rounded doppi crown
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.096, 0.072, 4),
        mainMat,
      );
      crown.rotation.y = Math.PI * 0.25;
      crown.position.y = 0.036;
      crown.castShadow = true;
      hatGroup.add(crown);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.020, 0.135), accentMat);
      band.position.y = 0.012;
      hatGroup.add(band);
    } else {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.096, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54),
        mainMat,
      );
      crown.scale.set(0.98, 0.96, 1.06);
      crown.castShadow = true;
      hatGroup.add(crown);

      if (subtype === 'cap') {
        const visor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.105, 0.115, 0.010, 20, 1, false, -0.82, 1.64),
          mainMat,
        );
        visor.position.set(0, 0.002, 0.068);
        visor.rotation.x = 0.12;
        hatGroup.add(visor);
      } else if (subtype === 'bucket_hat' || subtype === 'fedora') {
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.098, subtype === 'fedora' ? 0.155 : 0.145, 0.028, 28, 1, true),
          mainMat,
        );
        brim.position.y = -0.005;
        hatGroup.add(brim);
      } else {
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.018, 12, 26), mainMat);
        cuff.rotation.x = Math.PI * 0.5;
        cuff.position.y = 0.008;
        hatGroup.add(cuff);
      }
    }

    if (!state.headOccupied) {
      state.headOccupied = true;
      hatGroup.position.set(0, RIG.headCenterY + 0.056, RIG.headCenterZ);
      hatGroup.rotation.x = -0.08;
    } else {
      // Second headwear item rests flat on left side of plinth top rather than colliding on head
      hatGroup.position.set(-0.34, 0, 0.12);
      groundGroupToY(hatGroup, PLINTH_TOP_Y);
    }
    grp.add(hatGroup);
    return grp;
  }

  // 2. Sunglasses seated squarely on nose bridge & resting across temples
  if (subtype === 'sunglasses') {
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1A1D24'),
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1,
      transparent: true,
      opacity: 0.88,
    });
    const glasses = new THREE.Group();
    for (const side of [-1, 1] as const) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 10, 22), mainMat);
      rim.position.set(side * 0.036, 0, 0);
      glasses.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.023, 20), lensMat);
      lens.position.set(side * 0.036, 0, 0.002);
      glasses.add(lens);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.115, 8), mainMat);
      arm.rotation.x = Math.PI * 0.5;
      arm.position.set(side * 0.072, 0.004, -0.056);
      glasses.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.005), metalMat);
    glasses.add(bridge);
    glasses.position.set(0, RIG.headCenterY + 0.012, RIG.headCenterZ + RIG.headRz + 0.008);
    grp.add(glasses);
    return grp;
  }

  // 3. Earrings anchored directly into mannequin ear lobes, hanging strictly vertically
  if (subtype === 'earrings') {
    for (const side of [-1, 1] as const) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 8, 18), metalMat);
      hoop.position.set(side * (RIG.headRx + 0.004), RIG.headCenterY - 0.022, RIG.headCenterZ - 0.008);
      hoop.rotation.y = Math.PI * 0.5;
      grp.add(hoop);
    }
    return grp;
  }

  // 4. Watch / Bracelet clasping the ACTUAL forearm tangent at RIG.wristJoint
  if (subtype === 'watch' || subtype === 'bracelet') {
    const forearmDir = new THREE.Vector3(
      sideIndex * (RIG.wristJoint[0] - RIG.elbowJoint[0]),
      RIG.wristJoint[1] - RIG.elbowJoint[1],
      RIG.wristJoint[2] - RIG.elbowJoint[2],
    ).normalize();
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.010, 12, 26), mainMat);
    strap.castShadow = true;
    const wristUnit = new THREE.Group();
    wristUnit.add(strap);

    if (subtype === 'watch') {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.011, 22), metalMat);
      bezel.rotation.z = Math.PI * 0.5;
      bezel.position.set(sideIndex * 0.045, 0, 0.012);
      wristUnit.add(bezel);
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.019, 0.012, 20),
        makeFabricMaterial('#121316', { roughness: 0.1, clearcoat: 1 }),
      );
      dial.rotation.z = Math.PI * 0.5;
      dial.position.set(sideIndex * 0.046, 0, 0.012);
      wristUnit.add(dial);
    }

    wristUnit.position.set(
      sideIndex * RIG.wristJoint[0],
      RIG.wristJoint[1] + 0.018,
      RIG.wristJoint[2] - 0.002,
    );
    wristUnit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forearmDir);
    grp.add(wristUnit);
    return grp;
  }

  // 5. Gloves sheathing BOTH anatomical hands
  if (subtype === 'gloves') {
    for (const side of [-1, 1] as const) {
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 12), mainMat);
      glove.scale.set(0.84, 1.95, 0.65);
      glove.position.set(
        side * ((RIG.wristJoint[0] + RIG.handTip[0]) * 0.5),
        (RIG.wristJoint[1] + RIG.handTip[1]) * 0.5 + 0.008,
        (RIG.wristJoint[2] + RIG.handTip[2]) * 0.5,
      );
      glove.castShadow = true;
      grp.add(glove);
    }
    return grp;
  }

  // 6. Belt wrapping snugly around exact waist circumference + front buckle
  if (subtype === 'belt') {
    const beltStrap = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.015, 10, 34), mainMat);
    beltStrap.position.set(0, RIG.waistY + 0.005, 0);
    beltStrap.rotation.x = Math.PI * 0.5;
    beltStrap.scale.set(1.13, 0.82, 1);
    beltStrap.castShadow = true;
    grp.add(beltStrap);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.034, 0.015), metalMat);
    buckle.position.set(0, RIG.waistY + 0.005, 0.146);
    grp.add(buckle);
    return grp;
  }

  // 7. Umbrella held vertically upright in left hand with ferrule planted strictly on PLINTH_TOP_Y
  if (subtype === 'umbrella') {
    const ux = -RIG.handTip[0] - 0.012;
    const uz = RIG.handTip[2] + 0.015;
    const shaftLen = 0.80;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, shaftLen, 12), accentMat);
    shaft.position.set(ux, PLINTH_TOP_Y + shaftLen * 0.5, uz);
    shaft.castShadow = true;
    grp.add(shaft);

    const canopyFold = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.44, 16), mainMat);
    canopyFold.rotation.x = Math.PI;
    canopyFold.position.set(ux, PLINTH_TOP_Y + 0.30, uz);
    canopyFold.castShadow = true;
    grp.add(canopyFold);

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.008, 10, 18, Math.PI),
      metalMat,
    );
    handle.position.set(ux - 0.025, PLINTH_TOP_Y + shaftLen, uz);
    grp.add(handle);
    return grp;
  }

  // 8. Necklace resting naturally along collarbone slope
  if (subtype === 'necklace') {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.006, 10, 28), metalMat);
    chain.position.set(0, 1.48, 0.025);
    chain.rotation.x = Math.PI * 0.42;
    grp.add(chain);
    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.016, 0), metalMat);
    pendant.position.set(0, 1.43, 0.115);
    grp.add(pendant);
    return grp;
  }

  // 9. Tie / Bowtie hugging shirt collar & draping vertically along chest contour
  if (subtype === 'tie' || subtype === 'bowtie') {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), mainMat);
    knot.position.set(0, 1.485, 0.105);
    grp.add(knot);
    if (subtype === 'tie') {
      const bladeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.47, 0.108),
        new THREE.Vector3(0, 1.32, 0.165),
        new THREE.Vector3(0, 1.12, 0.150),
      ]);
      const blade = new THREE.Mesh(new THREE.TubeGeometry(bladeCurve, 12, 0.024, 6, false), mainMat);
      blade.scale.set(1.4, 1, 0.35);
      grp.add(blade);
    } else {
      for (const side of [-1, 1] as const) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.048, 8), mainMat);
        wing.rotation.z = side * Math.PI * 0.5;
        wing.position.set(side * 0.032, 1.485, 0.108);
        grp.add(wing);
      }
    }
    return grp;
  }

  // 10. Scarf / Silk Scarf wrapped softly around neck with curved chest-draped tails under gravity
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.028, 14, 30), mainMat);
  wrap.position.set(0, 1.495, 0.005);
  wrap.rotation.x = Math.PI * 0.5;
  wrap.castShadow = true;
  grp.add(wrap);

  for (const [tx, len, dz] of [
    [-0.048, 0.25, 0.01],
    [0.052, 0.19, 0.02],
  ] as const) {
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx, 1.48, 0.11 + dz),
      new THREE.Vector3(tx * 1.05, 1.33, 0.175 + dz),
      new THREE.Vector3(tx * 1.1, 1.48 - len, 0.165 + dz),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.022, 8, false), mainMat);
    tail.scale.set(1.45, 1, 0.42);
    tail.castShadow = true;
    grp.add(tail);
  }
  return grp;
}

function tagSlotInteractive(obj: THREE.Object3D, slot: SlotKey, collect: THREE.Object3D[]) {
  obj.userData.slot = slot;
  if ((obj as THREE.Mesh).isMesh) {
    collect.push(obj);
  }
  for (const child of obj.children) {
    tagSlotInteractive(child, slot, collect);
  }
}

export function buildOutfit3DScene(
  slots: BoardSlots,
  byId: Map<string, Garment>,
  accentHex = '#8F1D2C',
  gender: UserGenderFilter = 'all',
): OutfitSlotGroups {
  const root = new THREE.Group();
  const pedestal = new THREE.Group();
  const slotGroups: Partial<Record<SlotKey, THREE.Group>> = {};
  const basePositions: Partial<Record<SlotKey, THREE.Vector3>> = {};
  const explodedOffsets: Partial<Record<SlotKey, THREE.Vector3>> = {};
  const garmentsBySlot: Partial<Record<SlotKey, Garment>> = {};
  const interactiveMeshes: THREE.Object3D[] = [];

  // Luxury two-tier marble/metal turntable pedestal flush with FLOOR_Y
  const plinthBotH = 0.044;
  const plinthBot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.62, plinthBotH, 56),
    makeFabricMaterial('#1E1B18', { roughness: 0.3, metalness: 0.25, clearcoat: 0.6 }),
  );
  plinthBot.position.y = FLOOR_Y + plinthBotH * 0.5;
  plinthBot.receiveShadow = true;
  pedestal.add(plinthBot);

  const plinthTopH = PLINTH_TOP_Y - (FLOOR_Y + plinthBotH);
  const plinthTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.50, 0.52, plinthTopH, 56),
    makeFabricMaterial('#F2EDE2', { roughness: 0.35, clearcoat: 0.5 }),
  );
  plinthTop.position.y = FLOOR_Y + plinthBotH + plinthTopH * 0.5;
  plinthTop.receiveShadow = true;
  pedestal.add(plinthTop);

  const trimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.51, 0.008, 12, 64),
    makeMetalMaterial(accentHex),
  );
  trimRing.rotation.x = Math.PI * 0.5;
  trimRing.position.y = PLINTH_TOP_Y - 0.002;
  pedestal.add(trimRing);

  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  // Articulated anatomical mannequin attached directly to pedestal
  const effectiveGender: UserGenderFilter = dress ? 'w' : gender;
  pedestal.add(buildAtelierMannequin(Boolean(shoes), effectiveGender));
  root.add(pedestal);

  const outerSub = outer ? detectGarmentSubtype(outer.category, outer.id, outer.name_uz) : null;
  const hasCoveringCoat = Boolean(
    outer && outerSub !== 'vest' && outerSub !== 'cape',
  );
  const hasLongOuter = Boolean(
    outerSub &&
      (outerSub === 'palto' ||
        outerSub === 'trench' ||
        outerSub === 'parka' ||
        outerSub === 'mac_coat' ||
        outerSub === 'cape'),
  );

  const placeSlot = (
    slot: SlotKey,
    garment: Garment | undefined,
    group: THREE.Group | null,
    explode: THREE.Vector3,
  ) => {
    if (!garment || !group) return;
    tagSlotInteractive(group, slot, interactiveMeshes);
    root.add(group);
    slotGroups[slot] = group;
    basePositions[slot] = group.position.clone();
    explodedOffsets[slot] = explode.clone();
    garmentsBySlot[slot] = garment;
  };

  if (bottom && !dress) {
    const sub = detectGarmentSubtype(bottom.category, bottom.id, bottom.name_uz);
    placeSlot(
      'bottom',
      bottom,
      buildBottomGroup(bottom, sub, hasLongOuter),
      new THREE.Vector3(0, -0.04, -0.14),
    );
  }
  if (dress) {
    const sub = detectGarmentSubtype(dress.category, dress.id, dress.name_uz);
    placeSlot(
      'dress',
      dress,
      buildDressGroup(dress, sub, hasCoveringCoat),
      new THREE.Vector3(0, 0.04, 0),
    );
  } else if (top) {
    const sub = detectGarmentSubtype(top.category, top.id, top.name_uz);
    placeSlot(
      'top',
      top,
      buildTopGroup(top, sub, hasCoveringCoat),
      new THREE.Vector3(0, 0.14, 0.08),
    );
  }
  if (outer && outerSub) {
    placeSlot(
      'outerwear',
      outer,
      buildOuterwearGroup(outer, outerSub, Boolean(bottom || dress)),
      new THREE.Vector3(-0.34, 0.06, 0.28),
    );
  }
  if (shoes) {
    const sub = detectGarmentSubtype(shoes.category, shoes.id, shoes.name_uz);
    placeSlot(
      'shoes',
      shoes,
      buildShoesGroup(shoes, sub),
      new THREE.Vector3(0, -0.02, 0.28),
    );
  }
  if (bag) {
    const sub = detectGarmentSubtype(bag.category, bag.id, bag.name_uz);
    const isBackpack = sub === 'backpack';
    placeSlot(
      'bag',
      bag,
      buildBagGroup(bag, sub),
      isBackpack ? new THREE.Vector3(0, 0.1, -0.35) : new THREE.Vector3(0.28, 0.02, 0.16),
    );
  }

  const accState = { headOccupied: false };
  if (acc1) {
    const sub = detectGarmentSubtype(acc1.category, acc1.id, acc1.name_uz);
    placeSlot(
      'accessory1',
      acc1,
      buildAccessoryGroup(acc1, sub, -1, accState),
      new THREE.Vector3(-0.22, 0.12, 0.22),
    );
  }
  if (acc2) {
    const sub = detectGarmentSubtype(acc2.category, acc2.id, acc2.name_uz);
    placeSlot(
      'accessory2',
      acc2,
      buildAccessoryGroup(acc2, sub, 1, accState),
      new THREE.Vector3(0.22, 0.16, 0.20),
    );
  }

  return {
    root,
    pedestal,
    slotGroups,
    basePositions,
    explodedOffsets,
    garmentsBySlot,
    interactiveMeshes,
  };
}
