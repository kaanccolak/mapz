'use client';

import { useEffect } from 'react';

/** Plan rotalarında sayfa genelinde dikey scroll'u kapatır; çıkışta eski haline döner. */
export function PlanBodyLock() {
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);
  return null;
}
