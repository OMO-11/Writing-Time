"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function StorageHealth() {
  const [estimate, setEstimate] = useState<StorageEstimate>();
  const [message, setMessage] = useState("");
  const backup = useLiveQuery(async () => {
    const record = await db.settings.get("last-backup-at");
    const last = typeof record?.value === "number" ? record.value : 0;
    const changed = await db.contents.where("updatedAt").above(last).count() + await db.books.where("updatedAt").above(last).count();
    return { last, changed };
  }, []);
  useEffect(() => { if (navigator.storage?.estimate) void navigator.storage.estimate().then(setEstimate).catch(() => setMessage("存储估算不可用")); }, []);
  return <div><p>{estimate ? `已使用约 ${((estimate.usage ?? 0) / 1024 / 1024).toFixed(1)} MiB，可用配额约 ${((estimate.quota ?? 0) / 1024 / 1024).toFixed(0)} MiB。` : "存储用量尚不可用。"}</p><p>{backup?.last ? `上次生成备份：${new Date(backup.last).toLocaleString()}；之后新增或修改 ${backup.changed} 项。` : "尚未生成本机备份。"}生成文件不代表已经验证恢复成功。</p><button onClick={() => { if (!navigator.storage?.persist) { setMessage("当前环境不支持持久存储申请"); return; } void navigator.storage.persist().then((granted) => setMessage(granted ? "已获得持久存储许可，仍请定期备份。" : "浏览器未授予持久存储许可，请定期备份。")).catch(() => setMessage("申请失败，请定期备份。")); }}>申请持久存储</button><p role="status">{message}</p></div>;
}
