import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS não dispara beforeinstallprompt — mostra dica manual
    if (isIOS()) {
      setShowIosTip(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    } else {
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base tracking-wide">
            Instale o app no seu celular
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showIosTip ? (
              <>
                Toque em <Share className="inline h-3 w-3" /> e depois em{" "}
                <span className="font-medium">"Adicionar à Tela de Início"</span>.
              </>
            ) : (
              "Acesso rápido aos seus agendamentos, fila e promoções."
            )}
          </p>
          {!showIosTip && deferred && (
            <Button size="sm" className="mt-3" onClick={install}>
              Instalar agora
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
