import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "设置" };

export default function SettingsPage() {
  return <PageShell eyebrow="Settings" title="设置"><SettingsPanel /></PageShell>;
}
