"use client";

import { AlertCircle, Check, X } from "lucide-react";
import { useEffect } from "react";
import { CrystalStatusIcon } from "@/components/theme/CrystalStatusIcon";
import { useUIStore } from "@/stores/ui-store";

export function ToastAndSaveStatus() {
  const saveState = useUIStore((state) => state.globalSaveState);
  const saveHandler = useUIStore((state) => state.saveHandler);
  const toast = useUIStore((state) => state.toast);
  const dismissToast = useUIStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 4200);
    return () => window.clearTimeout(timer);
  }, [dismissToast, toast]);

  return (
    <>
      {saveHandler ? (
        <p className="global-save-status" data-state={saveState}><CrystalStatusIcon state={saveState} /></p>
      ) : null}
      {toast ? (
        <div className="app-toast" data-tone={toast.tone} role={toast.tone === "error" ? "alert" : "status"} aria-live={toast.tone === "error" ? "assertive" : "polite"}>
          {toast.tone === "error" ? <AlertCircle aria-hidden="true" size={17} /> : <Check aria-hidden="true" size={17} />}
          <span>{toast.message}</span>
          <button type="button" onClick={dismissToast} aria-label="关闭提示"><X aria-hidden="true" size={16} /></button>
        </div>
      ) : null}
    </>
  );
}
