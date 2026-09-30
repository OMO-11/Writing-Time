"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FileDown, Image as ImageIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentOutline } from "@/components/workbench/DocumentOutline";
import { EditorHeader } from "@/components/workbench/EditorHeader";
import { EditorStatusBar } from "@/components/workbench/EditorStatusBar";
import { InspectorDrawer } from "@/components/workbench/InspectorDrawer";
import { MarkdownEditor, type EditorPosition, type MarkdownEditorHandle } from "@/components/workbench/MarkdownEditor";
import { MarkdownPreview } from "@/components/workbench/MarkdownPreview";
import { MarkdownToolbar } from "@/components/workbench/MarkdownToolbar";
import { WorkDrawer } from "@/components/workbench/WorkDrawer";
import { RecoveryHistory } from "@/components/workbench/RecoveryHistory";
import { ImagePicker } from "@/components/content/ImagePicker";
import { PaperDialog } from "@/components/ui/PaperDialog";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";
import { articleContentFromWork, createBlankWork, createRecoverySnapshot, db, ensureStarterData, getLineBreakMode, hydrateWorkDocument, importImageFile, recordActivity } from "@/lib/db";
import { frontmatterTags, MarkdownService } from "@/lib/markdown-service";
import { rebuildAllReferences, rebuildReferencesFor } from "@/lib/content-service";
import { importMarkdownWork } from "@/lib/work-import";
import { useUIStore } from "@/stores/ui-store";
import type { EditorSession, HeadingItem, SaveState, WorkDocument, WorkStatus } from "@/types/workshop";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const EMPTY_POSITION: EditorPosition = { cursorFrom: 0, cursorTo: 0, line: 1, column: 1, scrollTop: 0 };
const STARTER_MARKDOWN = "# 未命名作品\n\n从这里开始写下你的故事……\n";

export function Workbench() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedId = searchParams.get("work");
  const works = useLiveQuery(() => db.works.orderBy("updatedAt").reverse().toArray(), [], []);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const workRef = useRef<WorkDocument | undefined>(undefined);
  const markdownRef = useRef("");
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const savingRef = useRef<Promise<void> | null>(null);
  const sessionTimer = useRef<number | undefined>(undefined);
  const sessionRef = useRef<EditorSession | undefined>(undefined);
  const positionRef = useRef<EditorPosition>(EMPTY_POSITION);
  const outlineOpenRef = useRef(true);
  const lineBreakModeRef = useRef<"standard" | "single">("standard");
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const finalizingRef = useRef(false);
  const switchingRef = useRef(false);
  const [activeWork, setActiveWork] = useState<WorkDocument>();
  const [loadingWork, setLoadingWork] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [renderedHtml, setRenderedHtml] = useState("");
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [position, setPosition] = useState<EditorPosition>(EMPTY_POSITION);
  const [sessionSeed, setSessionSeed] = useState<EditorSession>();
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const {
    editorMode, setEditorMode, worksDrawerOpen, inspectorOpen, toggleWorksDrawer, toggleInspector,
    focusMode, typewriterMode, lineNumbers, setGlobalSaveState, registerSaveHandler,
    setActiveWorkTitle, showToast,
  } = useUIStore();

  // Input and load/save paths update these refs synchronously. A delayed passive
  // effect must not overwrite a newer input with the preceding render's value.
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { outlineOpenRef.current = outlineOpen; }, [outlineOpen]);

  const updateSaveState = useCallback((next: SaveState) => {
    setSaveState(next);
    setGlobalSaveState(next);
  }, [setGlobalSaveState]);

  const persistSession = useCallback((nextPosition = positionRef.current) => {
    const work = workRef.current;
    if (!work) return;
    const session: EditorSession = {
      workId: work.id,
      cursorFrom: nextPosition.cursorFrom,
      cursorTo: nextPosition.cursorTo,
      scrollTop: nextPosition.scrollTop,
      editorMode: useUIStore.getState().editorMode,
      outlineOpen: outlineOpenRef.current,
      updatedAt: Date.now(),
    };
    sessionRef.current = session;
    window.clearTimeout(sessionTimer.current);
    sessionTimer.current = window.setTimeout(() => { void db.editorSessions.put(session); }, 260);
  }, []);

  const saveNow = useCallback(async () => {
    while (savingRef.current) await savingRef.current;
    const work = workRef.current;
    if (!work || work.finalizedAt) return;
    if (!dirtyRef.current) { persistSession(editorRef.current?.getPosition() ?? positionRef.current); return; }
    const task = (async () => {
      updateSaveState("saving");
      try {
        while (dirtyRef.current) {
        const source = markdownRef.current;
        const baseWork = workRef.current!;
        const revision = revisionRef.current;
        const processed = await MarkdownService.process(source, await getLineBreakMode());
        const latestWork = workRef.current ?? work;
        const frontmatterStatus = processed.frontmatter.status;
        const status: WorkStatus = frontmatterStatus === "completed" || frontmatterStatus === "archived" || frontmatterStatus === "draft" ? frontmatterStatus : latestWork.status;
        const next: WorkDocument = {
          ...latestWork,
          markdown: source,
          renderedHtml: processed.renderedHtml,
          plainText: processed.plainText,
          excerptHtml: processed.excerptHtml,
          headings: processed.headings,
          tags: processed.frontmatter.tags ? frontmatterTags(processed.frontmatter.tags) : latestWork.tags,
          status,
          updatedAt: Date.now(),
        };
        await db.transaction("rw", db.works, db.contents, db.activity, db.contentReferences, async () => {
          const current = await db.works.get(next.id);
          if (current && current.updatedAt !== baseWork.updatedAt) throw new Error("其他标签页已修改此作品，当前正文保留在编辑器和恢复快照中。请重新打开后比较。 ");
          next.updatedAt = Math.max(Date.now(), baseWork.updatedAt + 1);
          await db.works.put(next);
          const previousContent = await db.contents.get(next.id);
          await db.contents.put({ ...articleContentFromWork(next), favorite: previousContent?.favorite ?? false });
          await recordActivity(next.id, "updated", `保存文章「${next.title}」`);
          if (current?.title !== next.title) await rebuildAllReferences();
          else await rebuildReferencesFor(articleContentFromWork(next));
        });
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          workRef.current = next;
          setActiveWork(next);
          setRenderedHtml(next.renderedHtml);
          setHeadings(next.headings);
        } else {
          workRef.current = { ...workRef.current!, updatedAt: next.updatedAt };
          dirtyRef.current = true;
          setDirtyVersion((value) => value + 1);
        }
        persistSession(editorRef.current?.getPosition() ?? positionRef.current);

        updateSaveState(revisionRef.current === revision ? "saved" : "saving");
        }
      } catch (error) {
        console.error(error);
        await createRecoverySnapshot(work.id, markdownRef.current).catch(console.error);
        updateSaveState("error");
        showToast(error instanceof Error ? error.message : "保存失败，内容仍保留在编辑器中，请稍后重试。", "error");
        throw error;
      } finally {
        savingRef.current = null;
      }
    })();
    savingRef.current = task;
    return task;
  }, [persistSession, showToast, updateSaveState]);

  useEffect(() => {
    registerSaveHandler(saveNow);
    return () => registerSaveHandler(null);
  }, [registerSaveHandler, saveNow]);

  useEffect(() => {
    let cancelled = false;
    switchingRef.current = true;
    // Clear stale controls before an asynchronously loaded revision becomes editable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingWork(true);
    void (async () => {
      await saveNow();
      await ensureStarterData();
      lineBreakModeRef.current = await getLineBreakMode();
      const found = requestedId ? await db.works.get(requestedId) : await db.works.orderBy("updatedAt").last();
      if (requestedId && !found) { showToast("没有找到这篇作品。", "error"); router.replace("/library"); return; }
      if (found?.finalizedAt) { router.replace(`/work/${found.slug}`); return; }
      const selected = await hydrateWorkDocument(found ?? await createBlankWork());
      const session = await db.editorSessions.get(selected.id) ?? {
        workId: selected.id, cursorFrom: 0, cursorTo: 0, scrollTop: 0, editorMode: "split" as const, outlineOpen: true, updatedAt: Date.now(),
      };
      if (cancelled) return;
      setActiveWork(selected);
      workRef.current = selected;
      setMarkdown(selected.markdown);
      markdownRef.current = selected.markdown;
      setRenderedHtml(selected.renderedHtml);
      setHeadings(selected.headings);
      setSessionSeed(session);
      setPosition({ cursorFrom: session.cursorFrom, cursorTo: session.cursorTo, scrollTop: session.scrollTop, line: 1, column: 1 });
      positionRef.current = { cursorFrom: session.cursorFrom, cursorTo: session.cursorTo, scrollTop: session.scrollTop, line: 1, column: 1 };
      setEditorMode(session.editorMode);
      setOutlineOpen(session.outlineOpen);
      outlineOpenRef.current = session.outlineOpen;
      setActiveWorkTitle(selected.title);
      dirtyRef.current = false;
      updateSaveState("saved");
      switchingRef.current = false;
      setLoadingWork(false);
    })().catch((error) => { if (!cancelled) { switchingRef.current = false; showToast(String(error), "error"); } });
    return () => { cancelled = true; };
  }, [router, requestedId, setActiveWorkTitle, setEditorMode, updateSaveState, saveNow, showToast]);

  useEffect(() => {
    if (!activeWork || !dirtyRef.current) return;
    const timer = window.setTimeout(() => { void saveNow().catch(() => {}); }, 800);
    return () => window.clearTimeout(timer);
  }, [activeWork, dirtyVersion, saveNow]);

  useEffect(() => {
    if (!activeWork || markdown === activeWork.markdown) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void MarkdownService.process(markdown, lineBreakModeRef.current).then((processed) => {
        if (!cancelled) { setRenderedHtml(processed.renderedHtml); setHeadings(processed.headings); }
      });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeWork, markdown]);

  useEffect(() => {
    const saveOnBlur = () => { void saveNow(); };
    const saveWhenHidden = () => { if (document.visibilityState === "hidden") void saveNow(); };
    const beforeUnload = () => { void saveNow(); };
    window.addEventListener("blur", saveOnBlur);
    window.addEventListener("pagehide", beforeUnload);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("blur", saveOnBlur);
      window.removeEventListener("pagehide", beforeUnload);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [saveNow]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const work = workRef.current;
      if (work) void createRecoverySnapshot(work.id, markdownRef.current);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { persistSession(); }, [editorMode, outlineOpen, persistSession]);
  useEffect(() => { setActiveWorkTitle(activeWork?.title ?? ""); }, [activeWork?.title, setActiveWorkTitle]);
  useEffect(() => () => { setActiveWorkTitle(""); void saveNow(); }, [saveNow, setActiveWorkTitle]);

  const markDirty = () => { dirtyRef.current = true; revisionRef.current += 1; updateSaveState("saving"); setDirtyVersion((value) => value + 1); };
  const changeMarkdown = (value: string) => { if (finalizingRef.current || switchingRef.current) return; markdownRef.current = value; setMarkdown(value); markDirty(); };
  const patchWork = (patch: Partial<WorkDocument>) => {
    const current = workRef.current;
    if (!current || finalizingRef.current || switchingRef.current) return;
    const next = { ...current, ...patch };
    workRef.current = next;
    setActiveWork(next);
    markDirty();
  };

  const finalize = async () => {
    if (finalizingRef.current || switchingRef.current || !workRef.current) return;
    setFinalizeError("");
    finalizingRef.current = true; setFinalizing(true);
    try {
      await saveNow();
      if (dirtyRef.current) await saveNow();
      const id = workRef.current.id;
      await db.transaction("rw", db.works, db.contents, async () => {
        const work = await db.works.get(id);
        if (!work) throw new Error("作品不存在");
        if (work.updatedAt !== workRef.current?.updatedAt) throw new Error("其他标签页已修改作品，请重新打开后再定稿。");
        const next = { ...work, status: "completed" as const, finalizedAt: Date.now(), updatedAt: Math.max(Date.now(), work.updatedAt + 1) };
        await db.works.put(next);
        const content = await db.contents.get(id);
        await db.contents.put({ ...articleContentFromWork(next), favorite: content?.favorite ?? false });
      });
      dirtyRef.current = false;
      workRef.current = await db.works.get(id);
      router.push("/library?type=finished");
    } catch (error) { setFinalizeError(error instanceof Error ? error.message : "完全保存失败，请重试。"); }
    finally { finalizingRef.current = false; setFinalizing(false); }
  };

  const selectWork = async (work: WorkDocument) => { await saveNow(); router.replace(`/workbench?work=${work.id}`); };
  const createWork = async () => { await saveNow(); const work = await createBlankWork(); router.replace(`/workbench?work=${work.id}`); };
  const importMarkdownFile = async (file: File) => { await saveNow(); const work = await importMarkdownWork(file); router.replace(`/workbench?work=${work.id}`); };
  const addImages = async (files: File[]) => {
    const work = workRef.current;
    if (!work) return;
    const records = [];
    for (const file of files.filter((item) => IMAGE_TYPES.includes(item.type))) records.push(await importImageFile(file, work.id));
    if (records.length) changeMarkdown(`${markdownRef.current.trimEnd()}\n\n${records.map((image) => `![${image.title}](fw-asset://${image.id})`).join("\n\n")}\n`);
  };
  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const markdownFile = list.find((file) => file.name.toLowerCase().endsWith(".md"));
    if (markdownFile) await importMarkdownFile(markdownFile);
    else await addImages(list);
  };
  const exportMarkdown = async () => {
    const work = workRef.current;
    if (!work) return;
    await saveNow();
    const url = URL.createObjectURL(new Blob([markdownRef.current], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${work.slug}.md`; anchor.click(); URL.revokeObjectURL(url);
  };

  const paragraphCount = useMemo(() => markdown.split(/\n{2,}/).filter((part) => part.trim() && !part.trim().startsWith("---")).length, [markdown]);
  const wordCount = useMemo(() => {
    const han = markdown.match(/\p{Script=Han}/gu)?.length ?? 0;
    const words = markdown.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
    return han + words;
  }, [markdown]);
  const showEmptyCompanion = !focusMode && editorMode !== "preview" && (markdown === STARTER_MARKDOWN || markdown.trim() === "");
  const readyWork = !loadingWork && (!requestedId || activeWork?.id === requestedId) ? activeWork : undefined;

  return (
    <main className="workbench" data-character-theme="noval" data-focus={focusMode} data-typewriter={typewriterMode} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}>
      {confirmFinalize && <PaperDialog title="完全保存作品" busy={finalizing} onClose={() => setConfirmFinalize(false)}><div className="paper-dialog-body"><p>即将定稿「{activeWork?.title}」。</p><p>正文、标题和属性将不可再修改。之后可创建独立修订草稿，原稿仍保持只读。</p><p>作品保存在本机浏览器中，请继续定期导出备份。</p>{finalizeError && <p className="paper-error" role="alert">{finalizeError}</p>}</div><footer className="paper-dialog-actions"><button disabled={finalizing} onClick={() => setConfirmFinalize(false)}>继续编辑</button><button className="book-primary" disabled={finalizing} onClick={() => void finalize()}>{finalizing ? "正在定稿…" : "确认完全保存"}</button></footer></PaperDialog>}
      <div className="finalize-bar"><span>原稿定稿后只读，可收录到书籍。</span><button type="button" className="finalize-action" disabled={!readyWork || finalizing} onClick={() => { setFinalizeError(""); setConfirmFinalize(true); }}>{finalizing ? "正在定稿…" : "完全保存"}</button></div>
      {activeWork && <RecoveryHistory workId={activeWork.id} markdown={markdown} />}
      <EditorHeader work={readyWork} outlineOpen={outlineOpen} onTitleChange={(title) => patchWork({ title })} onToggleOutline={() => setOutlineOpen((value) => !value)} onExport={() => void exportMarkdown()} />
      {editorMode !== "preview" ? <MarkdownToolbar onCommand={(command) => editorRef.current?.applyCommand(command)} onUndo={() => editorRef.current?.undo()} onRedo={() => editorRef.current?.redo()} onFind={() => editorRef.current?.openSearch()} onPickImage={() => setImagePickerOpen(true)} /> : null}

      <button className="drawer-tab drawer-tab-left" aria-label={worksDrawerOpen ? "收起作品抽屉" : "展开作品抽屉"} aria-expanded={worksDrawerOpen} onClick={toggleWorksDrawer}><ChevronRight aria-hidden="true" size={17} /></button>
      <button className="drawer-tab drawer-tab-right" aria-label={inspectorOpen ? "收起属性抽屉" : "展开属性抽屉"} aria-expanded={inspectorOpen} onClick={toggleInspector}><ChevronLeft aria-hidden="true" size={17} /></button>
      <WorkDrawer open={worksDrawerOpen} works={works} activeId={activeWork?.id} onClose={toggleWorksDrawer} onSelect={(work) => void selectWork(work)} onCreate={() => void createWork()} />
      <InspectorDrawer open={inspectorOpen} work={activeWork} onClose={toggleInspector} onChange={patchWork} onCover={(file) => { if (file) void importImageFile(file, activeWork?.id).then((image) => patchWork({ coverImageId: image.id })); }} />

      <div className="editor-workspace">
        {editorMode !== "preview" && activeWork && sessionSeed ? <DocumentOutline open={outlineOpen} headings={headings} cursorFrom={position.cursorFrom} onToggle={() => setOutlineOpen((value) => !value)} onSelect={(heading) => editorRef.current?.scrollToHeading(heading.from)} /> : null}
        <section className={`editor-stage editor-mode-${editorMode}`} aria-label="Markdown 创作区域">
          {editorMode !== "preview" && activeWork && sessionSeed ? <div className="editor-pane" data-solo={editorMode === "edit"}><MarkdownEditor key={activeWork.id} ref={editorRef} value={markdown} onChange={changeMarkdown} onPositionChange={(next) => { setPosition(next); persistSession(next); }} initialCursorFrom={sessionSeed.cursorFrom} initialCursorTo={sessionSeed.cursorTo} initialScrollTop={sessionSeed.scrollTop} lineNumbersVisible={lineNumbers} typewriterMode={typewriterMode} /></div> : null}
          {editorMode === "split" ? <div className="page-seam" aria-hidden="true" /> : null}
          {editorMode !== "edit" ? <div className="preview-pane" data-solo={editorMode === "preview"}><MarkdownPreview html={renderedHtml} /></div> : null}
        </section>
        {showEmptyCompanion ? <aside className="editor-empty-companion" aria-label="空白文档引导">
          <CharacterIllustration character="noval" variant="empty" placement="left" size="md" fade />
          <div><p>诺瓦尔已经翻开新的旅行手记。</p><strong>从第一个发现开始写吧。</strong><span><button type="button" onClick={() => editorRef.current?.focus()}>开始书写</button><button type="button" onClick={() => editorRef.current?.applyCommand("template")}>插入场景模板</button></span></div>
        </aside> : null}
      </div>
      <EditorStatusBar wordCount={wordCount} paragraphCount={paragraphCount} line={position.line} column={position.column} saveState={saveState} />
      {dragging ? <div className="drop-overlay" role="status"><div><FileDown aria-hidden="true" size={25} /><ImageIcon aria-hidden="true" size={25} /><strong>把手稿或图片放在这里</strong><span>支持 .md、png、jpg、jpeg、webp</span></div></div> : null}
      <ImagePicker open={imagePickerOpen} onClose={() => setImagePickerOpen(false)} onSelect={(ids) => { const imageId = ids[0]; if (!imageId) return; void db.images.get(imageId).then((image) => { if (image) editorRef.current?.insertText(`![${image.altText || image.title}](fw-asset://${image.id})`); }); }} />
    </main>
  );
}
