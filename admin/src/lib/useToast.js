import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, ok = true) => {
    clearTimeout(timer.current);
    setToast({ message, ok });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, show, dismiss };
}
