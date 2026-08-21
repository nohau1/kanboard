import { useState, useRef, useEffect } from 'react';

export function AudioPlayer({ src, downloadUrl, name }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function toggle(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!audioRef.current) {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
          audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
          audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0); });
          audio.addEventListener('pause', () => setPlaying(false));
          audioRef.current = audio;
        }
      } catch (err) {
        console.error('Audio load failed:', err);
        return;
      }
    }

    const audio = audioRef.current;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * (duration || 0);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }

  function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  return (
    <div className="attachment-audio-wrap" onMouseDown={e => e.stopPropagation()}>
      <div className="attachment-audio-controls">
        <button className="audio-play-btn" onMouseDown={e => e.stopPropagation()} onClick={toggle}>
                  {playing ? (
                    <svg width="10" height="12" viewBox="0 0 10 12"><rect x="0" y="0" width="3" height="12" rx="1" fill="white"/><rect x="7" y="0" width="3" height="12" rx="1" fill="white"/></svg>
                  ) : (
                    <svg width="10" height="12" viewBox="0 0 10 12" style={{ marginLeft: 2 }}><polygon points="0,0 10,6 0,12" fill="white"/></svg>
                  )}
                </button>
        <div className="audio-seek" onClick={handleSeek}>
          <div className="audio-seek-fill" style={{ width: duration ? (currentTime / duration * 100) + '%' : '0%' }} />
        </div>
        <span className="audio-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <a
          className="attachment-download-link"
          href={downloadUrl}
          onClick={e => e.stopPropagation()}
          title="Скачать"
        >⬇</a>
      </div>
      <div className="attachment-audio-name">{name}</div>
    </div>
  );
}