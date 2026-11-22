export interface GoogleFontOption {
  family: string;
  category: 'Condensada' | 'Display' | 'Editorial Serif' | 'Geométrica' | 'Mono' | 'Experimental';
  weights: number[];
}

export const CURATED_GOOGLE_FONTS: GoogleFontOption[] = [
  {family: 'Anton', category: 'Condensada', weights: [400]},
  {family: 'Oswald', category: 'Condensada', weights: [300, 400, 500, 600, 700]},
  {family: 'Big Shoulders Display', category: 'Condensada', weights: [400, 600, 700, 800, 900]},
  {family: 'Bebas Neue', category: 'Condensada', weights: [400]},
  {family: 'Barlow Condensed', category: 'Condensada', weights: [400, 600, 700, 800, 900]},
  {family: 'Six Caps', category: 'Condensada', weights: [400]},
  {family: 'Fjalla One', category: 'Condensada', weights: [400]},

  {family: 'Syne', category: 'Display', weights: [500, 600, 700, 800]},
  {family: 'Archivo Black', category: 'Display', weights: [400]},
  {family: 'Unbounded', category: 'Display', weights: [400, 600, 700, 800, 900]},
  {family: 'Dela Gothic One', category: 'Display', weights: [400]},
  {family: 'Climate Crisis', category: 'Experimental', weights: [400]},
  {family: 'Bungee', category: 'Display', weights: [400]},
  {family: 'Black Ops One', category: 'Display', weights: [400]},
  {family: 'Ultra', category: 'Display', weights: [400]},
  {family: 'Erica One', category: 'Experimental', weights: [400]},
  {family: 'Modak', category: 'Experimental', weights: [400]},

  {family: 'Playfair Display', category: 'Editorial Serif', weights: [400, 600, 700, 800, 900]},
  {family: 'Fraunces', category: 'Editorial Serif', weights: [400, 600, 700, 800, 900]},
  {family: 'Cormorant Garamond', category: 'Editorial Serif', weights: [400, 600, 700]},
  {family: 'Bodoni Moda', category: 'Editorial Serif', weights: [400, 600, 700, 900]},
  {family: 'Cinzel', category: 'Editorial Serif', weights: [400, 600, 700, 900]},
  {family: 'Abril Fatface', category: 'Editorial Serif', weights: [400]},
  {family: 'DM Serif Display', category: 'Editorial Serif', weights: [400]},

  {family: 'Bricolage Grotesque', category: 'Geométrica', weights: [400, 600, 700, 800]},
  {family: 'Outfit', category: 'Geométrica', weights: [400, 600, 700, 800, 900]},
  {family: 'Plus Jakarta Sans', category: 'Geométrica', weights: [400, 600, 700, 800]},
  {family: 'Righteous', category: 'Geométrica', weights: [400]},

  {family: 'JetBrains Mono', category: 'Mono', weights: [400, 600, 700, 800]},
  {family: 'Space Mono', category: 'Mono', weights: [400, 700]},
  {family: 'IBM Plex Mono', category: 'Mono', weights: [400, 600, 700]},
  {family: 'Rubik Mono One', category: 'Mono', weights: [400]},
  {family: 'Silkscreen', category: 'Experimental', weights: [400, 700]},
  {family: 'Rubik Glitch', category: 'Experimental', weights: [400]},
  {family: 'Monoton', category: 'Experimental', weights: [400]},
  {family: 'Chivo Mono', category: 'Mono', weights: [400, 600, 700, 900]},
];

const loadedFonts = new Set<string>();
const pendingFonts = new Map<string, Promise<boolean>>();

export async function loadGoogleFont(
  family: string,
  weights: number[] = [400, 600, 700, 800, 900]
): Promise<boolean> {
  const cleanFamily = family.trim();
  if (!cleanFamily) return false;

  const cacheKey = `${cleanFamily}:${weights.join(',')}`;
  if (loadedFonts.has(cacheKey)) {
    return true;
  }
  const existingPromise = pendingFonts.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      const encodedFamily = encodeURIComponent(cleanFamily).replace(/%20/g, '+');
      const curated = CURATED_GOOGLE_FONTS.find(
        (f) => f.family.toLowerCase() === cleanFamily.toLowerCase()
      );
      const weightList = curated ? curated.weights : weights;
      const weightParam = weightList.length > 0 ? `:wght@${weightList.join(';')}` : '';
      const href = `https://fonts.googleapis.com/css2?family=${encodedFamily}${weightParam}&display=swap`;

      const existingLink = document.querySelector(`link[data-gfont="${cleanFamily.toLowerCase()}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.gfont = cleanFamily.toLowerCase();
        document.head.appendChild(link);

        await new Promise<void>((resolve) => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
          setTimeout(resolve, 2500);
        });
      }

      if ('fonts' in document) {
        const loadPromises = weightList.slice(0, 3).map((w) =>
          document.fonts.load(`${w} 64px "${cleanFamily}"`).catch(() => [])
        );
        await Promise.all(loadPromises);
        await document.fonts.ready;
      }

      loadedFonts.add(cacheKey);
      return true;
    } catch {
      return false;
    } finally {
      pendingFonts.delete(cacheKey);
    }
  })();

  pendingFonts.set(cacheKey, promise);
  return promise;
}
