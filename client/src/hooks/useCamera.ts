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
    return new Promise(resolve => {
      const video = videoRef.current;
      if (!video) return resolve(null);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
    });
  }, [videoRef]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { ...state, startCamera, stopCamera, captureFrame };
}
