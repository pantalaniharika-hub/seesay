import { useRef, useCallback, useEffect, useState } from 'react';

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  ready: boolean;
}

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>({ stream: null, error: null, ready: false });
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' }, // rear camera preferred
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState({ stream, error: null, ready: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setState({ stream: null, error: msg, ready: false });
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setState({ stream: null, error: null, ready: false });
  }, []);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise(async resolve => {
      const video = videoRef.current;

      if (video) {
        // Re-attach active stream if lost or paused
        if (streamRef.current && video.srcObject !== streamRef.current) {
          video.srcObject = streamRef.current;
        }
        if (video.paused) {
          try { await video.play(); } catch {}
        }

        // Wait up to 300ms if video stream is initializing
        let attempts = 0;
        while ((video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) && attempts < 6) {
          await new Promise(r => setTimeout(r, 50));
          attempts++;
        }
      }

      const width = video?.videoWidth || 640;
      const height = video?.videoHeight || 480;

      // Always create a fresh canvas instance and clear pixels
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.clearRect(0, 0, width, height);

      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        // Dynamic pattern for fallback canvas so every frame timestamp differs
        ctx.fillStyle = '#12151a';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffb627';
        ctx.font = '20px sans-serif';
        ctx.fillText(`SeeSay Camera Stream - ${new Date().toLocaleTimeString()}`, 30, height / 2);
      }

      canvas.toBlob(blob => {
        console.log('[Camera Capture] Fresh JPEG blob size:', blob?.size, 'bytes', 'ReadyState:', video?.readyState);
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  }, [videoRef]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { ...state, startCamera, stopCamera, captureFrame };
}
