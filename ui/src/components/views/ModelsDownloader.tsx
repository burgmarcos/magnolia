import { useState, useEffect } from 'react';
import { Search, ArrowDownToLine, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { HardwareFitChip, type FitState } from '../widgets/HardwareFitChip.tsx';
import styles from './ModelsDownloader.module.css';

interface ModelItem {
  id: string;
  name: string;
  description: string;
  fit: FitState;
  status: 'available' | 'downloading' | 'installed';
  progress?: number;
}

export function ModelsDownloader() {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Load local models on mount
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<string[]>('get_local_models')
        .then(localModels => {
          const installed: ModelItem[] = localModels.map(name => ({
            id: name,
            name,
            description: 'Local model',
            fit: 'perfect', // TODO evaluate fit if possible
            status: 'installed'
          }));
          setModels(installed);
        })
        .catch(e => {
          toast.error(`Failed to load local models: ${String(e)}`);
        });
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<{id: string, size_on_disk_bytes: number}>('search_hf_models', { modelId: searchQuery });
      const fitStatus = await invoke<string>('assess_model_fit', { modelSizeBytes: info.size_on_disk_bytes });
      
      let fit: FitState = 'cannot-run';
      if (fitStatus === 'Fits Perfectly') fit = 'perfect';
      if (fitStatus === 'Needs Offload') fit = 'offload';

      setModels(prev => [
        {
          id: info.id,
          name: info.id.split('/').pop() || info.id,
          description: `Size: ${(info.size_on_disk_bytes / 1024 / 1024 / 1024).toFixed(2)} GB`,
          fit,
          status: 'available'
        },
        ...prev.filter(m => m.id !== info.id)
      ]);
    } catch (e) {
      console.error("Search failed:", e);
      toast.error(`Search failed: ${String(e)}`);
    } finally {
      setIsSearching(false);
    }
  };

  const downloadModel = async (model: ModelItem) => {
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'downloading', progress: 0 } : m));
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // A full URL would normally be determined by the HF tree API
      const url = `https://huggingface.co/${model.id}/resolve/main/model.gguf`;
      const filename = `${model.id.replace('/', '_')}.gguf`;
      
      toast.success(`Started downloading ${model.name}`);
      
      await invoke('download_model_file', { url, filename });

      setModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'installed', progress: 100 } : m));
      toast.success(`${model.name} downloaded successfully!`);
    } catch (e) {
      console.error("Download failed:", e);
      toast.error(`Download failed: ${String(e)}`);
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'available', progress: undefined } : m));
    }
  };

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Models</h2>
      
      {/* Search Bar matching Figma Node */}
      <div className={styles.searchContainer}>
        <Search size={20} color="var(--schemes-on-surface-variant)" className={styles.searchIcon} />
        <input 
          type="text" 
          className={styles.searchInput}
          placeholder="Search for a model to download"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {/* List of Models */}
      <div className={styles.cardList}>
        {isSearching ? (
          <>
            <div data-testid="skeleton-loader" className={styles.skeletonCard}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonDesc} />
            </div>
            <div data-testid="skeleton-loader" className={styles.skeletonCard}>
              <div className={styles.skeletonTitle} style={{ width: '30%' }} />
              <div className={styles.skeletonDesc} style={{ width: '50%' }} />
            </div>
          </>
        ) : filteredModels.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={48} opacity={0.5} />
            <p>No models found. Try searching for a HuggingFace Model ID.</p>
          </div>
        ) : (
          filteredModels.map(model => (
            <div key={model.id} className={styles.modelItemWrapper}>
              <div className={styles.horizontalCard}>
                <div className={styles.cardContent}>
                  <p className={styles.cardTitle}>{model.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <p className={styles.cardDescription}>{model.description}</p>
                    {/* Hardware Fit Indicator */}
                    <HardwareFitChip fitState={model.fit} />
                  </div>
                </div>
                
                {/* Media/Action Buttons */}
                <div className={styles.cardMedia}>
                  {model.status === 'available' || model.status === 'downloading' ? (
                    <button className={styles.actionIconButton} aria-label="Download Model" onClick={() => downloadModel(model)} disabled={model.status === 'downloading'}>
                      <ArrowDownToLine size={24} color="var(--schemes-on-surface)" />
                    </button>
                  ) : (
                    <button className={styles.actionIconButton} aria-label="Delete Model">
                      <Trash2 size={24} color="var(--schemes-on-surface)" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Download Progress Indicator (Wavy / Linear) */}
              {model.status === 'downloading' && model.progress !== undefined && (
                <div className={styles.progressWrapper}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${model.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
