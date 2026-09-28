import { PageShell } from "@/components/ui/PageShell";
import { BookProjects } from "@/components/content/BookProjects";
import "./projects.css";
export const metadata = { title: "书籍项目" };
export default function ProjectsPage() {
  return <PageShell eyebrow="Book Projects" title="书籍项目"><BookProjects /></PageShell>;
}
