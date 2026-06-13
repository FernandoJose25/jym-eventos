// Firmas de bytes de archivos peligrosos que nunca deben subirse
const BLOCKED_SIGNATURES: number[][] = [
  [0x4D, 0x5A],             // .exe .dll .com (Windows PE)
  [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux/Unix binaries)
  [0x50, 0x4B, 0x03, 0x04], // .zip .jar .apk .docx .xlsx
  [0x50, 0x4B, 0x05, 0x06], // ZIP empty
  [0x50, 0x4B, 0x07, 0x08], // ZIP spanned
  [0x52, 0x61, 0x72, 0x21], // .rar
  [0x1F, 0x8B],             // .gz .tar.gz
  [0x42, 0x5A, 0x68],       // .bz2
  [0x37, 0x7A, 0xBC, 0xAF], // .7z
  [0x23, 0x21],             // shebang (#!) — scripts de shell
  [0xCA, 0xFE, 0xBA, 0xBE], // Java .class
  [0xFE, 0xED, 0xFA, 0xCE], // Mach-O 32-bit (macOS binary)
  [0xFE, 0xED, 0xFA, 0xCF], // Mach-O 64-bit
];

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'mp4', 'webm', 'mov'];

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export async function validateFile(file: File): Promise<ValidationResult> {
  // 1. Validar extensión (fuente de verdad principal)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `Extensión no permitida: .${ext}` };
  }

  // 2. Validar MIME type — permitir application/octet-stream (archivos enviados como
  //    documento en WhatsApp) si la extensión ya pasó la validación anterior
  const mimeOk = ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p))
    || file.type === 'application/octet-stream'
    || file.type === '';
  if (!mimeOk) return { ok: false, reason: `Tipo MIME no permitido: ${file.type}` };


  // 3. Validar magic bytes (primeros 8 bytes del archivo real)
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isBlocked = BLOCKED_SIGNATURES.some(sig =>
    sig.every((byte, i) => bytes[i] === byte),
  );
  if (isBlocked) {
    return { ok: false, reason: 'El contenido del archivo no está permitido' };
  }

  return { ok: true };
}
