import { motion } from 'framer-motion';

interface ExpressiveLoaderProps {
  size?: number;
  color?: string;
}

export function ExpressiveLoader({ size = 48, color = 'var(--schemes-primary)' }: ExpressiveLoaderProps) {
  // Morphing paths for Circle, Rounded Square, and Organic Blob
  const shapes = [
    "M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10", // Circle
    "M 20 20 H 80 V 80 H 20 Z",                       // Square
    "M 50 20 C 80 20 90 40 90 50 C 90 70 70 90 50 90 C 30 90 10 70 10 50 C 10 30 20 20 50 20 Z", // Blob
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <motion.path
          d={shapes[0]}
          fill={color}
          animate={{
            d: shapes,
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
}
