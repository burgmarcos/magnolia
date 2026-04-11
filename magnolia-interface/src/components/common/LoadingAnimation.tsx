import { motion } from 'framer-motion';

export function LoadingAnimation() {
  // Material 3 Expressive Morphing Shapes
  const shapes = [
    "M 50,20 C 70,20 80,30 80,50 C 80,70 70,80 50,80 C 30,80 20,70 20,50 C 20,30 30,20 50,20", // Rounded Square
    "M 50,10 C 72,10 90,28 90,50 C 90,72 72,90 50,90 C 28,90 10,72 10,50 C 10,28 28,10 50,10", // Circle
    "M 50,30 C 90,10 100,50 80,80 C 60,110 10,90 20,50 C 30,10 10,50 50,30" // Organic Blob
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <svg width="64" height="64" viewBox="0 0 100 100">
        <motion.path
          animate={{
            d: shapes,
            rotate: [0, 90, 180, 270, 360],
            fill: [
              'var(--schemes-primary)',
              'var(--schemes-secondary)',
              'var(--schemes-tertiary)',
              'var(--schemes-primary-container)',
              'var(--schemes-primary)'
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );
}

export function LinearExpressiveLoader() {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      height: '4px', 
      background: 'var(--schemes-surface-container-high)', 
      overflow: 'hidden',
      zIndex: 100 
    }}>
      <motion.div
        animate={{
          x: ["-100%", "200%"],
          width: ["20%", "60%", "20%"]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, transparent, var(--schemes-primary), transparent)',
          boxShadow: '0 0 8px var(--schemes-primary)'
        }}
      />
    </div>
  );
}
