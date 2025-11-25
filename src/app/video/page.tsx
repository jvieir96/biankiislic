'use client';

import { useRouter } from 'next/navigation';
import { useRef, useEffect } from 'react';
import styles from './video.module.css';

export default function VideoPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intentar entrar en pantalla completa cuando el video esté listo
    const enterFullscreen = async () => {
      try {
        if (video.requestFullscreen) {
          await video.requestFullscreen();
        } else if ((video as any).webkitRequestFullscreen) {
          await (video as any).webkitRequestFullscreen();
        } else if ((video as any).msRequestFullscreen) {
          await (video as any).msRequestFullscreen();
        }
      } catch (error) {
        console.log('No se pudo entrar en pantalla completa:', error);
      }
    };

    // Esperar a que el video esté listo para reproducir
    video.addEventListener('loadedmetadata', enterFullscreen);

    return () => {
      video.removeEventListener('loadedmetadata', enterFullscreen);
    };
  }, []);

  const handleVideoEnd = async () => {
    // Salir de pantalla completa cuando termine el video
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msFullscreenElement) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.log('Error al salir de pantalla completa:', error);
    }
  };

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        controls
        onEnded={handleVideoEnd}
      >
        <source src="/videoo.mp4" type="video/mp4" />
        Tu navegador no soporta el elemento de video.
      </video>

      <button
        className={styles.menuButton}
        onClick={() => router.push('/')}
      >
        Volver al Menú
      </button>
    </div>
  );
}
