import { PageShell } from "@/components/ui/PageShell";
import { BookProjects } from "@/components/content/BookProjects";
import "./projects.css";
export const metadata = { title: "项目 · 书籍" };
export default function ProjectsPage() {
  return <PageShell eyebrow="Book Projects" title="项目 · 书籍"><BookProjects /></PageShell>;
}
