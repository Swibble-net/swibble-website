import Script from "next/script";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type TurnstileWidgetProps = {
  /** Receives the token, to be verified server-side (see lib/turnstile.ts). */
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const subscribeNever = () => () => {};

/**
 * Cloudflare only accepts the site key on swibble.net; on Vercel preview
 * deployments the widget would show "Verbinden zur Website nicht möglich"
 * (error 110200). Previews get a plain note instead.
 */
const isPreviewHost = () => window.location.hostname.endsWith(".vercel.app");

const TurnstileWidget = ({
  onVerify,
  onExpire,
  onError,
}: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const preview = useSyncExternalStore(subscribeNever, isPreviewHost, () => false);

  // Keep the latest callbacks without re-rendering the widget.
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  const renderWidget = useCallback(() => {
    if (
      isPreviewHost() ||
      !containerRef.current ||
      !window.turnstile ||
      !siteKey ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => onExpireRef.current?.(),
      "error-callback": () => onErrorRef.current?.(),
    });
  }, [siteKey]);

  useEffect(() => {
    if (scriptReady) renderWidget();
  }, [scriptReady, renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!siteKey) return null;

  if (preview) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        Vorschau: Der Spam-Schutz von Cloudflare läuft nur auf swibble.net – hier
        lässt sich nicht absenden.
      </p>
    );
  }

  return (
    <>
      {/*
        onReady (not onLoad): onLoad fires once per page session, so a widget that
        mounts again after client-side navigation or a form reset would never render.
        render=explicit keeps Turnstile from scanning the page on its own.
      */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
      {scriptFailed && (
        <p role="alert" className="text-sm text-red-600">
          Der Spam-Schutz konnte nicht geladen werden. Bitte deaktiviere
          Werbeblocker für diese Seite und lade sie neu – oder schreib uns
          direkt per E-Mail.
        </p>
      )}
    </>
  );
};

export default TurnstileWidget;
