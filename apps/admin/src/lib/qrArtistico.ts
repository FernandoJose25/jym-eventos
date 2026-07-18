// RUTA: apps/admin/src/lib/qrArtistico.ts
// Genera el QR "sello dorado J&M": matriz de módulos 100% dorada con el
// logo completo (diamante + J&M + volutas + "Decoraciones y Eventos")
// superpuesto en el centro sobre un halo blanco, al estilo de un QR con
// logo estándar. Verificado con jsQR: el logo "esculpido" en los propios
// módulos (técnica anterior) obligaba a elegir entre un logo legible que
// tapaba demasiados módulos y fallaba el escaneo, o uno tan chico que el
// texto se volvía irreconocible — el overlay sólido con margen blanco da
// máxima legibilidad en ambos frentes, porque la corrección de errores
// 'H' reconstruye los módulos que el halo tapa.
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
// Logo completo (diamante + círculo J&M + volutas + texto) dentro del
// lienzo 512x512 del PNG — franja ancha, no cuadrada.
const LOGO_BOX = { left: 17, top: 150, width: 499 - 17, height: 365 - 150 };

interface Opts {
  /** Tamaño final del PNG cuadrado, en px. */
  size?: number;
}

/**
 * Genera el PNG del QR sello dorado con el logo J&M superpuesto.
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

  // Logo sólido superpuesto (no "esculpido" en los módulos): 35% del
  // ancho del QR, verificado con jsQR que sigue escaneando gracias a la
  // corrección de errores 'H' — a partir de ~38% empieza a fallar en
  // URLs cortas que generan una versión de QR menos densa.
  const logoAspect = LOGO_BOX.width / LOGO_BOX.height;
  const logoW = Math.round(size * 0.35);
  const logoH = Math.round(logoW / logoAspect);
  const logoResized = await sharp(LOGO_PATH)
    .extract(LOGO_BOX)
    .resize(logoW, logoH, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Halo en forma de "píldora" (rectángulo con esquinas muy redondeadas):
  // el logo es una franja ancha, un halo circular dejaría las esquinas
  // del texto pegadas al borde o el halo desperdiciaría espacio arriba/abajo.
  const haloW = Math.round(logoW * 1.15);
  const haloH = Math.round(logoH * 1.35);
  const halo = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${haloW}" height="${haloH}"><rect width="${haloW}" height="${haloH}" rx="${Math.round(haloH * 0.25)}" fill="#ffffff"/></svg>`)
  ).png().toBuffer();

  // Posiciones explícitas (left/top) en vez de gravity:'center': con
  // gravity, sharp centra cada capa por separado usando el tamaño del
  // lienzo base — más frágil entre binarios sharp distintos (local vs.
  // Lambda de Vercel) que anclar ambas capas al mismo punto calculado a mano.
  const haloLeft = Math.round((size - haloW) / 2);
  const haloTop = Math.round((size - haloH) / 2);
  const logoLeft = Math.round((size - logoW) / 2);
  const logoTop = Math.round((size - logoH) / 2);

  return sharp(qrPng)
    .composite([
      { input: halo, left: haloLeft, top: haloTop },
      { input: logoResized, left: logoLeft, top: logoTop },
    ])
    .png()
    .toBuffer();
}
