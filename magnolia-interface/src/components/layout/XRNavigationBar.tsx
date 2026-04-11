import { useState, useRef, useEffect } from 'react';
import { Grid, Home, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './XRNavigationBar.module.css';

interface XRNavigationBarProps {
  activeTab?: 'apps' | 'home' | 'updates';
  onTabChange?: (tab: 'apps' | 'home' | 'updates') => void;
}

export function XRNavigationBar({ activeTab = 'home', onTabChange }: XRNavigationBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleTabClick = (tab: 'apps' | 'home' | 'updates') => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // 300ms grace period to allow cursor to travel from Pill to Menu
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const navItems = [
    { id: 'apps', icon: Grid, label: 'Apps' },
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'updates', icon: Bell, label: 'Updates' },
  ] as const;

  return (
    <div 
      className={styles.hitArea} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className={styles.container}
        initial={false}
        animate={{
          width: isHovered ? 'auto' : '150px',
          padding: isHovered ? '8px 24px' : '0',
          borderRadius: isHovered ? '80px' : '100px',
          height: isHovered ? '80px' : '12px',
          opacity: 1,
          bottom: isHovered ? '40px' : '20px',
          backgroundColor: isHovered ? 'var(--schemes-surface-container)' : 'rgba(var(--primary-rgb), 0.7)'
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 0.8 }}
      >
        <AnimatePresence mode="wait">
          {!isHovered ? null : (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className={styles.menuItems}
            >
              {navItems.map((item) => (
                <div 
                  key={item.id}
                  className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                  onClick={() => handleTabClick(item.id)}
                >
                  <div className={`${styles.iconContainer} ${activeTab === item.id ? styles.iconContainerActive : ''}`}>
                    <item.icon 
                      size={24} 
                      color={activeTab === item.id ? "var(--schemes-on-surface)" : "var(--schemes-on-surface-variant)"} 
                    />
                  </div>
                  <p>{item.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
