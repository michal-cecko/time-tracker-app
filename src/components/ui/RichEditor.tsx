import { useEffect } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Icon } from './Icon';

export type RichDoc = JSONContent;

interface RichEditorProps {
  value?: RichDoc | null;
  onChange?: (doc: RichDoc) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Compact = smaller toolbar buttons, used in sheet/inspector contexts. */
  compact?: boolean;
}

/**
 * Tiptap-backed rich text editor. JSON in / JSON out — the document shape is
 * the same as Task.description and Project.description in Prisma. Render-only
 * usage: pass `readOnly` and no `onChange`.
 */
export function RichEditor({
  value,
  onChange,
  placeholder = 'Write a description…',
  readOnly = false,
  autoFocus,
  compact,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: readOnly,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    editable: !readOnly,
    autofocus: autoFocus ? 'end' : false,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  // Reconcile external value changes (e.g. async load) without resetting the
  // local cursor when the document is structurally identical to current.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(value ?? { type: 'doc', content: [] })) return;
    editor.commands.setContent(value ?? '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`rt-wrap ${readOnly ? 'rt-readonly' : ''} ${compact ? 'rt-compact' : ''}`}>
      {!readOnly && <RichToolbar editor={editor} />}
      <EditorContent editor={editor} className="rt-content" />
    </div>
  );
}

function RichToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, label: string, children: React.ReactNode) => (
    <button
      type="button"
      className={`rt-btn ${active ? 'on' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <div className="rt-toolbar">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Bold', <strong>B</strong>)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Italic', <em>I</em>)}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Strikethrough', <s>S</s>)}
      <span className="rt-sep" />
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Heading 1', 'H1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Heading 2', 'H2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Heading 3', 'H3')}
      <span className="rt-sep" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Bullet list', '•')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Ordered list', '1.')}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Quote', '"')}
      {btn(editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Code block', <code>{`</>`}</code>)}
      <span className="rt-sep" />
      {btn(editor.isActive('link'), () => {
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL (leave blank to remove)', previous ?? 'https://');
        if (url === null) return;
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }, 'Link', <Icon.More size={12} />)}
    </div>
  );
}

/** Renders a Tiptap JSON document read-only. */
export function RichRenderer({ value }: { value: RichDoc | null | undefined }) {
  if (!value || (Array.isArray(value.content) && value.content.length === 0)) return null;
  return <RichEditor value={value} readOnly compact />;
}

/** True when the JSON doc has no rendered content (empty editor produces this). */
export function isEmptyDoc(value: RichDoc | null | undefined): boolean {
  if (!value) return true;
  const c = value.content;
  if (!Array.isArray(c) || c.length === 0) return true;
  // A single empty paragraph is still empty.
  if (c.length === 1 && c[0].type === 'paragraph' && (!c[0].content || c[0].content.length === 0)) return true;
  return false;
}
