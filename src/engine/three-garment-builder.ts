import * as THREE from 'three';
import type { Garment } from '../data/schema';
import type { BoardSlots, SlotKey } from './stylist';
import { detectGarmentSubtype, type GarmentSubtype } from '../components/GarmentSilhouette';

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
 * Generates a closed contoured tubular/lofted garment shell with natural fabric
 * waves, chest curvature, optional open front gap + inner wall thickness.
 */
function buildLoftedShellGeometry(
  rings: LoftRing[],
  radialSegs = 40,
  openFrontRad = 0,
  thickness = 0.014,
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
        const pleatDelta = pleats > 0 ? 1 + Math.sin(a * pleats) * 0.045 : 1;
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
    const innerOff = pushShell(0.92);
    for (let r = 0; r < ringCount - 1; r++) {
      for (let c = 0; c < radialSegs; c++) {
        const a = innerOff + r * cols + c;
        const b = a + 1;
        const d = innerOff + (r + 1) * cols + c;
        const e = d + 1;
        indices.push(a, e, b, a, d, e);
      }
      // Seal front opening vertical lapels (col=0 and col=radialSegs)
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

function addSleeve(
  group: THREE.Group,
  side: -1 | 1,
  shoulder: [number, number, number],
  elbow: [number, number, number],
  wrist: [number, number, number],
  radiusTop: number,
  radiusWrist: number,
  mat: THREE.Material,
  cuffMat?: THREE.Material,
) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * shoulder[0], shoulder[1], shoulder[2]),
    new THREE.Vector3(side * elbow[0], elbow[1], elbow[2]),
    new THREE.Vector3(side * wrist[0], wrist[1], wrist[2]),
  ]);
  const geo = new THREE.TubeGeometry(curve, 18, (radiusTop + radiusWrist) * 0.5, 20, false);
  // Subtle organic taper along arm length
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const cPts = curve.getSpacedPoints(18);
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.min(18, Math.floor(i / 21));
    const u = ringIdx / 18;
    const center = cPts[ringIdx] ?? cPts[0]!;
    v.fromBufferAttribute(pos, i).sub(center);
    const ratio = (radiusTop * (1 - u) + radiusWrist * u) / ((radiusTop + radiusWrist) * 0.5);
    v.multiplyScalar(ratio).add(center);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const sleeve = new THREE.Mesh(geo, mat);
  sleeve.castShadow = true;
  sleeve.receiveShadow = true;
  group.add(sleeve);

  if (cuffMat) {
    const cuffGeo = new THREE.TorusGeometry(radiusWrist * 0.94, 0.015, 10, 24);
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.position.set(side * wrist[0], wrist[1], wrist[2]);
    cuff.rotation.x = Math.PI * 0.45;
    cuff.rotation.y = side * -0.25;
    cuff.castShadow = true;
    group.add(cuff);
  }
}

function getFabricPropsForSubtype(subtype: GarmentSubtype): {
  roughness: number;
  sheen: number;
  clearcoat: number;
} {
  if (subtype === 'leather_jacket' || subtype === 'chelsea_boots' || subtype === 'lug_boots' || subtype === 'loafers') {
    return { roughness: 0.36, sheen: 0.25, clearcoat: 0.42 };
  }
  if (subtype === 'puffer' || subtype === 'cropped_puffer') {
    return { roughness: 0.34, sheen: 0.72, clearcoat: 0.38 };
  }
  if (subtype === 'silk_blouse' || subtype === 'midi_silk' || subtype === 'silk_scarf') {
    return { roughness: 0.32, sheen: 0.95, clearcoat: 0.16 };
  }
  if (subtype === 'sweater' || subtype === 'cardigan' || subtype === 'knit_dress' || subtype === 'hoodie') {
    return { roughness: 0.88, sheen: 0.68, clearcoat: 0 };
  }
  return { roughness: 0.72, sheen: 0.48, clearcoat: 0.04 };
}

function buildOuterwearGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const trimMat = makeFabricMaterial(g.color2 ?? '#23201C', { roughness: 0.65, sheen: 0.3 });
  const metalMat = makeMetalMaterial(g.color2 ?? '#D4B475');

  const isLong = subtype === 'palto' || subtype === 'trench' || subtype === 'parka';
  const isPuffer = subtype === 'puffer' || subtype === 'cropped_puffer';
  const isVest = subtype === 'vest';
  const isCape = subtype === 'cape';

  const botY = isLong ? 0.42 : subtype === 'cropped_puffer' || subtype === 'bomber' ? 0.98 : 0.78;
  const rings: LoftRing[] = isLong
    ? [
        { y: botY, rx: 0.33, rz: 0.24, chest: 0.04, pleats: 4 },
        { y: 0.75, rx: 0.28, rz: 0.20, chest: 0.08 },
        { y: 1.04, rx: 0.24, rz: 0.17, chest: 0.10 },
        { y: 1.24, rx: 0.26, rz: 0.18, chest: 0.12 },
        { y: 1.44, rx: 0.29, rz: 0.16, chest: 0.06 },
        { y: 1.50, rx: 0.14, rz: 0.12 },
      ]
    : isCape
      ? [
          { y: 0.66, rx: 0.42, rz: 0.31, pleats: 6 },
          { y: 1.02, rx: 0.34, rz: 0.24, pleats: 4 },
          { y: 1.36, rx: 0.26, rz: 0.17 },
          { y: 1.50, rx: 0.14, rz: 0.12 },
        ]
      : [
          { y: botY, rx: isPuffer ? 0.30 : 0.25, rz: isPuffer ? 0.21 : 0.18, chest: 0.08 },
          { y: (botY + 1.46) * 0.52, rx: isPuffer ? 0.31 : 0.26, rz: isPuffer ? 0.22 : 0.18, chest: 0.14 },
          { y: 1.42, rx: isPuffer ? 0.32 : 0.29, rz: isPuffer ? 0.19 : 0.16, chest: 0.08 },
          { y: 1.49, rx: 0.14, rz: 0.12 },
        ];

  const openGap = subtype === 'blazer' || subtype === 'cardigan' ? 0.28 : 0.16;
  const bodyMesh = new THREE.Mesh(buildLoftedShellGeometry(rings, 44, openGap, 0.016), mat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  grp.add(bodyMesh);

  // Quilted horizontal puffer ribs
  if (isPuffer) {
    const numRibs = subtype === 'cropped_puffer' ? 4 : 5;
    for (let i = 0; i < numRibs; i++) {
      const t = (i + 0.6) / numRibs;
      const ry = botY + t * (1.42 - botY);
      const ribGeo = new THREE.TorusGeometry(0.245, 0.042, 14, 34);
      const rib = new THREE.Mesh(ribGeo, mat);
      rib.position.set(0, ry, 0);
      rib.rotation.x = Math.PI * 0.5;
      rib.scale.set(1.18, 0.76, 1);
      rib.castShadow = true;
      grp.add(rib);
    }
  }

  // Tailored structured collar & lapels
  for (const side of [-1, 1] as const) {
    const lapelGeo = new THREE.BoxGeometry(0.065, 0.26, 0.022);
    const lapel = new THREE.Mesh(lapelGeo, trimMat);
    lapel.position.set(side * 0.082, 1.36, 0.165);
    lapel.rotation.z = side * -0.24;
    lapel.rotation.y = side * 0.28;
    lapel.castShadow = true;
    grp.add(lapel);
  }

  // Stand neck collar back arc
  const collarGeo = new THREE.TorusGeometry(0.115, 0.024, 12, 24, Math.PI * 1.45);
  const collar = new THREE.Mesh(collarGeo, mat);
  collar.position.set(0, 1.50, -0.01);
  collar.rotation.x = Math.PI * 0.5;
  collar.rotation.z = Math.PI * 0.78;
  grp.add(collar);

  // Double-breasted / front metallic buttons or zip pull
  const btnCount = isLong ? 4 : 3;
  for (let i = 0; i < btnCount; i++) {
    const by = botY + 0.18 + i * ((1.22 - botY) / Math.max(1, btnCount - 1));
    for (const bx of subtype === 'peacoat' || subtype === 'trench' ? [-0.055, 0.055] : [0.03]) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 16), metalMat);
      btn.rotation.x = Math.PI * 0.5;
      btn.position.set(bx, by, 0.195);
      grp.add(btn);
    }
  }

  // Trench belt & buckle
  if (subtype === 'trench' || subtype === 'palto') {
    const beltGeo = new THREE.TorusGeometry(0.215, 0.017, 10, 36);
    const belt = new THREE.Mesh(beltGeo, trimMat);
    belt.position.set(0, 1.03, 0);
    belt.rotation.x = Math.PI * 0.5;
    belt.scale.set(1.16, 0.85, 1);
    grp.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.044, 0.018), metalMat);
    buckle.position.set(0, 1.03, 0.19);
    grp.add(buckle);
  }

  // Arms unless vest/cape
  if (!isVest && !isCape) {
    const armRadius = isPuffer ? 0.088 : 0.072;
    const wristRadius = isPuffer ? 0.068 : 0.055;
    for (const side of [-1, 1] as const) {
      addSleeve(
        grp,
        side,
        [0.25, 1.40, 0.0],
        [0.34, 1.14, -0.02],
        [0.37, 0.86, 0.05],
        armRadius,
        wristRadius,
        mat,
        trimMat,
      );
    }
  }

  return grp;
}

function buildTopGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, fp);
  const trimMat = makeFabricMaterial(g.color2 ?? g.color, { roughness: 0.72, sheen: 0.4 });
  const cordMat = makeFabricMaterial('#FAF5EB', { roughness: 0.7 });
  const metalMat = makeMetalMaterial('#D0D4DC');

  const rings: LoftRing[] = [
    { y: 0.96, rx: 0.21, rz: 0.145 },
    { y: 1.12, rx: 0.20, rz: 0.145, chest: 0.1 },
    { y: 1.29, rx: 0.225, rz: 0.155, chest: 0.16 },
    { y: 1.44, rx: 0.245, rz: 0.135, chest: 0.06 },
    { y: 1.50, rx: 0.105, rz: 0.095 },
  ];
  const torso = new THREE.Mesh(buildLoftedShellGeometry(rings, 42, 0), mat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  grp.add(torso);

  // Top + Bottom neck cap so dark interior never looks hollow
  const neckCap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.102, 0.05, 24), trimMat);
  neckCap.position.set(0, 1.505, 0);
  grp.add(neckCap);

  // Ribbed hem band
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.02, 10, 32), trimMat);
  hem.position.set(0, 0.96, 0);
  hem.rotation.x = Math.PI * 0.5;
  hem.scale.set(1.14, 0.78, 1);
  grp.add(hem);

  // Hoodie 3D volumetric draped hood + kangaroo pocket + drawstrings
  if (subtype === 'hoodie' || subtype === 'ziphoodie' || subtype === 'hoodie_dress') {
    const hoodGeo = new THREE.SphereGeometry(0.145, 22, 16, 0, Math.PI * 1.45, 0.2, Math.PI * 0.75);
    const hood = new THREE.Mesh(hoodGeo, mat);
    hood.position.set(0, 1.56, -0.055);
    hood.rotation.x = 0.35;
    hood.rotation.y = Math.PI * 0.78;
    hood.castShadow = true;
    grp.add(hood);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.038), trimMat);
    pocket.position.set(0, 1.07, 0.145);
    grp.add(pocket);

    for (const side of [-1, 1] as const) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 8), cordMat);
      cord.position.set(side * 0.042, 1.38, 0.155);
      cord.rotation.z = side * 0.08;
      grp.add(cord);
    }
    if (subtype === 'ziphoodie') {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.51, 0.018), metalMat);
      zip.position.set(0, 1.23, 0.16);
      grp.add(zip);
    }
  } else if (subtype === 'turtleneck') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.098, 0.11, 28), mat);
    neck.position.set(0, 1.545, 0);
    neck.castShadow = true;
    grp.add(neck);
  } else if (subtype === 'shirt' || subtype === 'overshirt' || subtype === 'polo') {
    for (const side of [-1, 1] as const) {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.048, 0.016), trimMat);
      collar.position.set(side * 0.052, 1.505, 0.092);
      collar.rotation.z = side * -0.4;
      collar.rotation.y = side * 0.35;
      grp.add(collar);
    }
  }

  // Sleeves (short for tee/polo, full for knit/hoodie/shirt)
  const isShortSleeve = subtype === 'tee' || subtype === 'polo';
  for (const side of [-1, 1] as const) {
    if (isShortSleeve) {
      addSleeve(
        grp,
        side,
        [0.21, 1.41, 0],
        [0.26, 1.33, 0],
        [0.30, 1.25, 0.01],
        0.064,
        0.058,
        mat,
      );
    } else {
      addSleeve(
        grp,
        side,
        [0.21, 1.40, 0],
        [0.295, 1.15, -0.01],
        [0.325, 0.90, 0.04],
        0.064,
        0.048,
        mat,
        trimMat,
      );
    }
  }

  return grp;
}

function buildBottomGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const trimMat = makeFabricMaterial(g.color2 ?? '#25221E', { roughness: 0.7 });
  const metalMat = makeMetalMaterial('#C9A86A');

  const isSkirt = subtype === 'skirt';
  const isShorts = subtype === 'shorts';
  const isWide = subtype === 'wide_trousers' || subtype === 'pleated_trousers' || subtype === 'cargo';

  // Sculpted waistband + pelvis yoke
  const waist = new THREE.Mesh(
    buildLoftedShellGeometry(
      [
        { y: isSkirt ? 0.42 : 0.84, rx: isSkirt ? 0.36 : 0.215, rz: isSkirt ? 0.28 : 0.145, pleats: isSkirt ? 10 : 0 },
        { y: isSkirt ? 0.74 : 0.92, rx: isSkirt ? 0.25 : 0.21, rz: isSkirt ? 0.18 : 0.145, pleats: isSkirt ? 8 : 0 },
        { y: 1.00, rx: 0.195, rz: 0.138 },
      ],
      44,
      0,
    ),
    mat,
  );
  waist.castShadow = true;
  waist.receiveShadow = true;
  grp.add(waist);

  const beltBand = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.016, 10, 32), trimMat);
  beltBand.position.set(0, 0.995, 0);
  beltBand.rotation.x = Math.PI * 0.5;
  beltBand.scale.set(1.13, 0.8, 1);
  grp.add(beltBand);

  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 16), metalMat);
  button.rotation.x = Math.PI * 0.5;
  button.position.set(0, 0.995, 0.145);
  grp.add(button);

  if (!isSkirt) {
    const legBot = isShorts ? 0.58 : 0.20;
    const thighRx = isWide ? 0.118 : 0.102;
    const ankleRx = subtype === 'wide_trousers' || subtype === 'pleated_trousers' ? 0.115 : subtype === 'joggers' || subtype === 'track_pants' ? 0.068 : 0.088;

    for (const side of [-1, 1] as const) {
      const legGeo = buildLoftedShellGeometry(
        [
          { y: legBot, rx: ankleRx, rz: ankleRx * 0.92, x: side * 0.112 },
          { y: (legBot + 0.88) * 0.5, rx: (thighRx + ankleRx) * 0.52, rz: (thighRx + ankleRx) * 0.48, x: side * 0.104 },
          { y: 0.88, rx: thighRx, rz: thighRx * 0.95, x: side * 0.098 },
        ],
        28,
        0,
      );
      const leg = new THREE.Mesh(legGeo, mat);
      leg.castShadow = true;
      leg.receiveShadow = true;
      grp.add(leg);

      if (subtype === 'cargo') {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.10), trimMat);
        pocket.position.set(side * 0.205, 0.62, 0.01);
        pocket.castShadow = true;
        grp.add(pocket);
      }
      if (subtype === 'joggers' || subtype === 'track_pants') {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(ankleRx * 0.95, 0.014, 10, 22), trimMat);
        rib.position.set(side * 0.112, legBot + 0.01, 0);
        rib.rotation.x = Math.PI * 0.5;
        grp.add(rib);
      }
    }
  }

  return grp;
}

function buildDressGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const mat = makeFabricMaterial(g.color, { ...fp, doubleSided: true });
  const beltMat = makeFabricMaterial(g.color2 ?? '#2F2722', { roughness: 0.45, clearcoat: 0.25 });

  const isHoodieDress = subtype === 'hoodie_dress';
  const rings: LoftRing[] = [
    { y: 0.34, rx: isHoodieDress ? 0.32 : 0.42, rz: isHoodieDress ? 0.22 : 0.30, pleats: isHoodieDress ? 4 : 10 },
    { y: 0.66, rx: 0.29, rz: 0.21, pleats: 8 },
    { y: 1.00, rx: 0.185, rz: 0.132 },
    { y: 1.24, rx: 0.215, rz: 0.148, chest: 0.15 },
    { y: 1.44, rx: 0.235, rz: 0.132, chest: 0.06 },
    { y: 1.50, rx: 0.102, rz: 0.095 },
  ];
  const mesh = new THREE.Mesh(buildLoftedShellGeometry(rings, 48, 0), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  grp.add(mesh);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.015, 10, 32), beltMat);
  belt.position.set(0, 1.00, 0);
  belt.rotation.x = Math.PI * 0.5;
  belt.scale.set(1.13, 0.82, 1);
  grp.add(belt);

  for (const side of [-1, 1] as const) {
    addSleeve(
      grp,
      side,
      [0.20, 1.40, 0],
      [0.27, 1.21, 0],
      [0.30, subtype === 'midi_silk' ? 1.05 : 0.92, 0.03],
      0.058,
      0.046,
      mat,
    );
  }
  return grp;
}

function buildShoesGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const fp = getFabricPropsForSubtype(subtype);
  const upperMat = makeFabricMaterial(g.color, fp);
  const soleMat = makeFabricMaterial(
    subtype === 'sneakers' || subtype === 'running_shoes' ? g.color2 ?? '#F4F1EA' : '#1E1B18',
    { roughness: 0.55 },
  );
  const metalMat = makeMetalMaterial('#D0C4A8');

  const isBoot = subtype === 'chelsea_boots' || subtype === 'lug_boots';
  const shaftH = isBoot ? 0.14 : 0.068;

  for (const side of [-1, 1] as const) {
    const shoe = new THREE.Group();
    shoe.position.set(side * 0.115, 0.04, 0.045);
    shoe.rotation.y = side * 0.07;

    // Extruded curved outsole footprint silhouette
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-0.046, -0.10);
    soleShape.quadraticCurveTo(-0.055, 0.04, -0.042, 0.13);
    soleShape.quadraticCurveTo(0, 0.17, 0.042, 0.13);
    soleShape.quadraticCurveTo(0.055, 0.04, 0.046, -0.10);
    soleShape.quadraticCurveTo(0, -0.12, -0.046, -0.10);

    const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
      depth: subtype === 'lug_boots' || subtype === 'running_shoes' ? 0.034 : 0.024,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 3,
      curveSegments: 16,
    });
    soleGeo.rotateX(Math.PI * 0.5);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.y = 0.032;
    sole.castShadow = true;
    sole.receiveShadow = true;
    shoe.add(sole);

    // Sculpted toe box
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.046, 20, 14), upperMat);
    toe.scale.set(1, 0.72, 1.45);
    toe.position.set(0, 0.044, 0.068);
    toe.castShadow = true;
    shoe.add(toe);

    // Ankle & heel collar / boot shaft
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.052, shaftH, 22),
      upperMat,
    );
    shaft.scale.set(0.95, 1, 1.15);
    shaft.position.set(0, 0.034 + shaftH * 0.5, -0.038);
    shaft.castShadow = true;
    shoe.add(shaft);

    if (subtype === 'sneakers' || subtype === 'running_shoes') {
      for (let l = 0; l < 3; l++) {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.012), soleMat);
        lace.position.set(0, 0.072 - l * 0.007, 0.015 + l * 0.025);
        shoe.add(lace);
      }
    } else if (subtype === 'loafers') {
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.016), metalMat);
      bit.position.set(0, 0.068, 0.045);
      shoe.add(bit);
    }

    grp.add(shoe);
  }

  return grp;
}

function buildBagGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const bodyMat = makeFabricMaterial(g.color, { roughness: 0.42, sheen: 0.35, clearcoat: 0.34 });
  const accentMat = makeFabricMaterial(g.color2 ?? '#C4A27A', { roughness: 0.5 });
  const metalMat = makeMetalMaterial('#D6B26B');

  const isBackpack = subtype === 'backpack';
  const isClutch = subtype === 'clutch';
  const isTote = subtype === 'tote' || subtype === 'duffle';
  const w = isClutch ? 0.21 : isTote ? 0.24 : 0.19;
  const h = isClutch ? 0.13 : isBackpack ? 0.29 : 0.22;
  const d = isClutch ? 0.05 : isBackpack ? 0.13 : 0.10;

  // Rounded extruded box shell via ExtrudeGeometry rounded rectangle
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = 0.024;
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
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 4,
    curveSegments: 12,
  });
  bagGeo.center();
  const shell = new THREE.Mesh(bagGeo, bodyMat);
  shell.position.set(0, h * 0.5, 0);
  shell.castShadow = true;
  shell.receiveShadow = true;
  grp.add(shell);

  // Flap / pocket detail & gold hardware clasp
  if (!isTote) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.42, 0.016), accentMat);
    flap.position.set(0, h * 0.72, d * 0.52);
    grp.add(flap);
  }
  const clasp = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 10, 20), metalMat);
  clasp.position.set(0, h * 0.56, d * 0.58);
  grp.add(clasp);

  // Sculpted handles or crossbody arc
  if (isTote || isBackpack) {
    for (const zOff of isTote ? [-0.032, 0.032] : [0]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 10, 24, Math.PI), accentMat);
      handle.position.set(0, h + 0.01, zOff);
      grp.add(handle);
    }
  } else if (!isClutch) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.006, 8, 28, Math.PI), metalMat);
    chain.position.set(0, h + 0.01, 0);
    grp.add(chain);
  }

  return grp;
}

function buildAccessoryGroup(g: Garment, subtype: GarmentSubtype): THREE.Group {
  const grp = new THREE.Group();
  const mainMat = makeFabricMaterial(g.color, { roughness: 0.55, sheen: 0.6, clearcoat: 0.2 });
  const metalMat = makeMetalMaterial(g.color2 ?? '#D4B26E');

  if (subtype === 'sunglasses') {
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1A1D24'),
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1,
      transparent: true,
      opacity: 0.85,
    });
    for (const side of [-1, 1] as const) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 10, 24), mainMat);
      rim.position.set(side * 0.048, 0, 0);
      grp.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 24), lensMat);
      lens.position.set(side * 0.048, 0, 0.002);
      grp.add(lens);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 8), mainMat);
      arm.rotation.x = Math.PI * 0.5;
      arm.position.set(side * 0.086, 0.006, -0.065);
      grp.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.008, 0.008), metalMat);
    grp.add(bridge);
    return grp;
  }

  if (subtype === 'watch' || subtype === 'bracelet') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 12, 28), mainMat);
    strap.rotation.y = Math.PI * 0.5;
    strap.castShadow = true;
    grp.add(strap);

    if (subtype === 'watch') {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 28), metalMat);
      bezel.rotation.z = Math.PI * 0.5;
      bezel.position.set(0, 0.046, 0);
      grp.add(bezel);
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.029, 0.029, 0.015, 24),
        makeFabricMaterial('#121316', { roughness: 0.1, clearcoat: 1 }),
      );
      dial.rotation.z = Math.PI * 0.5;
      dial.position.set(0, 0.047, 0);
      grp.add(dial);
    }
    return grp;
  }

  if (subtype === 'cap' || subtype === 'bucket_hat' || subtype === 'beanie') {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mainMat,
    );
    crown.castShadow = true;
    grp.add(crown);
    if (subtype === 'cap') {
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.125, 0.012, 20, 1, false, -0.85, 1.7),
        mainMat,
      );
      visor.position.set(0, 0.006, 0.055);
      visor.rotation.x = 0.15;
      grp.add(visor);
    } else if (subtype === 'bucket_hat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.165, 0.035, 28, 1, true), mainMat);
      brim.position.y = -0.01;
      grp.add(brim);
    } else {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.022, 12, 26), mainMat);
      cuff.rotation.x = Math.PI * 0.5;
      grp.add(cuff);
    }
    return grp;
  }

  // Scarf / Silk scarf / Belt / Tie
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.032, 14, 30), mainMat);
  wrap.rotation.x = Math.PI * 0.5;
  wrap.castShadow = true;
  grp.add(wrap);
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.24, 0.016), mainMat);
  tailL.position.set(-0.045, -0.11, 0.12);
  tailL.rotation.z = 0.12;
  grp.add(tailL);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.18, 0.016), mainMat);
  tailR.position.set(0.05, -0.08, 0.13);
  tailR.rotation.z = -0.14;
  grp.add(tailR);

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
): OutfitSlotGroups {
  const root = new THREE.Group();
  const pedestal = new THREE.Group();
  const slotGroups: Partial<Record<SlotKey, THREE.Group>> = {};
  const basePositions: Partial<Record<SlotKey, THREE.Vector3>> = {};
  const explodedOffsets: Partial<Record<SlotKey, THREE.Vector3>> = {};
  const garmentsBySlot: Partial<Record<SlotKey, Garment>> = {};
  const interactiveMeshes: THREE.Object3D[] = [];

  // Luxury two-tier marble/metal turntable pedestal
  const plinthBot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.62, 0.045, 56),
    makeFabricMaterial('#1E1B18', { roughness: 0.3, metalness: 0.25, clearcoat: 0.6 }),
  );
  plinthBot.position.y = -0.024;
  plinthBot.receiveShadow = true;
  pedestal.add(plinthBot);

  const plinthTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.51, 0.025, 56),
    makeFabricMaterial('#F2EDE2', { roughness: 0.35, clearcoat: 0.5 }),
  );
  plinthTop.position.y = 0.01;
  plinthTop.receiveShadow = true;
  pedestal.add(plinthTop);

  const trimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.505, 0.008, 12, 64),
    makeMetalMaterial(accentHex),
  );
  trimRing.rotation.x = Math.PI * 0.5;
  trimRing.position.y = 0.022;
  pedestal.add(trimRing);

  // Minimal brushed-steel tailor center spine + subtle bust collar cap
  const rodMat = makeMetalMaterial('#9A9386');
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.54, 16), rodMat);
  spine.position.y = 0.77;
  pedestal.add(spine);
  const headCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 20, 14),
    makeFabricMaterial('#D8CFC0', { roughness: 0.45, clearcoat: 0.2 }),
  );
  headCap.position.y = 1.62;
  pedestal.add(headCap);

  root.add(pedestal);

  const placeSlot = (
    slot: SlotKey,
    garment: Garment | undefined,
    group: THREE.Group | null,
    base: THREE.Vector3,
    explode: THREE.Vector3,
  ) => {
    if (!garment || !group) return;
    group.position.copy(base);
    tagSlotInteractive(group, slot, interactiveMeshes);
    root.add(group);
    slotGroups[slot] = group;
    basePositions[slot] = base.clone();
    explodedOffsets[slot] = explode.clone();
    garmentsBySlot[slot] = garment;
  };

  const outer = slots.outerwear ? byId.get(slots.outerwear) : undefined;
  const dress = slots.dress ? byId.get(slots.dress) : undefined;
  const top = slots.top ? byId.get(slots.top) : undefined;
  const bottom = slots.bottom ? byId.get(slots.bottom) : undefined;
  const shoes = slots.shoes ? byId.get(slots.shoes) : undefined;
  const bag = slots.bag ? byId.get(slots.bag) : undefined;
  const acc1 = slots.accessory1 ? byId.get(slots.accessory1) : undefined;
  const acc2 = slots.accessory2 ? byId.get(slots.accessory2) : undefined;

  if (bottom && !dress) {
    const sub = detectGarmentSubtype(bottom.category, bottom.id, bottom.name_uz);
    placeSlot('bottom', bottom, buildBottomGroup(bottom, sub), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.04, -0.14));
  }
  if (dress) {
    const sub = detectGarmentSubtype(dress.category, dress.id, dress.name_uz);
    placeSlot('dress', dress, buildDressGroup(dress, sub), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.04, 0));
  } else if (top) {
    const sub = detectGarmentSubtype(top.category, top.id, top.name_uz);
    placeSlot('top', top, buildTopGroup(top, sub), new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(0, 0.14, 0.08));
  }
  if (outer) {
    const sub = detectGarmentSubtype(outer.category, outer.id, outer.name_uz);
    placeSlot('outerwear', outer, buildOuterwearGroup(outer, sub), new THREE.Vector3(0, 0.01, 0.015), new THREE.Vector3(-0.34, 0.06, 0.28));
  }
  if (shoes) {
    const sub = detectGarmentSubtype(shoes.category, shoes.id, shoes.name_uz);
    placeSlot('shoes', shoes, buildShoesGroup(shoes, sub), new THREE.Vector3(0, 0.01, 0), new THREE.Vector3(0, -0.06, 0.28));
  }
  if (bag) {
    const sub = detectGarmentSubtype(bag.category, bag.id, bag.name_uz);
    const isBackpack = sub === 'backpack';
    placeSlot(
      'bag',
      bag,
      buildBagGroup(bag, sub),
      isBackpack ? new THREE.Vector3(0, 1.04, -0.22) : new THREE.Vector3(0.42, 0.68, 0.14),
      isBackpack ? new THREE.Vector3(0, 0.1, -0.35) : new THREE.Vector3(0.32, 0.08, 0.16),
    );
  }
  if (acc1) {
    const sub = detectGarmentSubtype(acc1.category, acc1.id, acc1.name_uz);
    const base =
      sub === 'sunglasses' || sub === 'cap' || sub === 'bucket_hat' || sub === 'beanie'
        ? new THREE.Vector3(0, 1.69, 0.06)
        : new THREE.Vector3(-0.37, 0.85, 0.12);
    placeSlot('accessory1', acc1, buildAccessoryGroup(acc1, sub), base, new THREE.Vector3(-0.24, 0.14, 0.24));
  }
  if (acc2) {
    const sub = detectGarmentSubtype(acc2.category, acc2.id, acc2.name_uz);
    const base =
      sub === 'scarf' || sub === 'silk_scarf'
        ? new THREE.Vector3(0, 1.51, 0.02)
        : sub === 'sunglasses' || sub === 'cap' || sub === 'bucket_hat' || sub === 'beanie'
          ? new THREE.Vector3(0, 1.71, 0.06)
          : new THREE.Vector3(0.38, 0.90, 0.10);
    placeSlot('accessory2', acc2, buildAccessoryGroup(acc2, sub), base, new THREE.Vector3(0.24, 0.18, 0.22));
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
