"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { createRevision } from "@/lib/revision-service";
import { useUIStore } from "@/stores/ui-store";

export function RecoveryHistory({ workId, markdown }: { workId: string; markdown: string }) {
  const router = useRouter();
  const snapshots = useLiveQuery(() => db.recoverySnapshots.where("workId").equals(workId).reverse().sortBy("createdAt"), [workId], []);
  const [selectedId, select] = useState("");
  const selected = snapshots.find((item) => item.id === selectedId);
  const newest = snapshots[0];
  return <details className="recovery-history"><summary>恢复历史（{snapshots.length}）{newest && newest.markdown !== markdown ? " · 有不同于当前正文的快照" : ""}</summary>
    <p>预览后恢复为新草稿，原作品与定稿保持不变。</p>
    <select aria-label="选择恢复快照" value={selectedId} onChange={(event) => select(event.target.value)}><option value="">选择时间…</option>{snapshots.map((item) => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString()}</option>)}</select>
    {selected && <><p>当前 {markdown.length} 字符 · 快照 {selected.markdown.length} 字符</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}><label>当前正文<textarea readOnly value={markdown} rows={10} style={{ width: "100%" }} /></label><label>快照正文<textarea readOnly value={selected.markdown} rows={10} style={{ width: "100%" }} /></label></div><button onClick={() => void useUIStore.getState().flushSave().then(() => createRevision(workId, selected.markdown)).then((work) => router.push(`/workbench?work=${work.id}`)).catch((error) => useUIStore.getState().showToast(String(error), "error"))}>恢复为新草稿</button></>}
  </details>;
}
