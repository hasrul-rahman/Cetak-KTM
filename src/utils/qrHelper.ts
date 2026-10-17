import QRCode from 'qrcode';

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: {
        dark: '#064E3B',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

// Generate simple Code128 / Barcode SVG as data URL
export function generateBarcodeDataUrl(text: string): string {
  // Clean alphanumeric for barcode
  const clean = text.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const bars: number[] = [];
  
  // Deterministic bar widths based on char codes
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
  }
  bars.push(2, 1, 2, 3, 1, 2); // stop pattern

  let currentX = 10;
  const barElements: string[] = [];
  
  bars.forEach((width, index) => {
    const isBlack = index % 2 === 0;
    if (isBlack) {
      barElements.push(`<rect x="${currentX}" y="2" width="${width * 1.5}" height="36" fill="#064E3B"/>`);
    }
    currentX += width * 1.5;
  });

  const totalWidth = currentX + 10;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 50" width="${totalWidth}" height="50">
  <rect width="${totalWidth}" height="50" fill="#FFFFFF" rx="2"/>
  ${barElements.join('')}
  <text x="${totalWidth / 2}" y="47" font-family="monospace" font-size="8.5" font-weight="bold" fill="#064E3B" text-anchor="middle" letter-spacing="2">${clean}</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
