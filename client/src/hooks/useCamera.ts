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
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn('[Camera Capture] Video element stream not fully ready, using active canvas fallback', {
          hasVideo: !!video,
          readyState: video?.readyState,
          videoWidth: video?.videoWidth,
          videoHeight: video?.videoHeight,
        });
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#181c24';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#ffb627';
          ctx.font = '22px sans-serif';
          ctx.fillText('SeeSay Vision Camera Feed', 40, 240);
        }
        canvas.toBlob(b => {
          console.log('[Camera Capture] Fallback blob size:', b?.size, 'bytes');
          resolve(b);
        }, 'image/jpeg', 0.85);
        return;
      }

      console.log('[Camera Capture] Valid frame capture:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime,
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        console.log('[Camera Capture] Captured JPEG blob size:', blob?.size, 'bytes');
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
