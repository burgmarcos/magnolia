import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Maximize2, Minimize2, X, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './AppWindow.module.css';

interface AppWindowProps {
  title: string;
  children?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
  defaultPosition?: { x: number, y: number };
  defaultSize?: { width: number, height: number };
  hideBackButton?: boolean;
  appIcon?: React.ComponentType<{ size?: number; color?: string }>;
  brandColor?: string;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export function AppWindow({ 
  title, 
  children, 
  onBack, 
  onClose,
  onMinimize,
  hideBackButton = false,
  appIcon: AppIcon,
  brandColor = 'var(--schemes-surface-container-high)',
  defaultPosition = { x: 530, y: 150 }, 
  defaultSize = { width: 524, height: 670 } 
}: AppWindowProps) {
  const [pos, setPos] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isZTop, setIsZTop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  const dragRef = useRef<{ isDragging: boolean, startX: number, startY: number, initialX: number, initialY: number } | null>(null);
  const resizeRef = useRef<{ isResizing: boolean, direction: ResizeDirection, startX: number, startY: number, initialSize: { width: number, height: number }, initialPos: { x: number, y: number } } | null>(null);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const onDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return; // Prevent dragging while maximized
    setIsZTop(true);
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y
    };
  };

  const onResizeStart = (direction: ResizeDirection, e: React.MouseEvent) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsZTop(true);
    resizeRef.current = {
      isResizing: true,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      initialSize: { ...size },
      initialPos: { ...pos }
    };
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (dragRef.current?.isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    }

    if (resizeRef.current?.isResizing) {
      const { direction, startX, startY, initialSize, initialPos } = resizeRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = initialPos.x;
      let newY = initialPos.y;

      if (direction?.includes('e')) newWidth = Math.max(300, initialSize.width + dx);
      if (direction?.includes('w')) {
        const delta = Math.min(initialSize.width - 300, dx);
        newWidth = initialSize.width - delta;
        newX = initialPos.x + delta;
      }
      if (direction?.includes('s')) newHeight = Math.max(200, initialSize.height + dy);
      if (direction?.includes('n')) {
        const delta = Math.min(initialSize.height - 200, dy);
        newHeight = initialSize.height - delta;
        newY = initialPos.y + delta;
      }

      setSize({ width: newWidth, height: newHeight });
      setPos({ x: newX, y: newY });
    }
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    if (dragRef.current) dragRef.current.isDragging = false;
    if (resizeRef.current) resizeRef.current.isResizing = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const windowStyle = useMemo(() => {
    if (isMaximized) {
      return {
        left: 0,
        top: 0,
        width: '100%',
        height: 'calc(100% - 80px)', // Exclude bottom navbar
        zIndex: isZTop ? 'var(--z-window-base, 10)' : 'var(--z-window-base, 10)',
        borderRadius: 0
      };
    }
    return {
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      zIndex: isZTop ? 100 : 'var(--z-window-base, 10)'
    };
  }, [isMaximized, pos, size, isZTop]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 10 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.2, 0, 0, 1], // Sovereign Motion 
        opacity: { duration: 0.3 },
        scale: { duration: 0.4 }
      }}
      className={`${styles.appWindow} ${isMaximized ? styles.maximized : ''}`} 
      style={windowStyle}
      onMouseDown={() => setIsZTop(true)}
    >
      {/* Resize Handles - Hide when maximized */}
      {!isMaximized && (
        <>
          <div className={`${styles.resizeHandle} ${styles.top}`} onMouseDown={(e) => onResizeStart('n', e)} />
          <div className={`${styles.resizeHandle} ${styles.bottom}`} onMouseDown={(e) => onResizeStart('s', e)} />
          <div className={`${styles.resizeHandle} ${styles.right}`} onMouseDown={(e) => onResizeStart('e', e)} />
          <div className={`${styles.resizeHandle} ${styles.left}`} onMouseDown={(e) => onResizeStart('w', e)} />
          <div className={`${styles.resizeHandle} ${styles.topRight}`} onMouseDown={(e) => onResizeStart('ne', e)} />
          <div className={`${styles.resizeHandle} ${styles.topLeft}`} onMouseDown={(e) => onResizeStart('nw', e)} />
          <div className={`${styles.resizeHandle} ${styles.bottomRight}`} onMouseDown={(e) => onResizeStart('se', e)} />
          <div className={`${styles.resizeHandle} ${styles.bottomLeft}`} onMouseDown={(e) => onResizeStart('sw', e)} />
        </>
      )}

      {/* App Bar / Drag Area */}
      <div className={styles.appBar} onMouseDown={onDragStart}>
        <div className={styles.controlsLeft}>
          {!hideBackButton && (
            <div className={styles.iconContainerBg} onClick={(e) => { e.stopPropagation(); handleBack(); }} style={{ cursor: 'pointer' }}>
              <ArrowLeft size={24} color="var(--schemes-on-surface)" />
            </div>
          )}
        </div>
        
        <div className={styles.titleContainer}>
          <p className={styles.titleText}>{title}</p>
        </div>
        
        <div className={styles.controlsRight}>
          <button 
            className={styles.iconButton} 
            onClick={(e) => { e.stopPropagation(); onMinimize?.(); }}
            aria-label="Minimize"
          >
            <Minus size={20} color="var(--schemes-on-surface)" />
          </button>
          <button 
            className={styles.iconButton} 
            onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            className={`${styles.iconButton} ${styles.closeButton}`} 
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            aria-label="Close"
          >
            <X size={20} color="var(--schemes-on-surface)" />
          </button>
        </div>
      </div>
      
      {/* Window Body */}
      <div className={styles.body}>
        {/* Splashscreen layer */}
        <motion.div 
          initial={false}
          animate={{ opacity: isLoading ? 1 : 0, pointerEvents: isLoading ? 'all' : 'none' }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{ 
            position: 'absolute', 
            inset: 0, 
            background: brandColor, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          {AppIcon && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: isLoading ? 1 : 1.2, opacity: isLoading ? 1 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
               <AppIcon size={64} color="var(--schemes-on-primary-container)" />
            </motion.div>
          )}
        </motion.div>
        {children}
      </div>
    </motion.div>
  );
}
