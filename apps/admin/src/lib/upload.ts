import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Sube un archivo ya procesado (recorte, marca de agua, filtros…) a Firebase
 * Storage. Comparte el mismo pipeline que usa ImageUploader para que los
 * archivos re-subidos en lote o desde el editor de video terminen en el
 * mismo storage que las subidas normales.
 */
export async function uploadFile(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
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
