import { motion } from 'framer-motion';
import { useWindows } from '../../contexts/WindowContext';

interface ProfileMenuProps {
  onClose: () => void;
  onLogout?: () => void;
}

export const ProfileMenu = ({ onClose, onLogout }: ProfileMenuProps) => {
  const { activeWindows, windowConfigs } = useWindows();

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '72px',
          left: '24px',
          width: '240px',
          background: 'var(--schemes-surface-container)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '8px',
          boxShadow: 'var(--elevation-light-4)',
          border: '1px solid var(--schemes-outline-variant)',
          zIndex: 9999
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--schemes-outline-variant)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--schemes-on-surface)' }}>Magnolia Admin</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)' }}>Magnolia Dashboard User</p>
        </div>
        <button
          onClick={async () => {
            // Immediate Steel Persistence before logout
            import('@tauri-apps/api/core').then(async ({ invoke }) => {
              try {
                await invoke('save_session', {
                  userId: 'default_user',
                  state: { windows: activeWindows, configs: windowConfigs }
                });
              } catch (e) {
                console.error("Session archival failed during logout:", e);
              }
              onLogout?.();
            });
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '16px',
            color: 'var(--schemes-error)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            marginTop: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--schemes-error-container)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Logout & Exit
        </button>
      </motion.div>
    </div>
  );
};
