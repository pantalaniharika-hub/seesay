import { useRef, useCallback } from 'react';

export function useSpeech() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== 'undefined' ? window.speechSynthesis : null
  );

  const speak = useCallback((text: string, onEnd?: () => void) => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (onEnd) utterance.onend = onEnd;
    synth.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  const listen = useCallback(
    (onResult: (transcript: string) => void, onError?: (err: string) => void): (() => void) => {
      const RecognitionCtor: typeof SpeechRecognition | undefined =
        (window.SpeechRecognition ?? window.webkitSpeechRecognition);

      if (!RecognitionCtor) {
        onError?.('Speech recognition not supported in this browser.');
        return () => {};
      }

      const recognition = new RecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        onError?.(event.error);
      };

      recognitionRef.current = recognition;
      recognition.start();

      return () => {
        try { recognition.stop(); } catch { /* ignore */ }
      };
    },
    []
  );

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { speak, stopSpeaking, listen, stopListening };
}
