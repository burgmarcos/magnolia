import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { X, Save, FileText, Download } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'react-hot-toast';

interface Props {
  filename: string;
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function FileEditor({ filename, content, onSave, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Extract system primary color for cursor and selection
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--schemes-primary').trim() || '#6750A4';

    const theme = EditorView.theme({
      "&": { height: "100%", fontSize: "14px" },
      ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
      ".cm-cursor": { borderLeftColor: primaryColor },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: `${primaryColor}33` }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        theme
      ]
    });

    const view = new EditorView({
      state,
      parent: containerRef.current
    });

    viewRef.current = view;

    return () => view.destroy();
  }, [content]);

  const handleSave = () => {
    if (viewRef.current) {
      onSave(viewRef.current.state.doc.toString());
    }
  };

  const handleSaveAs = async () => {
    if (!viewRef.current) return;
    
    try {
      const path = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'txt']
        }]
      });

      if (path) {
        const content = viewRef.current.state.doc.toString();
        await invoke('write_text_file', { path, content });
        toast.success('File saved');
      }
    } catch (e) {
      toast.error('Save As failed');
      console.error(e);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--schemes-surface-container-lowest)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--schemes-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--schemes-surface-container)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={18} color="var(--schemes-primary)" />
          <span style={{ fontWeight: 600, color: 'var(--schemes-on-surface)', fontSize: '14px' }}>{filename}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'var(--schemes-primary)',
              color: 'var(--schemes-on-primary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <Save size={16} /> Save
          </button>
          <button 
            onClick={handleSaveAs}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'var(--schemes-surface-container-high)',
              color: 'var(--schemes-on-surface)',
              border: '1px solid var(--schemes-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <Download size={16} /> Save As
          </button>
          <button 
            aria-label="Close"
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--schemes-on-surface-variant)'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
    </div>
  );
}
