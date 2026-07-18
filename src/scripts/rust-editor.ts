// Self-hosted CodeMirror 6 Rust editor, themed to the site's Catppuccin tokens.
// This module is loaded lazily (dynamic import) the first time the kindle demo
// opens, so CodeMirror lives in its own chunk and costs nothing on page load.

import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { rust } from '@codemirror/lang-rust';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { themeColor } from './canvas';

export interface RustEditor {
  getCode(): string;
  setCode(code: string): void;
}

export function createRustEditor(
  parent: HTMLElement,
  initialCode: string,
  onSubmit: () => void,
): RustEditor {
  const accent = themeColor('accent');
  const text = themeColor('text');
  const subtext = themeColor('subtext');
  const border = themeColor('border');

  const mochaTheme = EditorView.theme(
    {
      '&': {
        backgroundColor: themeColor('base'),
        color: text,
        fontSize: '13px',
        height: '100%',
      },
      '.cm-content': { fontFamily: "'JetBrains Mono', monospace", padding: '12px 0' },
      '.cm-gutters': {
        backgroundColor: themeColor('base'),
        color: subtext,
        border: 'none',
        opacity: '0.6',
      },
      '.cm-activeLine': { backgroundColor: 'rgb(49 50 68 / 0.35)' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: text },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgb(203 166 247 / 0.25) !important',
      },
      '.cm-cursor': { borderLeftColor: accent },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { overflow: 'auto' },
    },
    { dark: true },
  );

  const mochaHighlight = HighlightStyle.define([
    { tag: tags.keyword, color: accent },
    { tag: tags.string, color: themeColor('green') },
    { tag: tags.number, color: themeColor('peach') },
    { tag: tags.comment, color: subtext, fontStyle: 'italic' },
    { tag: tags.typeName, color: themeColor('yellow') },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: themeColor('blue') },
    { tag: tags.macroName, color: themeColor('sky') },
    { tag: tags.operator, color: themeColor('sky') },
    { tag: tags.punctuation, color: subtext },
  ]);

  const view = new EditorView({
    parent,
    doc: initialCode,
    extensions: [
      basicSetup,
      rust(),
      mochaTheme,
      syntaxHighlighting(mochaHighlight),
      // Ctrl/Cmd+Enter compiles, matching the visible button.
      keymap.of([{ key: 'Mod-Enter', run: () => (onSubmit(), true) }]),
      EditorView.theme({ '&': { borderTop: `1px solid ${border}` } }),
    ],
  });

  return {
    getCode: () => view.state.doc.toString(),
    setCode: (code) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }),
  };
}
