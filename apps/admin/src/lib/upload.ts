import { getToken } from '@/lib/get-token';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Sube un archivo ya procesado (recorte, marca de agua, filtros…) a
 * Cloudinary vía firma del servidor, con fallback a Firebase Storage si
 * Cloudinary no está configurado. Comparte el mismo pipeline que usa
 * ImageUploader para que los archivos re-subidos en lote o desde el editor
 * de video terminen en el mismo storage que las subidas normales.
 */
export async function uploadFile(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  const token = await getToken();
  const signRes = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileSize: file.size, fileType: file.type, folder }),
  });

  if (signRes.ok) {
    const { timestamp, signature, apiKey, cloudName } = await signRes.json();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? 'video' : 'image'}/upload`;

    return new Promise<string>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url);
        else {
          try { reject(new Error(JSON.parse(xhr.responseText)?.error?.message || `Error ${xhr.status}`)); }
          catch { reject(new Error(`Error HTTP ${xhr.status}`)); }
        }
      };
      xhr.onerror = () => reject(new Error('Error de red'));
      xhr.onabort = () => reject(new Error('Subida cancelada'));
      xhr.send(form);
    });
  }

  // Fallback: Firebase Storage
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${folder}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  return new Promise<string>((resolve, reject) => {
    // El nombre incluye Date.now(), nunca se reutiliza: caché inmutable de 1 año
    const task = uploadBytesResumable(storageRef, file, {
      cacheControl: 'public, max-age=31536000, immutable',
    });
    task.on('state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
    );
  });
}
