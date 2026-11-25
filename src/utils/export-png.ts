import { resolveAssetUrl } from '../data/manifest-loader';
import type { Category, Garment } from '../data/schema';
import type { HarmonyAnalysis } from '../engine/color';
import type { BoardSlots } from '../engine/stylist';
import { UZ } from '../i18n/uz';

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawVectorSilhouette(
  ctx: CanvasRenderingContext2D,
  category: Category,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  const scale = Math.min(w / 160, h / 200);
  const dx = x + (w - 160 * scale) / 2;
  const dy = y + (h - 200 * scale) / 2;
  ctx.translate(dx, dy);
  ctx.scale(scale, scale);

  ctx.fillStyle = color;
  ctx.strokeStyle = '#151412';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (category === 'outerwear') {
    ctx.moveTo(52, 24);
    ctx.lineTo(66, 18);
    ctx.lineTo(80, 28);
    ctx.lineTo(94, 18);
    ctx.lineTo(108, 24);
    ctx.lineTo(138, 44);
    ctx.lineTo(132, 118);
    ctx.lineTo(118, 116);
    ctx.lineTo(118, 58);
    ctx.lineTo(114, 178);
    ctx.lineTo(46, 178);
    ctx.lineTo(42, 58);
    ctx.lineTo(42, 116);
    ctx.lineTo(28, 118);
    ctx.lineTo(22, 44);
    ctx.closePath();
  } else if (category === 'top') {
    ctx.moveTo(54, 28);
    ctx.lineTo(106, 28);
    ctx.lineTo(136, 46);
    ctx.lineTo(128, 84);
    ctx.lineTo(112, 78);
    ctx.lineTo(112, 164);
    ctx.lineTo(48, 164);
    ctx.lineTo(48, 78);
    ctx.lineTo(32, 84);
    ctx.lineTo(24, 46);
    ctx.closePath();
  } else if (category === 'bottom') {
    ctx.moveTo(46, 24);
    ctx.lineTo(114, 24);
    ctx.lineTo(124, 176);
    ctx.lineTo(86, 176);
    ctx.lineTo(80, 86);
    ctx.lineTo(74, 176);
    ctx.lineTo(36, 176);
    ctx.closePath();
  } else if (category === 'dress') {
    ctx.moveTo(58, 24);
    ctx.lineTo(102, 24);
    ctx.lineTo(114, 54);
    ctx.lineTo(102, 74);
    ctx.lineTo(126, 178);
    ctx.lineTo(34, 178);
    ctx.lineTo(58, 74);
    ctx.lineTo(46, 54);
    ctx.closePath();
  } else if (category === 'shoes') {
    ctx.moveTo(42, 74);
    ctx.lineTo(74, 74);
    ctx.lineTo(78, 122);
    ctx.lineTo(126, 134);
    ctx.lineTo(134, 152);
    ctx.lineTo(34, 152);
    ctx.lineTo(40, 120);
    ctx.closePath();
  } else if (category === 'bag') {
    ctx.rect(34, 66, 92, 96);
  } else {
    ctx.moveTo(48, 40);
    ctx.lineTo(112, 40);
    ctx.lineTo(114, 122);
    ctx.lineTo(96, 122);
    ctx.lineTo(94, 72);
    ctx.lineTo(62, 72);
    ctx.lineTo(58, 158);
    ctx.lineTo(44, 158);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export async function exportBoardPng(
  slots: BoardSlots,
  byId: Map<string, Garment>,
  harmony: HarmonyAnalysis,
  title: string = UZ.atelier.exportTitle,
): Promise<void> {
  // 2x resolution editorial card (1200x1500 px)
  const W = 1200;
  const H = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Paper background
  ctx.fillStyle = '#F5F1E8';
  ctx.fillRect(0, 0, W, H);

  // Subtle paper frame
  ctx.strokeStyle = '#BDB39E';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  // Header masthead
  ctx.fillStyle = '#151412';
  ctx.font = 'italic 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Kapsula', 84, 128);

  ctx.fillStyle = '#655E53';
  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillText(title.toUpperCase(), 84, 162);

  // Score on top right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8F1D2C';
  ctx.font = '600 72px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(`${harmony.score}`, W - 84, 132);
  ctx.fillStyle = '#3B3731';
  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillText(`${harmony.schemeName.toUpperCase()} · ${harmony.label.toUpperCase()}`, W - 84, 162);
  ctx.textAlign = 'left';

  // Divider hairline
  ctx.strokeStyle = '#D8D0BF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(84, 192);
  ctx.lineTo(W - 84, 192);
  ctx.stroke();

  // Board layout coordinates
  const boxes: Array<{
    key: keyof BoardSlots;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [
    { key: 'outerwear', x: 84, y: 230, w: 320, h: 520 },
    { key: 'accessory1', x: 84, y: 774, w: 150, h: 190 },
    { key: 'accessory2', x: 254, y: 774, w: 150, h: 190 },
    ...(slots.dress
      ? [{ key: 'dress' as const, x: 438, y: 230, w: 324, h: 734 }]
      : [
          { key: 'top' as const, x: 438, y: 230, w: 324, h: 356 },
          { key: 'bottom' as const, x: 438, y: 608, w: 324, h: 356 },
        ]),
    { key: 'bag', x: 796, y: 230, w: 320, h: 356 },
    { key: 'shoes', x: 796, y: 608, w: 320, h: 356 },
  ];

  const placedGarments: Garment[] = [];

  for (const box of boxes) {
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#D8D0BF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    const gid = slots[box.key];
    const garment = gid ? byId.get(gid) : undefined;
    if (!garment) continue;
    placedGarments.push(garment);

    const loaded = await loadImageSafe(resolveAssetUrl(garment.image));
    const pad = 22;
    const maxW = box.w - pad * 2;
    const maxH = box.h - pad * 2;

    if (loaded) {
      const ratio = Math.min(maxW / loaded.width, maxH / loaded.height);
      const dw = loaded.width * ratio;
      const dh = loaded.height * ratio;
      ctx.save();
      ctx.shadowColor = 'rgba(21, 20, 18, 0.16)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(
        loaded,
        box.x + (box.w - dw) / 2,
        box.y + (box.h - dh) / 2,
        dw,
        dh,
      );
      ctx.restore();
    } else {
      drawVectorSilhouette(
        ctx,
        garment.category,
        garment.color,
        box.x + pad,
        box.y + pad,
        maxW,
        maxH,
      );
    }
  }

  // 60-30-10 Proportion Strip
  const barY = 1010;
  const barW = W - 168;
  let curX = 84;
  for (const slice of harmony.proportions) {
    const sw = Math.round(slice.share * barW);
    ctx.fillStyle = slice.hex;
    ctx.fillRect(curX, barY, sw, 18);
    curX += sw;
  }
  ctx.strokeStyle = '#D8D0BF';
  ctx.strokeRect(84, barY, barW, 18);

  // Garment list legend
  ctx.fillStyle = '#151412';
  ctx.font = '500 22px "Inter", sans-serif';
  let textY = 1080;
  for (const g of placedGarments.slice(0, 7)) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(96, textY - 7, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#151412';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#151412';
    ctx.fillText(g.name_uz, 120, textY);
    textY += 40;
  }

  // Footer colophon
  ctx.strokeStyle = '#D8D0BF';
  ctx.beginPath();
  ctx.moveTo(84, H - 104);
  ctx.lineTo(W - 84, H - 104);
  ctx.stroke();

  ctx.fillStyle = '#655E53';
  ctx.font = '400 18px "Inter", sans-serif';
  ctx.fillText(UZ.footer.colophon, 84, H - 68);

  const link = document.createElement('a');
  link.download = 'kapsula-kombinatsiya.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
