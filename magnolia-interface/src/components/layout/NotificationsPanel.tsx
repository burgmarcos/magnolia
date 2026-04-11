import { Bell, Info, X } from 'lucide-react';
import styles from './NotificationsPanel.module.css';

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const notifications = [
    { id: 1, title: 'System Ready', message: 'Magnolia Engine is online and ready for inference.', time: 'Just now', icon: true },
    { id: 2, title: 'Model Downloaded', message: 'Llama 3.1 8B has been successfully downloaded.', time: '10m ago', icon: true },
    { id: 3, title: 'Snapshot Captured', message: 'Your screenshot was saved to /data/pictures', time: '1h ago', imageUrl: '/wallpapers/vibrant_abstract.png' },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Bell size={20} />
            <h3>Notifications</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>
        
        <div className={styles.list}>
          {notifications.map(n => (
            <div key={n.id} className={styles.notification}>
              <div className={styles.iconBox}><Info size={18} /></div>
              <div className={styles.content}>
                <div className={styles.topRow}>
                  <p className={styles.notifTitle}>{n.title}</p>
                  <span className={styles.time}>{n.time}</span>
                </div>
                <p className={styles.message}>{n.message}</p>
                {n.imageUrl && (
                  <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--schemes-outline-variant)' }}>
                    <img src={n.imageUrl} alt="Notification media" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className={styles.empty}>All caught up!</p>
          )}
        </div>
      </div>
    </div>
  );
}
