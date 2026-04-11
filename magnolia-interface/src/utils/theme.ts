/**
 * Magnolia OS Dynamic Theme Engine
 * Extracts the dominant color from a given image URL and returns a theme-ready HSL object.
 */

export interface ThemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  surface: string;
  rgb: string;
}

export async function extractThemeFromImage(imgUrl: string): Promise<ThemeColors> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(getDefaultTheme());

      canvas.width = 100; // Small sample for performance
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);

      const imageData = ctx.getImageData(0, 0, 100, 100).data;
      let r = 0, g = 0, b = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
      }

      // Average color
      const count = imageData.length / 4;
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      // Boost saturation for a more "vibrant" primary
      const hsv = rgbToHsv(r, g, b);
      hsv.s = Math.min(0.8, hsv.s + 0.1); // Boost
      hsv.v = Math.max(0.4, hsv.v); // Ensure it's not too dark for primary

      const primaryHex = hsvToHex(hsv.h, hsv.s, hsv.v);
      
      resolve({
        primary: primaryHex,
        onPrimary: getContrastColor(r, g, b),
        primaryContainer: hsvToHex(hsv.h, 0.15, 0.95), // Light tint
        onPrimaryContainer: hsvToHex(hsv.h, 0.8, 0.3), // Darker version
        secondary: hsvToHex(hsv.h, 0.3, 0.5),
        surface: hsvToHex(hsv.h, 0.05, 0.98),
        rgb: `${r}, ${g}, ${b}`
      });
    };

    img.onerror = () => resolve(getDefaultTheme());
  });
}

function getDefaultTheme(): ThemeColors {
  return {
    primary: '#8E44AD', // Wisteria Purple (Primary Brand Color)
    onPrimary: '#FFFFFF',
    primaryContainer: '#D7BDE2', // Soft Lilac (Accent/Container)
    onPrimaryContainer: '#2E1A47', // Deep Indigo (Contrast)
    secondary: '#625b71',
    surface: '#FFFDF5', // Soft Cream (Base Surface)
    rgb: '142, 68, 173'
  };
}

// Helpers
function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getContrastColor(r: number, g: number, b: number) {
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1D1B20' : '#FFFFFF';
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}
