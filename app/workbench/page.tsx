import { Suspense } from "react";
import { Workbench } from "@/components/workbench/Workbench";

export default function WorkbenchPage() {
  return <Suspense fallback={<main className="min-h-dvh bg-paper" />}><Workbench /></Suspense>;
}
