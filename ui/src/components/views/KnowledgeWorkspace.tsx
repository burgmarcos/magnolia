import { useState } from 'react';
import { FolderOpen, Loader2, CheckCircle2, Search, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './KnowledgeWorkspace.module.css';

interface IngestionItem {
  id: string;
  filename: string;
  path: string;
  status: 'pending' | 'scanning' | 'indexed' | 'failed';
}

export function KnowledgeWorkspace() {
  const [directoryPath, setDirectoryPath] = useState<string>('');
  
  // MOCK DATA for Agent 2 to wire up:
  // Once the backend indexer is built, querying the database or local directory
  // should return the state of parsing files.
  const [mockFiles] = useState<IngestionItem[]>([
    { id: '1', filename: 'architecture.md', path: '/docs/architecture.md', status: 'indexed' },
    { id: '2', filename: 'meeting-notes-june.md', path: '/notes/meeting-notes-june.md', status: 'scanning' },
    { id: '3', filename: 'project-ideas.md', path: '/ideas/project-ideas.md', status: 'pending' },
  ]);

  const handleBrowse = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Knowledge Workspace folder'
      });

      if (selectedPath && !Array.isArray(selectedPath)) {
        setDirectoryPath(selectedPath);
        toast.success('Workspace folder selected');
        // FIXME: Hey Core Agent (Agent 2)! 
        // Hook this up to `invoke('start_indexer', { path: selectedPath })`
      }
    } catch (e) {
      console.error("Failed to open dialog:", e);
      toast.error(`Failed to pick folder: ${String(e)}`);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Knowledge Workspace</h2>
      
      {/* File browser matching the aesthetics of our search bars */}
      <div className={styles.searchContainer}>
        <FolderOpen size={20} color="var(--schemes-on-surface-variant)" />
        <input 
          type="text" 
          className={styles.pathInput}
          placeholder="No folder selected. Click Browse..."
          value={directoryPath}
          readOnly
        />
        <button className={styles.browseButton} onClick={handleBrowse}>
          <Search size={18} />
          Browse
        </button>
      </div>

      {/* Backend placeholder note */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(255, 0, 0, 0.05)', borderRadius: '8px', border: '1px dashed var(--schemes-outline)' }}>
        <Settings size={20} color="var(--schemes-error)" />
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--schemes-error)' }}>
          <strong>Core Agent 2:</strong> This UI is mocked. Please configure <code>rusqlite</code> and wire up the backend folder parser replacing `mockFiles`.
        </p>
      </div>

      {/* List of Files Indexed */}
      <div className={styles.cardList}>
        {mockFiles.map(file => (
          <div key={file.id} className={styles.horizontalCard}>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>{file.filename}</p>
              <p className={styles.cardDescription}>{file.path}</p>
            </div>
            
            <div className={`${styles.statusIndicator} ${file.status === 'indexed' ? styles.statusIndexed : styles.statusPending}`}>
              {file.status === 'indexed' && <CheckCircle2 size={20} />}
              {file.status === 'scanning' && <><Loader2 className={styles.spinner} size={20} /> Scanning...</>}
              {file.status === 'pending' && <span>Pending</span>}
              {file.status === 'failed' && <span>Failed</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
