// RUTA: apps/admin/src/lib/qrArtistico.ts
// Genera el QR "sello dorado J&M": el logo no se pega encima del código como
// una imagen plana con fondo blanco — cada punto dorado del QR y cada punto
// que dibuja el logo salen de la MISMA rejilla, así el logo se ve "hecho de"
// los módulos del código en vez de taparlos con un rectángulo sólido.
import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'node:path';

const DORADO = '#b8860b';
// ADVERTENCIA DE DISEÑO, NO BUG: por pedido explícito, este QR es 100%
// dorado (incluidos los finder patterns de esquina) para acercarse a una
// referencia visual. El dorado (luminancia relativa ~0.53, casi gris medio)
// tiene mucho menos contraste que el negro sobre fondo blanco — verificado
// escaneando con jsQR, un QR así falla en ese lector. Es posible que
// algunos celulares SÍ lo lean igual (los lectores de cámara reales suelen
// ser más tolerantes que una librería de testing), pero no está garantizado.
// Probar escaneando con celular real antes de imprimir en cantidad para un
// evento — si falla, subir CONTRASTE_SEGURO a true vuelve a los módulos de
// datos a un color oscuro, manteniendo el logo dorado en el centro.
const CONTRASTE_SEGURO = false;
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

  // Bounding box real del logo dentro del lienzo 512x512 — recortado para
  // no desperdiciar resolución en el margen transparente. Con
  // CONTRASTE_SEGURO=true, solo el círculo J&M (compacto, cuadrado, dentro
  // del margen de escaneo verificado). Con false, el logo completo (diamante
  // + círculo + volutas + texto) es una franja ANCHA, no cuadrada — la zona
  // del logo en el QR también debe ser rectangular para que no quede
  // aplastado con márgenes vacíos arriba/abajo.
  const logoBox = CONTRASTE_SEGURO
    ? { left: 116, top: 150, width: 395 - 116, height: 364 - 150 } // círculo J&M
    : { left: 17, top: 150, width: 499 - 17, height: 365 - 150 }; // logo completo
  const logoRecortado = await sharp(LOGO_PATH).extract(logoBox).toBuffer();

  // Máscara del logo, remuestreada a la resolución de la rejilla de módulos.
  // Verificado empíricamente escaneando con jsQR: aunque el nivel de
  // corrección 'H' tolera ~30% de daño en teoría, ese margen asume el daño
  // disperso por toda la matriz — concentrado en un bloque, el límite real
  // es mucho menor (12x12 de 37 escanea, 14x14 ya falla). En modo "parecido
  // a la referencia" se prioriza el tamaño visual sobre ese margen de
  // seguridad (advertencia arriba) — la franja ancha ocupa más columnas que
  // filas, pero en total módulos es comparable al caso cuadrado verificado.
  const logoAspect = logoBox.width / logoBox.height;
  const logoAltoModulos = Math.round(totalModules * 0.30);
  const logoAnchoModulos = CONTRASTE_SEGURO ? logoAltoModulos : Math.round(logoAltoModulos * logoAspect);
  const logoAlphaRaw = await sharp(logoRecortado)
    .resize(logoAnchoModulos, logoAltoModulos, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data: logoPixels, info: logoInfo } = logoAlphaRaw;
  const logoOffsetX = Math.floor((totalModules - logoAnchoModulos) / 2);
  const logoOffsetY = Math.floor((totalModules - logoAltoModulos) / 2);

  const isLogoZone = (mx: number, my: number): boolean => {
    const lx = mx - logoOffsetX;
    const ly = my - logoOffsetY;
    return lx >= 0 && ly >= 0 && lx < logoAnchoModulos && ly < logoAltoModulos;
  };
  const logoAlphaAt = (mx: number, my: number): number => {
    const lx = mx - logoOffsetX;
    const ly = my - logoOffsetY;
    const idx = (ly * logoInfo.width + lx) * logoInfo.channels + 3;
    return logoPixels[idx] / 255;
  };

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
      const color = CONTRASTE_SEGURO ? OSCURO : DORADO;
      rects.push(`<rect x="${(cx - cell * 0.5).toFixed(2)}" y="${(cy - cell * 0.5).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="${color}"/>`);
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
