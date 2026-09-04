import { ContactRound, FileText, FolderKanban, Image, Images, LibraryBig, Lightbulb, Milestone, PanelsTopLeft } from "lucide-react";
import type { ContentType } from "@/types/content";

const icons = { article: FileText, image: Image, gallery: Images, record: ContactRound, project: FolderKanban, collection: LibraryBig, timeline: Milestone, note: Lightbulb, exhibition: PanelsTopLeft };

export function ContentIcon({ type, size = 18 }: { type: ContentType; size?: number }) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.65} />;
}
