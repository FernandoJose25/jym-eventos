/**
 * Compresión automática de videos pesados, 100% en el navegador.
 *
 * Los celulares graban a 20+ Mbps priorizando no perder nada al momento de
 * grabar; en la web ese bitrate solo hace lenta la página, no se ve mejor.
 * Si el video supera HEAVY_BPS se regraba (canvas + MediaRecorder, igual que
 * VideoEditorModal) a un bitrate web razonable; si no, se devuelve intacto.
 *
 * Nota: el proceso tarda aproximadamente lo que dura el video (no hay forma
 * de regrabar más rápido en el navegador sin un servidor de transcodificación).
 */

const HEAVY_BPS = 8_000_000;  // por encima de esto se considera "crudo de celular"
const TARGET_BPS = 7_000_000; // bitrate objetivo web (~mismo que el editor al 85%)

export async function compressVideoIfHeavy(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  if (!file.type.startsWith('video/')) return file;

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  try {
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error('No se pudo leer el video'));
    });

    const duration = video.duration;
    if (!duration || !isFinite(duration) || !video.videoWidth) return file;
    const sourceBps = (file.size * 8) / duration;
    if (sourceBps <= HEAVY_BPS) return file;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(30);

    // Audio enrutado vía AudioContext hacia el stream grabado; no se conecta
    // a audioCtx.destination, así que no suena por los parlantes.
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: TARGET_BPS });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    const recordingDone = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });

    video.currentTime = 0;
    video.muted = false;
    recorder.start();
    try {
      await video.play();
    } catch {
      // Sin gesto de usuario reciente el navegador bloquea play() con sonido:
      // se reintenta muteado (la pista de audio grabada queda en silencio,
      // preferible a fallar toda la subida).
      video.muted = true;
      await video.play();
    }

    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
      if (!video.ended && !video.paused) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    await new Promise<void>(resolve => { video.onended = () => resolve(); });
    cancelAnimationFrame(raf);
    recorder.stop();
    audioCtx.close();

    const blob = await recordingDone;
    onProgress?.(100);
    if (!blob.size || blob.size >= file.size) return file; // por si acaso, nunca empeorar
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}-optimizado.webm`, { type: 'video/webm' });
  } finally {
    URL.revokeObjectURL(url);
    video.src = '';
  }
}
