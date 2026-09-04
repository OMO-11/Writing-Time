import type { LucideIcon } from "lucide-react";

interface AppIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

export function AppIcon({ icon: Icon, size = 19, className }: AppIconProps) {
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={1.65} />;
}
