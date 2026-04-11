import { Folder, ChevronRight, FileText, ArrowUp, FileCode, Edit2, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ask } from '@tauri-apps/plugin-dialog';
import styles from './FileManagerApp.module.css';

interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

export function FileManagerApp() {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [newName, setNewName] = useState('');

  const loadDirectory = async (path: string) => {
    try {
      const data = await invoke<FileEntry[]>('list_directory', { path });
      setEntries(data);
      setCurrentPath(path);
    } catch {
      console.error("Directory load failed");
    }
  };

  useEffect(() => {
    invoke<string>('ensure_default_knowledge_dir').then(path => {
      setCurrentPath(path);
      loadDirectory(path);
    });
   
  }, []);

  const handleEntryClick = async (entry: FileEntry) => {
    const newPath = currentPath + (currentPath.endsWith('\\') || currentPath.endsWith('/') ? '' : '/') + entry.name;
    if (entry.is_dir) {
      setHistory(prev => [...prev, currentPath]);
      loadDirectory(newPath);
    } else {
      const extension = entry.name.split('.').pop()?.toLowerCase();
      if (['txt', 'md', 'js', 'json', 'ts', 'tsx', 'css'].includes(extension || '')) {
        try {
          const content = await invoke<string>('read_text_file', { path: newPath });
          const event = new CustomEvent('Magnolia-open-app', {
            detail: { type: 'editor', title: entry.name, filename: entry.name, content, path: newPath }
          });
          window.dispatchEvent(event);
        } catch {
          toast.error("Failed to read file.");
          invoke('open_file', { path: newPath }).catch(console.error);
        }
      } else {
        invoke('open_file', { path: newPath }).catch(console.error);
      }
    }
  };

  const navigateToBreadcrumb = (index: number, parts: string[]) => {
    const isWindows = currentPath.includes('\\');
    const separator = isWindows ? '\\' : '/';
    let newPath = parts.slice(0, index + 1).join(separator);
    if (isWindows && index === 0 && !newPath.endsWith('\\')) newPath += '\\';
    setHistory(prev => [...prev, currentPath]);
    loadDirectory(newPath);
  };

  const goBack = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      loadDirectory(last);
    }
  };

  const handleRename = async () => {
    if (renameTarget && newName && newName !== renameTarget.name) {
      const oldPath = currentPath + (currentPath.endsWith('/') ? '' : '/') + renameTarget.name;
      const newPath = currentPath + (currentPath.endsWith('/') ? '' : '/') + newName;
      try {
        await invoke('rename_file', { oldPath, newPath });
        toast.success("Renamed successfully");
        setRenameTarget(null);
        loadDirectory(currentPath);
      } catch (e) {
        toast.error(`Rename failed: ${e}`);
      }
    } else {
      setRenameTarget(null);
    }
  };

  const handleDelete = async (entry: FileEntry) => {
    const confirmation = await ask(`Are you sure you want to delete ${entry.name}? This action is irreversible.`, {
      title: 'Delete File',
      kind: 'warning',
    });

    if (confirmation) {
      const path = currentPath + (currentPath.endsWith('/') ? '' : '/') + entry.name;
      try {
        await invoke('delete_file', { path });
        toast.success("Deleted successfully");
        loadDirectory(currentPath);
      } catch (e) {
        toast.error(`Delete failed: ${e}`);
      }
    }
  };

  const getFileIcon = (name: string, isDir: boolean) => {
    if (isDir) return <Folder size={48} color="var(--schemes-primary)" />;
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'md') return <FileText size={48} color="var(--schemes-primary)" />;
    if (ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'json' || ext === 'css') return <FileCode size={48} color="var(--schemes-secondary)" />;
    return <FileText size={48} color="var(--schemes-on-surface-variant)" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--schemes-surface-container-lowest)' }}>
      {/* Sidebar & Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--schemes-outline-variant)', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--schemes-surface-container)' }}>
        <button onClick={goBack} disabled={history.length === 0} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: history.length > 0 ? 1 : 0.3 }}><ArrowUp size={20} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--schemes-on-surface-variant)', fontSize: '13px', overflow: 'hidden', flex: 1 }}>
          <Folder size={16} />
          {(() => {
            const parts = currentPath.split(/[\\/]/).filter(Boolean);
            return parts.map((part, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={() => navigateToBreadcrumb(i, parts)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: i === parts.length - 1 ? 'var(--schemes-primary)' : 'inherit', fontWeight: i === parts.length - 1 ? 700 : 400 }}>{part}</button>
                {i < parts.length - 1 && <ChevronRight size={12} />}
              </span>
            ));
          })()}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '24px' }}>
          {entries.map(entry => (
            <div key={entry.name} className={styles.fileEntry} style={{ borderRadius: '24px', cursor: 'pointer', textAlign: 'center', padding: '16px', position: 'relative', background: 'var(--schemes-surface-container-high)', border: '1px solid var(--schemes-outline-variant)' }}>
              <div onClick={() => handleEntryClick(entry)} style={{ padding: '24px', borderRadius: '20px', background: entry.is_dir ? 'var(--schemes-primary-container)' : 'var(--schemes-secondary-container)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                {getFileIcon(entry.name, entry.is_dir)}
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--schemes-on-surface)', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: 'auto' }}>
                <button onClick={(e) => { e.stopPropagation(); setRenameTarget(entry); setNewName(entry.name); }} style={{ padding: '8px', borderRadius: '8px', background: 'var(--schemes-surface-container-highest)', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(entry); }} style={{ padding: '8px', borderRadius: '8px', background: 'var(--schemes-error-container)', border: 'none', cursor: 'pointer', color: 'var(--schemes-error)' }}><Trash2 size={16} /></button>
              </div>

              {!entry.is_dir && (
                <div style={{ fontSize: '10px', color: 'var(--schemes-on-surface-variant)', opacity: 0.6, marginTop: '8px' }}>
                  {formatSize(entry.size)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sovereign Rename Modal */}
      {renameTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'var(--schemes-surface-container)', padding: '32px', borderRadius: '32px', width: '400px', boxShadow: 'var(--elevation-light-5)', border: '1px solid var(--schemes-outline-variant)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--schemes-on-surface)' }}>Rename File</h3>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--schemes-surface-container-high)', border: '1px solid var(--schemes-outline)', color: 'var(--schemes-on-surface)', marginBottom: '24px', fontSize: '16px', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setRenameTarget(null)} style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', border: 'none', color: 'var(--schemes-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRename} style={{ padding: '12px 32px', borderRadius: '100px', background: 'var(--schemes-primary)', color: 'var(--schemes-on-primary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Rename</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
