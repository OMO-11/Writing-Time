import { WorkDetail } from "@/components/library/WorkDetail";
import { PageShell } from "@/components/ui/PageShell";

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PageShell eyebrow="Reading" title="作品详情"><WorkDetail slug={slug} /></PageShell>;
}
