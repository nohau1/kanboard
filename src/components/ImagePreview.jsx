import { useState, useEffect } from 'react';

export function ImagePreview({ src, alt, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImage() {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
      } finally {
        setLoading(false);
      }
    }

    loadImage();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-content" onClick={e => e.stopPropagation()}>
        <button className="image-preview-close" onClick={onClose}>×</button>
        {loading ? (
          <div className="image-preview-loading">Загрузка...</div>
        ) : blobUrl ? (
          <img src={blobUrl} alt={alt} />
        ) : (
          <div className="image-preview-error">Не удалось загрузить изображение</div>
        )}
      </div>
    </div>
  );
}