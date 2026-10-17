import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

interface RecaptchaProps {
  sitekey: string;
  onChange: (token: string | null) => void;
  theme?: "light" | "dark";
}

export const Recaptcha = forwardRef<any, RecaptchaProps>(({ sitekey, onChange, theme = "light" }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.grecaptcha && typeof window.grecaptcha.reset === "function" && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let isMounted = true;

    const renderCaptcha = () => {
      if (!isMounted || !containerRef.current) return;
      
      // Si el contenedor ya tiene algo, lo limpiamos
      if (containerRef.current.innerHTML !== "") return;

      if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
        try {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey,
            theme,
            callback: (token: string) => onChange(token),
            "expired-callback": () => onChange(null),
            "error-callback": () => onChange(null),
          });
        } catch (e) {
          console.error("Error renderizando reCAPTCHA:", e);
        }
      } else {
        // Si aún no está listo, reintentamos en 100ms
        setTimeout(renderCaptcha, 100);
      }
    };

    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      renderCaptcha();
    } else {
      // Definimos la función global que Google llamará cuando termine de cargar
      window.onRecaptchaLoad = () => {
        renderCaptcha();
      };

      // Inyectamos el script de Google asegurándonos de que no esté ya
      if (!document.getElementById("recaptcha-script")) {
        const script = document.createElement("script");
        script.id = "recaptcha-script";
        script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [sitekey, theme, onChange]);

  return <div ref={containerRef} className="flex justify-center" />;
});

Recaptcha.displayName = "Recaptcha";