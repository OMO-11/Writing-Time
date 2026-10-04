"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContinueEditing } from "@/components/home/ContinueEditing";
import { EmptyState } from "@/components/home/EmptyState";
import { RecentBook, DailyActivity, DEFAULT_HOME_MODULES, Favorites, HomeModuleControls, type HomeModuleSetting, QuickCapture, RecentImagesModule, UnsortedItems } from "@/components/home/HomeContentModules";
import { ImportDropOverlay } from "@/components/home/ImportDropOverlay";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentWorks } from "@/components/home/RecentWorks";
import { WelcomeHero } from "@/components/home/WelcomeHero";
import { createContent } from "@/lib/content-service";
import { createBlankWork, db, importImageFile } from "@/lib/db";
import { importMarkdownWork, isMarkdownFile, isSupportedImageFile } from "@/lib/work-import";

export function HomeDashboard() {
  const router = useRouter();
  const markdownInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [modules, setModules] = useState<HomeModuleSetting[]>(DEFAULT_HOME_MODULES);

  const works = useLiveQuery(() => db.works.orderBy("updatedAt").reverse().limit(4).toArray(), [], []);
  const recentBook = useLiveQuery(() => db.books.orderBy("updatedAt").last());
  const workCount = useLiveQuery(() => db.works.count(), [], 0);
  const images = useLiveQuery(() => db.images.orderBy("createdAt").reverse().limit(3).toArray(), [], []);
  const imageCount = useLiveQuery(() => db.images.count(), [], 0);
  const contents = useLiveQuery(() => db.contents.orderBy("updatedAt").reverse().toArray(), [], []);
  const todayStart = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const activity = useLiveQuery(() => db.activity.where("createdAt").aboveOrEqual(todayStart).reverse().toArray(), [todayStart], []);

  useEffect(() => { void db.settings.get("home-module-layout").then((record) => { if (Array.isArray(record?.value)) setModules(record.value as HomeModuleSetting[]); }); }, []);

  const recentWork = works[0];
  const coverIds = useMemo(() => works.map((work) => work.coverImageId).filter(Boolean) as string[], [works]);
  const covers = useLiveQuery(async () => {
    const records = await Promise.all(coverIds.map((id) => db.images.get(id)));
    return new Map(records.filter((record) => record).map((record) => [record!.id, record!]));
  }, [coverIds.join("|")], new Map());

  const announce = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }, []);

  const createWork = useCallback(async () => {
    const work = await createBlankWork();
    router.push(`/workbench?work=${work.id}`);
  }, [router]);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const markdownFiles = files.filter(isMarkdownFile);
    const imageFiles = files.filter(isSupportedImageFile);
    const unsupportedCount = files.length - markdownFiles.length - imageFiles.length;

    try {
      const importedWorks = [];
      for (const file of markdownFiles) importedWorks.push(await importMarkdownWork(file));
      for (const file of imageFiles) await importImageFile(file);

      if (unsupportedCount > 0) announce(`${unsupportedCount} 个文件格式不受支持，已跳过。`);
      if (importedWorks.length > 0) {
        router.push(`/workbench?work=${importedWorks[0].id}`);
      } else if (imageFiles.length > 0) {
        router.push("/gallery");
      } else if (files.length > 0 && unsupportedCount === 0) {
        announce("没有找到可导入的文件。");
      }
    } catch (error) {
      console.error(error);
      announce("导入没有完成，请检查文件后重试。");
    }
  }, [announce, router]);

  const createNote = useCallback(async () => {
    const note = await createContent("note", "沿途的新灵感");
    router.push(`/content/${note.id}`);
  }, [router]);

  const createRecord = useCallback(async () => {
    const record = await createContent("record", "未命名设定");
    router.push(`/content/${record.id}`);
  }, [router]);

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    if (event.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  const recentItems = works.slice(0, 4).map((work) => ({
    work,
    cover: work.coverImageId ? covers.get(work.coverImageId) : undefined,
  }));
  const unsorted = contents.filter((item) => !item.tags.length && !item.collectionIds.length && item.type !== "collection");
  const favorites = contents.filter((item) => item.favorite);
  const updateModules = (next: HomeModuleSetting[]) => { setModules(next); void db.settings.put({ key: "home-module-layout", value: next }); };

  return (
    <div
      className="home-dashboard"
      data-character-theme="balanced"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <main id="home-main" className="home-main" tabIndex={-1}>
        <div className="home-lead-grid">
          <WelcomeHero workCount={workCount} imageCount={imageCount} recentWork={recentWork} onCreateWork={() => void createWork()} />
          <QuickActions
            onNewWork={() => void createWork()}
            onCaptureNote={() => void createNote()}
            onAddImages={() => imageInput.current?.click()}
            onCreateRecord={() => void createRecord()}
          />
        </div>

        <HomeModuleControls modules={modules} onChange={updateModules} />
        <div className="home-module-flow">
          {modules.filter((module) => module.visible).map((module) => {
            if (module.key === "continue") return <div key={module.key}>{recentWork ? <ContinueEditing work={recentWork} cover={recentWork.coverImageId ? covers.get(recentWork.coverImageId) : undefined} /> : <EmptyState onNewWork={() => void createWork()} onImportMarkdown={() => markdownInput.current?.click()} />}</div>;
            if (module.key === "quick-capture") return <QuickCapture key={module.key} onSaved={announce} />;
            if (module.key === "active-projects") return <RecentBook key={module.key} book={recentBook} />;
            if (module.key === "recent-works") return <RecentWorks key={module.key} items={recentItems} />;
            if (module.key === "recent-images") return <RecentImagesModule key={module.key} images={images} />;
            if (module.key === "unsorted") return <UnsortedItems key={module.key} items={unsorted} />;
            if (module.key === "favorites") return <Favorites key={module.key} items={favorites} />;
            return <DailyActivity key={module.key} activity={activity} />;
          })}
        </div>
      </main>

      <ImportDropOverlay visible={isDragging} />
      <p className="home-toast" role="status" aria-live="polite" data-visible={Boolean(notice)}>{notice}</p>
      <input
        ref={markdownInput}
        className="sr-only"
        type="file"
        accept=".md,text/markdown"
        multiple
        aria-label="选择 Markdown 文件"
        onChange={(event) => {
          if (event.currentTarget.files) void handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={imageInput}
        className="sr-only"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        aria-label="选择图片文件"
        onChange={(event) => {
          if (event.currentTarget.files) void handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
