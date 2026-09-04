import { create } from "zustand";
import type { EditorMode, SaveState } from "@/types/workshop";
import type { CharacterDisplayMode, CharacterMotionMode, CharacterThemePreference, TextureMode } from "@/types/theme";

type SaveHandler = (() => Promise<void>) | null;

interface ToastMessage {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

interface UIState {
  editorMode: EditorMode;
  worksDrawerOpen: boolean;
  inspectorOpen: boolean;
  galleryFiltersOpen: boolean;
  commandPaletteOpen: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  lineNumbers: boolean;
  globalSaveState: SaveState;
  activeWorkTitle: string;
  toast: ToastMessage | null;
  saveHandler: SaveHandler;
  illustrationMode: CharacterDisplayMode;
  textureMode: TextureMode;
  motionMode: CharacterMotionMode;
  themePreference: CharacterThemePreference;
  setEditorMode: (mode: EditorMode) => void;
  setWorksDrawerOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  toggleWorksDrawer: () => void;
  toggleInspector: () => void;
  toggleGalleryFilters: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
  toggleTypewriterMode: () => void;
  toggleLineNumbers: () => void;
  setGlobalSaveState: (state: SaveState) => void;
  setActiveWorkTitle: (title: string) => void;
  showToast: (message: string, tone?: ToastMessage["tone"]) => void;
  dismissToast: () => void;
  registerSaveHandler: (handler: SaveHandler) => void;
  flushSave: () => Promise<void>;
  setCharacterPreferences: (preferences: Partial<Pick<UIState, "illustrationMode" | "textureMode" | "motionMode" | "themePreference">>) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  editorMode: "split",
  worksDrawerOpen: false,
  inspectorOpen: false,
  galleryFiltersOpen: false,
  commandPaletteOpen: false,
  focusMode: false,
  typewriterMode: false,
  lineNumbers: true,
  globalSaveState: "saved",
  activeWorkTitle: "",
  toast: null,
  saveHandler: null,
  illustrationMode: "full",
  textureMode: "on",
  motionMode: "full",
  themePreference: "auto",
  setEditorMode: (editorMode) => set({ editorMode }),
  setWorksDrawerOpen: (worksDrawerOpen) => set({ worksDrawerOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  toggleWorksDrawer: () => set((state) => ({ worksDrawerOpen: !state.worksDrawerOpen })),
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  toggleGalleryFilters: () => set((state) => ({ galleryFiltersOpen: !state.galleryFiltersOpen })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  toggleTypewriterMode: () => set((state) => ({ typewriterMode: !state.typewriterMode })),
  toggleLineNumbers: () => set((state) => ({ lineNumbers: !state.lineNumbers })),
  setGlobalSaveState: (globalSaveState) => set({ globalSaveState }),
  setActiveWorkTitle: (activeWorkTitle) => set({ activeWorkTitle }),
  showToast: (message, tone = "info") => set({ toast: { id: Date.now(), message, tone } }),
  dismissToast: () => set({ toast: null }),
  registerSaveHandler: (saveHandler) => set({ saveHandler }),
  flushSave: async () => {
    const handler = get().saveHandler;
    if (handler) await handler();
  },
  setCharacterPreferences: (preferences) => set(preferences),
}));
