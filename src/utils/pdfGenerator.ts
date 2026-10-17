import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import JSZip from 'jszip';
import { Student } from '../types';

// Standard CR80 ID Card dimensions in millimeters (ISO/IEC 7810 ID-1)
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;

export interface BatchPrintOptions {
  mode: 'cr80-duplex' | 'cr80-front-only' | 'a4-grid';
  includeCropMarks?: boolean;
}

/**
 * Wait for all images inside an element to fully load before capturing
 */
async function waitForElementImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const onDone = () => {
          img.removeEventListener('load', onDone);
          img.removeEventListener('error', onDone);
          resolve();
        };
        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
        // Safety timeout to never hang
        setTimeout(resolve, 3000);
      });
    })
  );

  // Wait for document fonts if supported
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Ignore font loading errors
  }

  // Allow browser a frame to paint
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 60)));
}

/**
 * Convert HTML Canvas to crisp JPG Blob with solid white background (avoids transparent black artifacts)
 */
export function canvasToJpgBlob(canvas: HTMLCanvasElement, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const jpgCanvas = document.createElement('canvas');
      jpgCanvas.width = canvas.width;
      jpgCanvas.height = canvas.height;
      const ctx = jpgCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Fill solid white background first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(canvas, 0, 0);

      jpgCanvas.toBlob(
        blob => {
          if (blob) resolve(blob);
          else reject(new Error('Gagal mengonversi canvas ke format JPG'));
        },
        'image/jpeg',
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Convert Blob to Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Trigger file download directly in browser
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * High-resolution canvas rendering of a card element (3x scale ≈ 450 DPI)
 */
export async function renderCardToCanvas(el: HTMLElement, scale = 3): Promise<HTMLCanvasElement> {
  await waitForElementImages(el);

  return await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    imageTimeout: 12000
  });
}

/**
 * Generate Single Card PDF (CR80 format, Duplex or Front-only)
 */
export async function generateSingleCardPdf(
  frontEl: HTMLElement,
  backEl: HTMLElement | null,
  student: Student,
  includeBack: boolean = true
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM]
  });

  // Render front
  const frontCanvas = await renderCardToCanvas(frontEl, 3);
  const frontBlob = await canvasToJpgBlob(frontCanvas, 0.95);
  const frontImgData = await blobToDataUrl(frontBlob);
  pdf.addImage(frontImgData, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

  // Render back if requested and available
  if (includeBack && backEl) {
    pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
    const backCanvas = await renderCardToCanvas(backEl, 3);
    const backBlob = await canvasToJpgBlob(backCanvas, 0.95);
    const backImgData = await blobToDataUrl(backBlob);
    pdf.addImage(backImgData, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
  }

  const cleanName = student.nama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  pdf.save(`KTM_${student.nim}_${cleanName}.pdf`);
}

/**
 * Download single card side as high-resolution JPG
 */
export async function generateSingleCardJpg(
  el: HTMLElement,
  student: Student,
  side: 'front' | 'back'
): Promise<void> {
  const canvas = await renderCardToCanvas(el, 3);
  const blob = await canvasToJpgBlob(canvas, 0.96);
  const cleanName = student.nama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const sideName = side === 'front' ? 'DEPAN' : 'BELAKANG';
  triggerFileDownload(blob, `KTM_${sideName}_${student.nim}_${cleanName}.jpg`);
}

/**
 * Download single student card as ZIP containing both Front and Back JPGs
 */
export async function generateSingleCardZip(
  frontEl: HTMLElement,
  backEl: HTMLElement | null,
  student: Student
): Promise<void> {
  const zip = new JSZip();
  const cleanName = student.nama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);

  // Front JPG
  const frontCanvas = await renderCardToCanvas(frontEl, 3);
  const frontBlob = await canvasToJpgBlob(frontCanvas, 0.96);
  zip.file(`KTM_01_DEPAN_${student.nim}_${cleanName}.jpg`, frontBlob);

  // Back JPG
  if (backEl) {
    const backCanvas = await renderCardToCanvas(backEl, 3);
    const backBlob = await canvasToJpgBlob(backCanvas, 0.96);
    zip.file(`KTM_02_BELAKANG_${student.nim}_${cleanName}.jpg`, backBlob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  triggerFileDownload(zipBlob, `KTM_${student.nim}_${cleanName}_JPG.zip`);
}

/**
 * Generate Batch PDF for multiple students (A4 sheet or CR80 card-by-card)
 */
export async function generateBatchPdf(
  cardPairs: Array<{ front: HTMLElement; back: HTMLElement; student: Student }>,
  options: BatchPrintOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const total = cardPairs.length;
  if (total === 0) return;

  if (options.mode === 'a4-grid') {
    // Generate A4 Sheet layout: 2 cols x 4 rows = up to 8 cards per page
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4' // 210 x 297 mm
    });

    const marginX = 14;
    const marginY = 18;
    const spacingX = 10;
    const spacingY = 14;
    const cols = 2;
    const rows = 4;
    const cardsPerPage = cols * rows;

    for (let i = 0; i < total; i++) {
      if (onProgress) onProgress(i + 1, total * 2);
      const pair = cardPairs[i];
      const slotOnPage = i % cardsPerPage;

      if (i > 0 && slotOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      const col = slotOnPage % cols;
      const row = Math.floor(slotOnPage / cols);

      const x = marginX + col * (CARD_WIDTH_MM + spacingX);
      const y = marginY + row * (CARD_HEIGHT_MM + spacingY);

      // Render front
      const frontCanvas = await renderCardToCanvas(pair.front, 2.5);
      const frontBlob = await canvasToJpgBlob(frontCanvas, 0.92);
      const frontImg = await blobToDataUrl(frontBlob);
      pdf.addImage(frontImg, 'JPEG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

      // Draw Crop Marks if enabled
      if (options.includeCropMarks) {
        drawCropMarks(pdf, x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    // Append back cards page if duplex mode
    pdf.addPage('a4', 'portrait');
    for (let i = 0; i < total; i++) {
      if (onProgress) onProgress(total + i + 1, total * 2);
      const pair = cardPairs[i];
      const slotOnPage = i % cardsPerPage;

      if (i > 0 && slotOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Invert columns so duplex printing aligns when paper is turned
      const col = (cols - 1) - (slotOnPage % cols);
      const row = Math.floor(slotOnPage / cols);

      const x = marginX + col * (CARD_WIDTH_MM + spacingX);
      const y = marginY + row * (CARD_HEIGHT_MM + spacingY);

      const backCanvas = await renderCardToCanvas(pair.back, 2.5);
      const backBlob = await canvasToJpgBlob(backCanvas, 0.92);
      const backImg = await blobToDataUrl(backBlob);
      pdf.addImage(backImg, 'JPEG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

      if (options.includeCropMarks) {
        drawCropMarks(pdf, x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    pdf.save(`KTM_IAIN_Pontianak_A4_Grid_${total}_Mahasiswa.pdf`);
    return;
  }

  // Standard CR80 Card-by-Card PDF (for PVC ID Card Printers)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM]
  });

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const pair = cardPairs[i];

    if (i > 0) {
      pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
    }

    // Front
    const frontCanvas = await renderCardToCanvas(pair.front, 3);
    const frontBlob = await canvasToJpgBlob(frontCanvas, 0.95);
    const frontImg = await blobToDataUrl(frontBlob);
    pdf.addImage(frontImg, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');

    // Back (if duplex)
    if (options.mode === 'cr80-duplex') {
      pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
      const backCanvas = await renderCardToCanvas(pair.back, 3);
      const backBlob = await canvasToJpgBlob(backCanvas, 0.95);
      const backImg = await blobToDataUrl(backBlob);
      pdf.addImage(backImg, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
    }
  }

  pdf.save(`KTM_IAIN_Pontianak_Batch_${total}_Mahasiswa.pdf`);
}

/**
 * Generate Batch JPGs packaged in a ZIP archive for multiple students
 */
export async function generateBatchJpgZip(
  cardPairs: Array<{ front: HTMLElement; back: HTMLElement; student: Student }>,
  options: { includeBack?: boolean },
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const total = cardPairs.length;
  if (total === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('KTM_IAIN_Pontianak_JPG') || zip;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);
    const pair = cardPairs[i];
    const indexStr = String(i + 1).padStart(2, '0');
    const cleanName = pair.student.nama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);

    // Front JPG
    const frontCanvas = await renderCardToCanvas(pair.front, 3);
    const frontBlob = await canvasToJpgBlob(frontCanvas, 0.95);
    folder.file(`${indexStr}_KTM_DEPAN_${pair.student.nim}_${cleanName}.jpg`, frontBlob);

    // Back JPG (if requested)
    if (options.includeBack !== false && pair.back) {
      const backCanvas = await renderCardToCanvas(pair.back, 3);
      const backBlob = await canvasToJpgBlob(backCanvas, 0.95);
      folder.file(`${indexStr}_KTM_BELAKANG_${pair.student.nim}_${cleanName}.jpg`, backBlob);
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  triggerFileDownload(zipBlob, `KTM_IAIN_Pontianak_JPG_Batch_${total}_Mahasiswa.zip`);
}

function drawCropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number): void {
  const markLen = 3;
  const offset = 1.5;

  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.2);

  // Top-left
  pdf.line(x - offset - markLen, y, x - offset, y);
  pdf.line(x, y - offset - markLen, x, y - offset);

  // Top-right
  pdf.line(x + w + offset, y, x + w + offset + markLen, y);
  pdf.line(x + w, y - offset - markLen, x + w, y - offset);

  // Bottom-left
  pdf.line(x - offset - markLen, y + h, x - offset, y + h);
  pdf.line(x, y + h + offset, x, y + h + offset + markLen);

  // Bottom-right
  pdf.line(x + w + offset, y + h, x + w + offset + markLen, y + h);
  pdf.line(x + w, y + h + offset, x + w, y + h + offset + markLen);
}

