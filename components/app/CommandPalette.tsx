"use client";

import { useRouter } from "next/navigation";
import { BookOpenText, Castle, Command, FilePlus2, Images, Search, Settings, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBlankWork } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";

const baseCommands = [
  { id: "home", label: "返回主页", hint: "Ctrl ⇧ H", icon: Castle, href: "/" },
  { id: "library", label: "打开工作区", hint: "Library", icon: BookOpenText, href: "/library" },
  { id: "gallery", label: "打开图片展览", hint: "Gallery", icon: Images, href: "/gallery" },
  { id: "search", label: "聚焦全局搜索", hint: "Search", icon: Search, action: "search" },
  { id: "new", label: "新建 Markdown 作品", hint: "Create", icon: FilePlus2, action: "new" },
  { id: "settings", label: "打开设置", hint: "Settings", icon: Settings, href: "/settings" },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const flushSave = useUIStore((state) => state.flushSave);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const commands = useMemo(() => baseCommands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const close = () => { setQuery(""); setActive(0); setOpen(false); };

  const run = async (command: (typeof baseCommands)[number]) => {
    close();
    if ("href" in command) {
      await flushSave();
      router.push(command.href);
    } else if (command.action === "new") {
      await flushSave();
      const work = await createBlankWork();
      router.push(`/workbench?work=${work.id}`);
    } else {
      window.dispatchEvent(new Event("fantasy:focus-search"));
    }
  };

  if (!open) return null;
  return (
    <div className="command-scrim" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <section ref={panelRef} className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); close(); return; }
        if (event.key !== "Tab") return;
        const focusable = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
        <header>
          <Command aria-hidden="true" size={19} />
          <h2 id="command-title">命令面板</h2>
          <button type="button" onClick={close} aria-label="关闭命令面板"><X aria-hidden="true" size={17} /></button>
        </header>
        <label>
          <span className="sr-only">筛选命令</span>
          <Search aria-hidden="true" size={17} />
          <input ref={inputRef} value={query} placeholder="输入要执行的操作…" onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={(event) => {
            if (event.key === "Escape") close();
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(commands.length - 1, value + 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
            if (event.key === "Enter" && commands[active]) { event.preventDefault(); void run(commands[active]); }
          }} />
        </label>
        <div className="command-list" role="listbox">
          {commands.map((command, index) => {
            const Icon = command.icon;
            return <button key={command.id} type="button" role="option" aria-selected={active === index} onMouseEnter={() => setActive(index)} onClick={() => void run(command)}><Icon aria-hidden="true" size={17} /><span>{command.label}</span><kbd>{command.hint}</kbd></button>;
          })}
        </div>
        <footer><span>↑↓ 选择</span><span>Enter 打开</span><span>Esc 关闭</span></footer>
      </section>
    </div>
  );
}
