import { readFile } from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

// Genera el QR de un link de Cámara Invitado como SVG, con el logo de J&M
// superpuesto al centro. Nivel de corrección 'H' (30% de tolerancia) permite
// tapar hasta ~1/4 del área con el logo sin que el QR deje de ser legible.
const LOGO_RATIO = 0.22; // logo ocupa ~22% del ancho del QR

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { token } = await req.json();
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Falta token' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jmdecoracionesyeventos.com';
  const targetUrl = `${siteUrl.replace(/\/$/, '')}/c/${token}`;

  const qrSvg = await QRCode.toString(targetUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: '#0a1628', light: '#ffffff' },
  });

  // Extrae el viewBox para calcular el tamaño/posición del logo en las mismas unidades
  const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const size = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 37;
  const logoSize = size * LOGO_RATIO;
  const logoPos = (size - logoSize) / 2;
  const padding = logoSize * 0.12;

  let logoDataUri = '';
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-watermark.png');
    const logoBuffer = await readFile(logoPath);
    logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    // Sin logo disponible: se devuelve el QR limpio, sin overlay
  }

  const logoOverlay = logoDataUri
    ? `<rect x="${logoPos - padding}" y="${logoPos - padding}" width="${logoSize + padding * 2}" height="${logoSize + padding * 2}" rx="${padding}" fill="#ffffff"/>` +
      `<image href="${logoDataUri}" x="${logoPos}" y="${logoPos}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  const finalSvg = qrSvg.replace('</svg>', `${logoOverlay}</svg>`);

  return NextResponse.json({ svg: finalSvg, url: targetUrl });
}
