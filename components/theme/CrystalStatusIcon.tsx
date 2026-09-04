import { Check, CloudAlert, Gem, LoaderCircle } from "lucide-react";
import type { SaveState } from "@/types/workshop";

export function CrystalStatusIcon({ state, label = true }: { state: SaveState; label?: boolean }) {
  const Icon = state === "saving" ? LoaderCircle : state === "error" ? CloudAlert : Check;
  return <span className="crystal-status" data-state={state} role="status"><Gem aria-hidden="true" size={18} /><Icon aria-hidden="true" size={11} />{label ? <span>{state === "saving" ? "正在保存" : state === "error" ? "保存失败" : "已保存"}</span> : null}</span>;
}
