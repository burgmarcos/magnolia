/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { FolderOpen, Loader2, CheckCircle2, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import styles from './KnowledgeWorkspace.module.css';

interface IngestionItem {
  id: string;
  filename: string;
  path: string;
  status: 'pending' | 'scanning' | 'indexed' | 'failed';
}

export function KnowledgeWorkspace() {
  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [items, setItems] = useState<IngestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async () => {
    try {
      const docs: any[] = await invoke('get_indexed_documents');
      // For now, assume all returned docs are 'indexed'
      setItems(docs.map(d => ({
        id: d.id,
        filename: d.filename,
        path: d.path,
        status: 'indexed' as const
      })));
    } catch (e) {
      console.error("Failed to fetch documents:", e);
      // toast.error("Failed to sync knowledge base");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
        setIsLoading(true);
        
        try {
          await invoke('index_local_folder', { path: selectedPath });
          toast.success('Indexing started');
          // Trigger embedding job and refresh list
          await invoke('trigger_embedding_job');
          await fetchItems();
        } catch (err) {
          toast.error(`Indexing failed: ${String(err)}`);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.error("Failed to open dialog:", e);
      toast.error(`Failed to pick folder: ${String(e)}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item from your knowledge base?")) return;
    
    try {
      await invoke('delete_knowledge_document', { doc_id: id });
      toast.success('Item removed');
      fetchItems();
    } catch (e) {
      toast.error(`Failed to delete: ${String(e)}`);
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
        <button className={styles.browseButton} disabled={isLoading} onClick={handleBrowse}>
          {isLoading ? <Loader2 className={styles.spinner} size={18} /> : <Search size={18} />}
          {isLoading ? 'Indexing...' : 'Browse'}
        </button>
      </div>

      {/* List of Files Indexed */}
      <div className={styles.cardList}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--schemes-on-surface-variant)' }}>
            <p>Your knowledge base is empty. Select a folder to start indexing.</p>
          </div>
        ) : (
          items.map(file => (
            <div key={file.id} className={styles.horizontalCard}>
              <div className={styles.cardContent}>
                <p className={styles.cardTitle}>{file.filename}</p>
                <p className={styles.cardDescription}>{file.path}</p>
              </div>
              
              <div className={styles.cardActions}>
                <div className={`${styles.statusIndicator} ${file.status === 'indexed' ? styles.statusIndexed : styles.statusPending}`}>
                  {file.status === 'indexed' && <CheckCircle2 size={18} />}
                  {file.status === 'scanning' && <Loader2 className={styles.spinner} size={18} />}
                  <span>{file.status.charAt(0).toUpperCase() + file.status.slice(1)}</span>
                </div>
                
                <button 
                  className={styles.deleteButton} 
                  onClick={() => handleDelete(file.id)}
                  aria-label="Delete knowledge item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
