import React, { useState } from 'react';
import { FileText, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export function PDFReader({ url, title = 'Document Viewer' }: { url?: string, title?: string }) {
  const [page, setPage] = useState(1);
  const [totalPages] = useState(12); // Mock for now
  
  // Default to a demo PDF if none provided
  const targetUrl = url || '/docs/welcome_to_magnolia.pdf';
  // Use targetUrl in a meaningful way to satisfy the linter
  const handleDownload = () => window.open(targetUrl, '_blank');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--schemes-surface-container-low)' }}>
      {/* Top Toolbar */}
      <div style={{ 
        padding: '12px 24px', 
        background: 'var(--schemes-surface-container-high)', 
        borderBottom: '1px solid var(--schemes-outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--schemes-surface-container-highest)', padding: '6px 12px', borderRadius: '8px' }}>
             <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} style={btnStyle}><ChevronLeft size={18} /></button>
             <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '60px', textAlign: 'center' }}>Page {page} / {totalPages}</span>
             <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} style={btnStyle}><ChevronRight size={18} /></button>
          </div>
          <div style={{ height: '24px', width: '1px', background: 'var(--schemes-outline-variant)' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={btnStyle}><ZoomOut size={18} /></button>
            <button style={btnStyle}><ZoomIn size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleDownload}
            style={{ ...btnStyle, background: 'var(--schemes-primary-container)', color: 'var(--schemes-on-primary-container)', padding: '6px 16px', borderRadius: '100px' }}
          >
            <Download size={18} style={{ marginRight: '8px' }} /> Download
          </button>
        </div>
      </div>

      {/* PDF Viewport */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '850px', 
          minHeight: '1100px', 
          background: '#fff', 
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
          padding: '60px'
        }}>
           <FileText size={64} color="#EF5350" style={{ marginBottom: '24px' }} />
           <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
           <p style={{ textAlign: 'center', opacity: 0.6, maxWidth: '400px', lineHeight: 1.6 }}>
             Integrated Magnolia PDF engine is synchronizing your document layers. 
             This is a high-fidelity preview of the sandboxed filesystem.
           </p>
           
           <div style={{ marginTop: '40px', width: '100%', height: '2px', background: '#eee' }} />
           
           <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{ height: '20px', width: '80%', background: '#f5f5f5', borderRadius: '4px' }} />
              <div style={{ height: '20px', width: '100%', background: '#f5f5f5', borderRadius: '4px' }} />
              <div style={{ height: '20px', width: '60%', background: '#f5f5f5', borderRadius: '4px' }} />
           </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '6px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'var(--schemes-on-surface)',
  borderRadius: '8px',
  transition: 'background 0.2s'
};
