import { Settings, MessageSquare, Info, X, CloudRain, CalendarDays, Calculator, Globe, FolderOpen, FileText, Package, Clock, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemedIcon } from '../icons/ThemedIcon';
import styles from './AppsDrawer.module.css';

import type { WindowType } from '../../contexts/WindowContext';

interface AppsDrawerProps {
  onOpenApp: (type: WindowType, title: string) => void;
  onClose: () => void;
}

export function AppsDrawer({ onOpenApp, onClose }: AppsDrawerProps) {
  const apps = [
    { id: 'chat', title: 'Assistant', icon: MessageSquare, type: 'chat' as const },
    { id: 'browser', title: 'Browser', icon: Globe, type: 'browser' as const },
    { id: 'appstore', title: 'App Store', icon: Package, type: 'appstore' as const },
    { id: 'files', title: 'File Manager', icon: FolderOpen, type: 'files' as const },
    { id: 'editor', title: 'Text Editor', icon: FileText, type: 'editor' as const },
    { id: 'calculator', title: 'Calculator', icon: Calculator, type: 'calculator' as const },
    { id: 'clock', title: 'Clock', icon: Clock, type: 'clock' as const },
    { id: 'media', title: 'Media', icon: Music, type: 'media' as const },
    { id: 'pdf', title: 'PDF Reader', icon: FileText, type: 'pdf' as const },
    { id: 'settings', title: 'System Hub', icon: Settings, type: 'settings' as const },
    { id: 'weather', title: 'Weather', icon: CloudRain, type: 'weather' as const },
    { id: 'calendar', title: 'Calendar', icon: CalendarDays, type: 'calendar' as const },
    { id: 'about', title: 'About', icon: Info, type: 'about' as const },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.overlay} 
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 1 }}
        className={styles.drawer} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>Applications</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
        </div>
        
        <div className={styles.grid}>
          {apps.map((app, idx) => (
            <motion.div 
              key={app.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className={styles.appCard} 
              onClick={() => onOpenApp(app.type, app.title)}
            >
              <div className={styles.iconContainer}>
                <ThemedIcon icon={app.icon} size={36} />
              </div>
              <p className={styles.appLabel}>{app.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
