"use client";

import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, openSearchPanel, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import { crosshairCursor, drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, rectangularSelection } from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { applyMarkdownCommand, type MarkdownCommand } from "@/components/workbench/markdown-commands";
import { SelectionMenu } from "@/components/workbench/SelectionMenu";
import { SlashCommandMenu } from "@/components/workbench/SlashCommandMenu";

export interface EditorPosition {
  cursorFrom: number;
  cursorTo: number;
  line: number;
  column: number;
  scrollTop: number;
}

export interface MarkdownEditorHandle {
  focus: () => void;
  applyCommand: (command: MarkdownCommand) => void;
  undo: () => void;
  redo: () => void;
  openSearch: () => void;
  insertText: (text: string) => void;
  getPosition: () => EditorPosition;
  scrollToHeading: (from: number) => void;
}

interface MenuPosition { x: number; y: number }
interface SlashState extends MenuPosition { query: string; from: number; to: number }

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, {
  value: string;
  onChange: (value: string) => void;
  onPositionChange: (position: EditorPosition) => void;
  initialCursorFrom?: number;
  initialCursorTo?: number;
  initialScrollTop?: number;
  lineNumbersVisible: boolean;
  typewriterMode: boolean;
}>(function MarkdownEditor({
  value,
  onChange,
  onPositionChange,
  initialCursorFrom = 0,
  initialCursorTo = 0,
  initialScrollTop = 0,
  lineNumbersVisible,
  typewriterMode,
}, forwardedRef) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>(null);
  const lineNumberCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onPositionRef = useRef(onPositionChange);
  const typewriterRef = useRef(typewriterMode);
  const initialConfig = useRef({ value, initialCursorFrom, initialCursorTo, initialScrollTop, lineNumbersVisible });
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<MenuPosition | null>(null);
  onChangeRef.current = onChange;
  onPositionRef.current = onPositionChange;
  typewriterRef.current = typewriterMode;

  const emitPosition = (view: EditorView) => {
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.head);
    onPositionRef.current({
      cursorFrom: selection.from,
      cursorTo: selection.to,
      line: line.number,
      column: selection.head - line.from + 1,
      scrollTop: view.scrollDOM.scrollTop,
    });
  };

  useEffect(() => {
    if (!hostRef.current) return;
    const initial = initialConfig.current;
    const start = Math.min(initial.initialCursorFrom, initial.value.length);
    const end = Math.min(initial.initialCursorTo, initial.value.length);
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initial.value,
        selection: { anchor: start, head: end },
        extensions: [
          lineNumberCompartment.current.of(initial.lineNumbersVisible ? [lineNumbers(), highlightActiveLineGutter()] : []),
          history(),
          drawSelection(),
          dropCursor(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          bracketMatching(),
          closeBrackets(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", color: "var(--text-main)", backgroundColor: "var(--surface)" },
            ".cm-content": { caretColor: "var(--deep-blue)", padding: "28px clamp(22px, 4vw, 64px) 80px", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "15px", lineHeight: "1.85" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-gutters": { backgroundColor: "var(--surface-soft)", color: "var(--text-secondary)", borderRight: "1px solid var(--border)" },
            ".cm-activeLine": { backgroundColor: "rgba(174, 190, 210, .13)" },
            ".cm-activeLineGutter": { backgroundColor: "rgba(174, 190, 210, .2)", color: "var(--deep-blue)" },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(174, 190, 210, .38) !important" },
            ".cm-searchMatch": { backgroundColor: "rgba(196, 174, 124, .35)" },
            ".cm-panels": { backgroundColor: "var(--surface-soft)", color: "var(--text-main)" },
            ".cm-panels input": { backgroundColor: "var(--surface)", border: "1px solid var(--border)" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (!update.docChanged && !update.selectionSet) return;
            const currentView = update.view;
            const selection = currentView.state.selection.main;
            emitPosition(currentView);
            const wrapper = wrapperRef.current?.getBoundingClientRect();
            if (!wrapper) return;
            if (!selection.empty) {
              const startCoords = currentView.coordsAtPos(selection.from);
              const endCoords = currentView.coordsAtPos(selection.to);
              if (startCoords && endCoords) setSelectionMenu({ x: Math.max(12, (startCoords.left + endCoords.right) / 2 - wrapper.left), y: Math.max(8, startCoords.top - wrapper.top - 44) });
              setSlash(null);
            } else {
              setSelectionMenu(null);
              const line = currentView.state.doc.lineAt(selection.head);
              const before = currentView.state.sliceDoc(line.from, selection.head);
              const match = before.match(/^\/([^\s]*)$/u);
              const coords = currentView.coordsAtPos(selection.head);
              if (match && coords) setSlash({ query: match[1], from: line.from, to: line.to, x: coords.left - wrapper.left, y: coords.bottom - wrapper.top + 6 });
              else setSlash(null);
            }
            if (typewriterRef.current && update.selectionSet) currentView.dispatch({ effects: EditorView.scrollIntoView(selection.head, { y: "center" }) });
          }),
          EditorView.domEventHandlers({ scroll: (_event, currentView) => { emitPosition(currentView); return false; } }),
        ],
      }),
    });
    viewRef.current = view;
    window.requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = initial.initialScrollTop;
      view.focus();
      emitPosition(view);
    });
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: lineNumberCompartment.current.reconfigure(lineNumbersVisible ? [lineNumbers(), highlightActiveLineGutter()] : []) });
  }, [lineNumbersVisible]);

  const runCommand = (command: MarkdownCommand) => {
    const view = viewRef.current;
    if (!view) return;
    if (slash) {
      view.dispatch({ changes: { from: slash.from, to: slash.to, insert: "" }, selection: { anchor: slash.from } });
      setSlash(null);
    }
    applyMarkdownCommand(view, command);
  };

  useImperativeHandle(forwardedRef, () => ({
    focus: () => viewRef.current?.focus(),
    applyCommand: runCommand,
    undo: () => { if (viewRef.current) undo(viewRef.current); },
    redo: () => { if (viewRef.current) redo(viewRef.current); },
    openSearch: () => { if (viewRef.current) openSearchPanel(viewRef.current); },
    insertText: (text) => {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      view.dispatch({ changes: { from: selection.from, to: selection.to, insert: text }, selection: { anchor: selection.from + text.length }, scrollIntoView: true });
      view.focus();
    },
    getPosition: () => {
      const view = viewRef.current;
      if (!view) return { cursorFrom: 0, cursorTo: 0, line: 1, column: 1, scrollTop: 0 };
      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.head);
      return { cursorFrom: selection.from, cursorTo: selection.to, line: line.number, column: selection.head - line.from + 1, scrollTop: view.scrollDOM.scrollTop };
    },
    scrollToHeading: (from) => {
      const view = viewRef.current;
      if (!view) return;
      const position = Math.min(from, view.state.doc.length);
      view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: "start", yMargin: 32 }) });
      view.focus();
    },
  }));

  return (
    <div className="markdown-editor" ref={wrapperRef} onKeyDownCapture={(event) => { if (event.key === "Escape") { setSlash(null); setSelectionMenu(null); } }}>
      <div ref={hostRef} className="markdown-editor-host" />
      {slash ? <SlashCommandMenu query={slash.query} position={slash} onSelect={runCommand} /> : null}
      {selectionMenu && !slash ? <SelectionMenu position={selectionMenu} onSelect={runCommand} /> : null}
    </div>
  );
});
