// RUTA: apps/admin/src/lib/qrArtistico.ts
// Genera el QR "sello dorado J&M": el logo no se pega encima del código como
// una imagen plana con fondo blanco — cada punto dorado del QR y cada punto
// que dibuja el logo salen de la MISMA rejilla, así el logo se ve "hecho de"
// los módulos del código en vez de taparlos con un rectángulo sólido.
import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'node:path';

const DORADO = '#b8860b';
// Los módulos de DATOS van en azul marino oscuro, no dorado: el dorado
// (luminancia relativa ~0.53) resultó tener muy poco contraste sobre blanco
// para que los lectores de QR reales lo detecten de forma confiable —
// verificado escaneando con jsQR, un QR 100% dorado sin logo ya fallaba.
// El azul marino (luminancia ~0.08, casi como negro puro) sí escanea bien.
// El dorado se reserva para elementos puramente decorativos (el logo
// central, que ya vive dentro del margen de corrección de errores).
const OSCURO = '#0a1628';
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo-watermark.png');

interface Opts {
  /** Tamaño final del PNG cuadrado, en px. */
  size?: number;
}

/**
 * Genera el PNG del QR con el logo integrado como máscara de puntos.
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

  // El logo completo (diamante + círculo J&M + volutas + texto) no cabe
  // legible en los ~20 módulos de resolución que caben en el centro del QR
  // (el código típico de este proyecto son 37-41 módulos por lado) — a esa
  // resolución el diamante y el texto se vuelven ruido irreconocible. Se
  // recorta solo el círculo "J&M", el elemento más icónico y compacto,
  // en vez del bounding box completo del logo.
  const logoRecortado = await sharp(LOGO_PATH)
    .extract({ left: 116, top: 150, width: 395 - 116, height: 364 - 150 })
    .toBuffer();

  // Máscara del logo, remuestreada a la resolución de la rejilla de módulos
  // que cubre el centro del QR. Verificado empíricamente escaneando con jsQR:
  // aunque el nivel de corrección 'H' tolera ~30% de daño en teoría, ese
  // margen asume el daño disperso por toda la matriz — concentrado en un
  // bloque central, el límite real es mucho menor. En un QR de 37 módulos,
  // 12x12 (~10% del área) escanea de forma confiable; 14x14 (14.3%) ya
  // falla. Se usa ~26% del lado total (≈12 módulos en un QR de 45 con quiet
  // zone), con margen de seguridad frente a ese límite.
  const logoModulos = Math.round(totalModules * 0.30);
  const logoAlphaRaw = await sharp(logoRecortado)
    .resize(logoModulos, logoModulos, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data: logoPixels, info: logoInfo } = logoAlphaRaw;
  const logoOffsetModules = Math.floor((totalModules - logoModulos) / 2);

  const isLogoZone = (mx: number, my: number): boolean => {
    const lx = mx - logoOffsetModules;
    const ly = my - logoOffsetModules;
    return lx >= 0 && ly >= 0 && lx < logoModulos && ly < logoModulos;
  };
  const logoAlphaAt = (mx: number, my: number): number => {
    const lx = mx - logoOffsetModules;
    const ly = my - logoOffsetModules;
    const idx = (ly * logoInfo.width + lx) * logoInfo.channels + 3;
    return logoPixels[idx] / 255;
  };

  // Los finder patterns (los 3 cuadrados de esquina) también deben quedarse
  // en el color de máximo contraste: probado en dorado y el escaneo real
  // falla igual que con los módulos de datos — el algoritmo de binarización
  // del lector opera sobre la imagen completa, no solo localmente, así que
  // el bajo contraste del dorado también los afecta a ellos.
  const rects: string[] = [];

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const mx = col + quiet;
      const my = row + quiet;
      const cx = mx * cell + cell / 2;
      const cy = my * cell + cell / 2;

      if (isLogoZone(mx, my)) {
        const alpha = logoAlphaAt(mx, my);
        // Umbral binario y módulo cuadrado completo (sin redondeo): dejar
        // huecos/gaps entre módulos aquí es lo que rompía el escaneo real
        // (verificado con jsQR) — dentro de la zona del logo el módulo debe
        // ser tan "sólido" como cualquier módulo QR normal, todo o nada.
        if (alpha > 0.4) {
          rects.push(`<rect x="${(cx - cell * 0.5).toFixed(2)}" y="${(cy - cell * 0.5).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="${DORADO}"/>`);
        }
        continue;
      }

      if (!isDark(col, row)) continue;
      rects.push(`<rect x="${(cx - cell * 0.5).toFixed(2)}" y="${(cy - cell * 0.5).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="${OSCURO}"/>`);
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      ${rects.join('\n')}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
