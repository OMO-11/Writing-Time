import { BookProjects } from "@/components/content/BookProjects";
import "./projects.css";
import { Suspense } from "react";
export const metadata = { title: "书籍项目" };
export default function ProjectsPage() {
  return <main className="book-page"><Suspense fallback={<p className="book-loading">正在打开书架…</p>}><BookProjects /></Suspense></main>;
}
