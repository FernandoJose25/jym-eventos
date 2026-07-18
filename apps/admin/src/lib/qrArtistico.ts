// RUTA: apps/admin/src/lib/qrArtistico.ts
// Genera el QR "sello dorado J&M": matriz de módulos 100% dorada con el
// círculo J&M superpuesto en el centro sobre un halo blanco, al estilo de
// un QR con logo estándar. Verificado con jsQR: el logo "esculpido" en los
// propios módulos (técnica anterior) obligaba a elegir entre un logo
// legible que tapaba demasiados módulos y fallaba el escaneo, o un logo
// tan chico que "J&M" se volvía irreconocible — el overlay sólido con
// margen blanco da máxima legibilidad en ambos frentes a la vez, porque
// la corrección de errores 'H' reconstruye los módulos que el halo tapa.
import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'node:path';

// Dorado oscurecido (no el #b8860b de la referencia visual): a simple
// vista se lee igual de "dorado", pero da el contraste mínimo necesario
// sobre blanco. Verificado con jsQR contra un lote de URLs de distinto
// largo (que generan distintas versiones de QR): con #b8860b puro ya
// fallaba el escaneo en algunas de ellas, incluso SIN logo — el problema
// es el tono en sí. #a3760a es el punto más claro que escaneó el 100%
// del lote de prueba.
const DORADO = '#a3760a';
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo-watermark.png');
// Círculo J&M compacto (sin el texto "DECORACIONES Y EVENTOS" ni las
// volutas laterales) — recorte cuadrado dentro del lienzo 512x512 del PNG.
const LOGO_BOX = { left: 190, top: 200, width: 320 - 190, height: 330 - 200 };

interface Opts {
  /** Tamaño final del PNG cuadrado, en px. */
  size?: number;
}

/**
 * Genera el PNG del QR sello dorado con el círculo J&M superpuesto.
 * data: contenido a codificar (la URL de la cámara del invitado).
 */
export async function generarQrArtistico(data: string, { size = 1000 }: Opts = {}): Promise<Buffer> {
  const qrData = QRCode.create(data, { errorCorrectionLevel: 'H' });
  // OJO: qrData.modules.data es un array PLANO indexado como [row*size+col]
  // (fila primero). No usar modules.get(x, y) — su firma real es
  // get(row, col), es decir get(y, x); llamarlo con (x, y) devuelve la
  // matriz TRANSPUESTA, que produce un QR que se ve bien pero no escanea.
  const { size: count, data: moduleData } = qrData.modules;
  const isDark = (col: number, row: number): boolean => !!moduleData[row * count + col];

  const quiet = 4; // módulos de margen blanco alrededor
  const totalModules = count + quiet * 2;
  const cell = size / totalModules;

  const rects: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!isDark(col, row)) continue;
      const mx = col + quiet;
      const my = row + quiet;
      const cx = mx * cell + cell / 2;
      const cy = my * cell + cell / 2;
      rects.push(`<rect x="${(cx - cell * 0.5).toFixed(2)}" y="${(cy - cell * 0.5).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="${DORADO}"/>`);
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      ${rects.join('\n')}
    </svg>
  `;
  const qrPng = await sharp(Buffer.from(svg)).png().toBuffer();

  // Logo sólido superpuesto (no "esculpido" en los módulos): 30% del
  // ancho del QR, verificado con jsQR que sigue escaneando gracias a la
  // corrección de errores 'H' — a partir de ~35% empieza a fallar en
  // URLs largas que ya usan una versión de QR más densa.
  const logoSize = Math.round(size * 0.28);
  const logoResized = await sharp(LOGO_PATH)
    .extract(LOGO_BOX)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const haloSize = Math.round(logoSize * 1.18);
  const halo = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${haloSize}" height="${haloSize}"><circle cx="${haloSize / 2}" cy="${haloSize / 2}" r="${haloSize / 2}" fill="#ffffff"/></svg>`)
  ).png().toBuffer();

  return sharp(qrPng)
    .composite([
      { input: halo, gravity: 'center' },
      { input: logoResized, gravity: 'center' },
    ])
    .png()
    .toBuffer();
}
