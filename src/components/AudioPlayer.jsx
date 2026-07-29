import { useState, useRef } from 'react';

export function AudioPlayer({ src }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  async function toggle() {
    if (!audioRef.current) {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.addEventListener('ended', () => setPlaying(false));
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

  return (
    <span className="attachment-audio" onClick={toggle}>
      {playing ? '⏸' : '▶'} Аудио
    </span>
  );
}