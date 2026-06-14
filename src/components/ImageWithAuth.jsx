import { useState, useEffect } from 'react';

export function ImageWithAuth({ src, alt, className, onClick }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    
    async function loadImage() {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok && !cancelled) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!blobUrl) {
    return <span className={className} style={{ display: 'inline-block', width: 120, height: 100, background: '#f0f0f0' }}>Загрузка...</span>;
  }

  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}