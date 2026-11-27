import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { Garment } from '../data/schema';
import type { BoardSlots, SlotKey } from '../engine/stylist';
import { buildOutfit3DScene, type OutfitSlotGroups } from '../engine/three-garment-builder';

export interface ThreeStudioCanvasProps {
  slots: BoardSlots;
  byId: Map<string, Garment>;
  rotYDeg: number;
  rotXDeg: number;
  zoom: number;
  exploded: boolean;
  autoSpin?: boolean;
  hoveredSlot: SlotKey | null;
  accentHex?: string;
  liveYawRef?: MutableRefObject<number>;
  onHoverSlot?: (slot: SlotKey | null, garment: Garment | null) => void;
  onSelectSlot?: (slot: SlotKey) => void;
  onUnavailable?: () => void;
}

/**
 * Generates a lightweight procedural studio HDR-like softbox environment via offscreen canvas + PMREM.
 */
function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#E8E1D3');

  const panelGeo = new THREE.PlaneGeometry(8, 5);
  const keyMat = new THREE.MeshBasicMaterial({ color: '#FFF6E8', side: THREE.DoubleSide });
  const keyPanel = new THREE.Mesh(panelGeo, keyMat);
  keyPanel.position.set(4, 5, 4);
  keyPanel.lookAt(0, 1, 0);
  envScene.add(keyPanel);

  const coolMat = new THREE.MeshBasicMaterial({ color: '#DCE8FF', side: THREE.DoubleSide });
  const coolPanel = new THREE.Mesh(panelGeo, coolMat);
  coolPanel.position.set(-5, 3, 2);
  coolPanel.lookAt(0, 1, 0);
  envScene.add(coolPanel);

  const rimGeo = new THREE.PlaneGeometry(7, 4);
  const rimMat = new THREE.MeshBasicMaterial({ color: '#FFEBD0', side: THREE.DoubleSide });
  const rimPanel = new THREE.Mesh(rimGeo, rimMat);
  rimPanel.position.set(0, 4, -5);
  rimPanel.lookAt(0, 1, 0);
  envScene.add(rimPanel);

  const rt = pmrem.fromScene(envScene, 0.04);
  panelGeo.dispose();
  rimGeo.dispose();
  keyMat.dispose();
  coolMat.dispose();
  rimMat.dispose();
  pmrem.dispose();
  return rt.texture;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m.dispose();
    }
  });
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function ThreeStudioCanvas({
  slots,
  byId,
  rotYDeg,
  rotXDeg,
  zoom,
  exploded,
  autoSpin = false,
  hoveredSlot,
  accentHex = '#8F1D2C',
  liveYawRef,
  onHoverSlot,
  onSelectSlot,
  onUnavailable,
}: ThreeStudioCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const camParamsRef = useRef({ rotYDeg, rotXDeg, zoom, exploded, autoSpin, hoveredSlot });
  camParamsRef.current = { rotYDeg, rotXDeg, zoom, exploded, autoSpin, hoveredSlot };
  const callbacksRef = useRef({ onHoverSlot, onSelectSlot, onUnavailable });
  callbacksRef.current = { onHoverSlot, onSelectSlot, onUnavailable };
  const liveYawTargetRef = useRef(liveYawRef);
  liveYawTargetRef.current = liveYawRef;

  const outfitRef = useRef<OutfitSlotGroups | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const wakeLoopRef = useRef<(() => void) | null>(null);
  const shadowNeedsUpdateRef = useRef(true);

  // Initialize Three.js WebGL context once on mount
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
      });
    } catch {
      callbacksRef.current.onUnavailable?.();
      return;
    }

    const gl = renderer.getContext();
    let isSoftwareGL = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      isSoftwareGL = /swiftshader|llvmpipe|software|basic render/i.test(rendererStr);
    } catch {
      isSoftwareGL = false;
    }

    renderer.setPixelRatio(isSoftwareGL ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = !isSoftwareGL;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const envTex = createStudioEnvironment(renderer);
    scene.environment = envTex;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      34,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      30,
    );
    camera.position.set(0, 1.05, 3.35);
    camera.lookAt(0, 0.86, 0);
    cameraRef.current = camera;

    // 3-Point Editorial Atelier Studio Lighting
    const hemi = new THREE.HemisphereLight('#FFFBF2', '#3B342D', 0.65);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF5E4', 2.25);
    keyLight.position.set(2.4, 3.8, 2.8);
    keyLight.castShadow = !isSoftwareGL;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#DCE8FF', 0.85);
    fillLight.position.set(-2.6, 1.8, 1.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#FFE2B8', 1.6);
    rimLight.position.set(-1.2, 2.6, -2.8);
    scene.add(rimLight);

    // Subtle reflective ground plane shadow catcher
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = -0.045;
    floor.receiveShadow = !isSoftwareGL;
    scene.add(floor);

    let rafId = 0;
    let isDisposed = false;
    let inViewport = true;
    let dirty = true;
    let explodeAlpha = camParamsRef.current.exploded ? 1 : 0;
    let curYaw = (camParamsRef.current.rotYDeg * Math.PI) / 180;
    let curPitch = (camParamsRef.current.rotXDeg * Math.PI) / 180;
    let curZoom = camParamsRef.current.zoom;
    let lastHoverSlot: SlotKey | null = null;
    let lastFrameAt = performance.now();
    let lastRenderAt = 0;
    let lastRenderCostMs = isSoftwareGL ? 32 : 8;
    const tempVec = new THREE.Vector3();

    const animate = (now: number) => {
      rafId = 0;
      if (isDisposed) return;
      if (document.hidden || !inViewport) return;

      const dt = Math.min(0.08, Math.max(0.001, (now - lastFrameAt) / 1000));
      lastFrameAt = now;

      const minIntervalMs = isSoftwareGL || lastRenderCostMs > 24 ? 95 : 33;
      const params = camParamsRef.current;

      // Throttle GPU/CPU work while maintaining buttery smooth turntable progression
      if (now - lastRenderAt < minIntervalMs && !dirty) {
        rafId = window.requestAnimationFrame(animate);
        return;
      }

      let moving = dirty;
      dirty = false;

      if (params.autoSpin) {
        curYaw += dt * 0.36;
        if (liveYawTargetRef.current) {
          liveYawTargetRef.current.current = normalizeDeg((curYaw * 180) / Math.PI);
        }
        moving = true;
      } else {
        const targetYaw = (params.rotYDeg * Math.PI) / 180;
        const yawDiff = Math.atan2(Math.sin(targetYaw - curYaw), Math.cos(targetYaw - curYaw));
        if (Math.abs(yawDiff) > 0.002) {
          curYaw += yawDiff * 0.24;
          moving = true;
        } else {
          curYaw = targetYaw;
        }
        if (liveYawTargetRef.current) {
          liveYawTargetRef.current.current = normalizeDeg(params.rotYDeg);
        }
      }

      const targetPitch = (params.rotXDeg * Math.PI) / 180;
      const pitchDiff = targetPitch - curPitch;
      if (Math.abs(pitchDiff) > 0.002) {
        curPitch += pitchDiff * 0.24;
        moving = true;
      } else {
        curPitch = targetPitch;
      }

      const zoomDiff = params.zoom - curZoom;
      if (Math.abs(zoomDiff) > 0.002) {
        curZoom += zoomDiff * 0.2;
        moving = true;
      } else {
        curZoom = params.zoom;
      }

      const targetExplode = params.exploded ? 1 : 0;
      const expDiff = targetExplode - explodeAlpha;
      if (Math.abs(expDiff) > 0.004) {
        explodeAlpha += expDiff * 0.18;
        shadowNeedsUpdateRef.current = true;
        moving = true;
      } else {
        explodeAlpha = targetExplode;
      }

      const radius = 3.25 / Math.max(0.65, curZoom);
      const lookY = 0.85;
      camera.position.x = Math.sin(curYaw) * Math.cos(curPitch) * radius;
      camera.position.y = lookY + Math.sin(curPitch) * radius + 0.14;
      camera.position.z = Math.cos(curYaw) * Math.cos(curPitch) * radius;
      camera.lookAt(0, lookY, 0);

      const outfit = outfitRef.current;
      const hoverChanged = params.hoveredSlot !== lastHoverSlot;
      if (hoverChanged) {
        lastHoverSlot = params.hoveredSlot;
        moving = true;
      }

      if (outfit) {
        for (const [slotKey, grp] of Object.entries(outfit.slotGroups)) {
          const sk = slotKey as SlotKey;
          if (!grp) continue;
          const base = outfit.basePositions[sk];
          const off = outfit.explodedOffsets[sk];
          if (base && off) {
            tempVec.copy(base).addScaledVector(off, explodeAlpha);
            if (grp.position.distanceToSquared(tempVec) > 0.00001) {
              grp.position.lerp(tempVec, 0.24);
              moving = true;
            }
          }

          if (hoverChanged || shadowNeedsUpdateRef.current) {
            const isHov = params.hoveredSlot === sk;
            grp.traverse((node) => {
              const m = node as THREE.Mesh;
              if (!m.isMesh) return;
              const mat = m.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
              if (mat && 'emissive' in mat) {
                mat.emissive.set(isHov ? '#3D2618' : '#000000');
                mat.emissiveIntensity = isHov ? 0.45 : 0;
              }
            });
          }
        }
      }

      if (shadowNeedsUpdateRef.current && renderer.shadowMap.enabled) {
        renderer.shadowMap.needsUpdate = true;
        shadowNeedsUpdateRef.current = false;
      }

      const t0 = performance.now();
      renderer.render(scene, camera);
      lastRenderCostMs = performance.now() - t0;
      lastRenderAt = now;

      if (params.autoSpin || moving) {
        rafId = window.requestAnimationFrame(animate);
      }
    };

    const wakeLoop = () => {
      dirty = true;
      if (!rafId && !isDisposed && !document.hidden && inViewport) {
        lastFrameAt = performance.now();
        rafId = window.requestAnimationFrame(animate);
      }
    };
    wakeLoopRef.current = wakeLoop;

    const setSize = () => {
      if (!host || isDisposed) return;
      const w = Math.max(120, host.clientWidth);
      const h = Math.max(120, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      wakeLoop();
    };
    setSize();

    const resizeObs =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => setSize()) : null;
    resizeObs?.observe(host);

    const ioObs =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              inViewport = entries.some((entry) => entry.isIntersecting);
              if (inViewport) wakeLoop();
            },
            { rootMargin: '80px' },
          )
        : null;
    ioObs?.observe(host);

    const onVisChange = () => {
      if (!document.hidden && inViewport) wakeLoop();
    };
    document.addEventListener('visibilitychange', onVisChange);

    // Raycaster for garment hover & click
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const hitTest = (clientX: number, clientY: number): SlotKey | null => {
      const outfit = outfitRef.current;
      if (!outfit || outfit.interactiveMeshes.length === 0) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(outfit.interactiveMeshes, false);
      for (const h of hits) {
        const slot = h.object.userData.slot as SlotKey | undefined;
        if (slot) return slot;
      }
      return null;
    };

    const onPtrDown = (ev: globalThis.PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };
    const onPtrMove = (ev: globalThis.PointerEvent) => {
      if (ev.buttons !== 0) return;
      const slot = hitTest(ev.clientX, ev.clientY);
      const g = slot ? outfitRef.current?.garmentsBySlot[slot] ?? null : null;
      callbacksRef.current.onHoverSlot?.(slot, g);
    };
    const onPtrUp = (ev: globalThis.PointerEvent) => {
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) <= 5) {
        const slot = hitTest(ev.clientX, ev.clientY);
        if (slot) callbacksRef.current.onSelectSlot?.(slot);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPtrDown);
    renderer.domElement.addEventListener('pointermove', onPtrMove);
    renderer.domElement.addEventListener('pointerup', onPtrUp);

    wakeLoop();

    return () => {
      isDisposed = true;
      wakeLoopRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      resizeObs?.disconnect();
      ioObs?.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      renderer.domElement.removeEventListener('pointerdown', onPtrDown);
      renderer.domElement.removeEventListener('pointermove', onPtrMove);
      renderer.domElement.removeEventListener('pointerup', onPtrUp);
      if (outfitRef.current) {
        disposeObjectTree(outfitRef.current.root);
        scene.remove(outfitRef.current.root);
        outfitRef.current = null;
      }
      floor.geometry.dispose();
      floorMat.dispose();
      envTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  // Wake render loop cleanly when camera, spin, explode, or hover changes
  useEffect(() => {
    wakeLoopRef.current?.();
  }, [rotYDeg, rotXDeg, zoom, exploded, autoSpin, hoveredSlot]);

  // Rebuild Three.js outfit geometry cleanly whenever slots or accent changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (outfitRef.current) {
      disposeObjectTree(outfitRef.current.root);
      scene.remove(outfitRef.current.root);
    }
    const built = buildOutfit3DScene(slots, byId, accentHex);
    outfitRef.current = built;
    scene.add(built.root);
    shadowNeedsUpdateRef.current = true;
    wakeLoopRef.current?.();
  }, [slots, byId, accentHex]);

  return <div ref={hostRef} className="relative z-10 h-full w-full" />;
}
