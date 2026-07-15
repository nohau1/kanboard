import { useState, useEffect, useRef } from 'react';

export function ImagePreview({ src, alt, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const draggedRef = useRef(false);
  const imgRef = useRef(null);

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
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [src]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(prev => Math.max(0.2, Math.min(5, prev + delta)));
    setPan({ x: 0, y: 0 });
  }

  function handleMouseDown(e) {
    if (zoom > 1) {
      setDragging(true);
      draggedRef.current = false;
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }

  function handleMouseMove(e) {
    if (dragging && zoom > 1) {
      const dx = e.clientX - dragStart.x - pan.x;
      const dy = e.clientY - dragStart.y - pan.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) draggedRef.current = true;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function zoomIn() { setZoom(prev => Math.min(5, prev + 0.5)); }
  function zoomOut() { setZoom(prev => Math.max(0.2, prev - 0.5)); }
  function zoomReset() { setZoom(1); setPan({ x: 0, y: 0 }); }

  function handleImageClick(e) {
    e.stopPropagation();
    if (draggedRef.current) return;
    if (zoom > 1) { zoomReset(); } else { setZoom(2); }
  }

  return (
    <div className="image-preview-overlay" onMouseDown={onClose}>
      <div
        className="image-preview-content"
        onMouseDown={e => { e.stopPropagation(); handleMouseDown(e); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <button className="image-preview-close" onClick={onClose}>×</button>
        <div className="image-preview-zoom-controls">
          <button onClick={zoomOut}>−</button>
          <span onClick={zoomReset} style={{ cursor: 'pointer' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}>+</button>
        </div>
        {loading ? (
          <div className="image-preview-loading">Загрузка...</div>
        ) : blobUrl ? (
          <img
            ref={imgRef}
            src={blobUrl}
            alt={alt}
            onClick={handleImageClick}
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 0.15s',
              cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
          />
        ) : (
          <div className="image-preview-error">Не удалось загрузить изображение</div>
        )}
      </div>
    </div>
  );
}