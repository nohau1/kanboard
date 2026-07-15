import { useState, useEffect } from 'react';

const blobCache = new Map();

export function ImageWithAuth({ src, alt, className, onClick }) {
  const [blobUrl, setBlobUrl] = useState(() => blobCache.get(src) || null);
  const [loading, setLoading] = useState(!blobCache.has(src));

  useEffect(() => {
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadImage() {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok && !cancelled) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          blobCache.set(src, url);
          if (!cancelled) {
            setBlobUrl(url);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        if (!cancelled) setLoading(false);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (loading) {
    return <span className={className} style={{ display: 'inline-block', width: 120, height: 100, background: '#f0f0f0' }} />;
  }

  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}