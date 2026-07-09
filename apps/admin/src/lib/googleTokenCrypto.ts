import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifra/descifra los refresh_token de Google Photos antes de guardarlos en
 * Firestore. Esto es necesario porque las reglas actuales de Firestore
 * (`allow read: if true`) hacen público TODO el proyecto — así que aunque
 * guardemos el token en una colección "oculta", cualquiera podría leerlo
 * directamente vía el SDK cliente o la REST API de Firestore si no está
 * cifrado. Con AES-256-GCM, el documento es público pero inútil sin la
 * clave, que solo vive en la variable de entorno del servidor.
 *
 * Requiere GOOGLE_PHOTOS_TOKEN_ENCRYPTION_KEY: 32 bytes en base64.
 * Generar una con: `openssl rand -base64 32`
 */

function getKey(): Buffer {
  const raw = process.env.GOOGLE_PHOTOS_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('Falta configurar GOOGLE_PHOTOS_TOKEN_ENCRYPTION_KEY en el servidor');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('GOOGLE_PHOTOS_TOKEN_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64');
  }
  return key;
}

export function encryptToken(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12); // GCM recomienda IV de 12 bytes
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Formato almacenado: iv.authTag.ciphertext (todo en base64)
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptToken(stored: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = stored.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token cifrado con formato inválido');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
