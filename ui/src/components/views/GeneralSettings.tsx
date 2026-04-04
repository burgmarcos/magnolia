import { ChevronRight } from 'lucide-react';
import styles from './GeneralSettings.module.css';

interface GeneralSettingsProps {
  onNavigate: (route: 'models' | 'telegram' | 'general' | 'knowledge') => void;
}

export function GeneralSettings({ onNavigate }: GeneralSettingsProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.header}>General</h2>
      
      <div className={styles.cardList}>
        <div 
          className={styles.horizontalCard} 
          onClick={() => onNavigate('models')}
          role="button"
          tabIndex={0}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Models</p>
            <p className={styles.cardDescription}>Download and manage local open-source LLMs</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>

        <div 
          className={styles.horizontalCard}
          onClick={() => onNavigate('telegram')}
          role="button"
          tabIndex={0}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Telegram Integrations</p>
            <p className={styles.cardDescription}>Configure your SLAI assistant to message via Telegram</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>

        <div 
          className={styles.horizontalCard}
          onClick={() => onNavigate('knowledge')}
          role="button"
          tabIndex={0}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Knowledge Base</p>
            <p className={styles.cardDescription}>Map a local folder to serve as the brain for RAG</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>
      </div>
    </div>
  );
}
