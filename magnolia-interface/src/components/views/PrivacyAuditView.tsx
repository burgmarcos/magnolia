import { useState, useEffect } from 'react';
import { ShieldCheck, Clock, ShieldAlert, Fingerprint } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';

interface AuditEntry {
  timestamp: string;
  app_id: string;
  permission: string;
  status: string;
}

export function PrivacyAuditView() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await invoke<AuditEntry[]>('get_permission_history');
        setLogs(data);
      } catch (e) {
        console.error("Failed to fetch audit logs:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div style={{ padding: '40px', color: 'var(--schemes-primary)' }}>Scanning audit ledger...</div>;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--schemes-on-surface)', marginBottom: '8px' }}>Security Audit</h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px' }}>Transparent ledger of every permission request and hardware access on this device.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {logs.length > 0 ? (
          logs.map((log, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ 
                background: 'var(--schemes-surface-container-high)', 
                borderRadius: '20px', 
                padding: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                border: '1px solid var(--schemes-outline-variant)'
              }}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '16px', 
                background: log.status === 'Allowed' ? 'var(--schemes-primary-container)' : 'var(--schemes-error-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {log.status === 'Allowed' ? <ShieldCheck size={24} color="var(--schemes-primary)" /> : <ShieldAlert size={24} color="var(--schemes-error)" />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{log.app_id} • {log.permission}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
                    <Clock size={12} />
                    <span style={{ fontSize: '11px' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--schemes-on-surface-variant)' }}>
                  Hardware request was <strong style={{ color: log.status === 'Allowed' ? 'var(--schemes-primary)' : 'var(--schemes-error)' }}>{log.status}</strong> by Magnolia Supervisor.
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div style={{ padding: '80px', textAlign: 'center', opacity: 0.4 }}>
            <Fingerprint size={64} style={{ marginBottom: '24px' }} />
            <p>Your privacy ledger is clean. No permission events recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
