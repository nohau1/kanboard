import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_STEP = 14;

export function ScrollableBoard({ children }) {
  const boardRef = useRef(null);
  const rafRef = useRef(null);
  const dirRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(max > 1 && el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    update();
    const frame = requestAnimationFrame(update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(() => requestAnimationFrame(update));
    mutationObserver.observe(el, { childList: true });

    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const stopScroll = useCallback(() => {
    dirRef.current = 0;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startScroll = useCallback((dir) => {
    if (dirRef.current === dir && rafRef.current) return;
    stopScroll();
    dirRef.current = dir;
    const step = () => {
      const el = boardRef.current;
      if (!el || dirRef.current === 0) return;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + dirRef.current * SCROLL_STEP));
      update();
      const atEnd = dirRef.current > 0 ? el.scrollLeft >= max - 1 : el.scrollLeft <= 1;
      if (atEnd) {
        stopScroll();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    step();
  }, [stopScroll, update]);

  useEffect(() => stopScroll, [stopScroll]);

  return (
    <div className="scroll-board">
      <div className="board" ref={boardRef}>
        {children}
      </div>
      <button
        type="button"
        className={`scroll-hint scroll-hint-left${canLeft ? ' is-visible' : ''}`}
        aria-label="Прокрутить влево"
        aria-hidden={!canLeft}
        tabIndex={canLeft ? 0 : -1}
        onMouseEnter={() => startScroll(-1)}
        onMouseLeave={stopScroll}
        onFocus={() => startScroll(-1)}
        onBlur={stopScroll}
        onClick={() => startScroll(-1)}
      >
        <span className="scroll-hint-arrow">‹</span>
      </button>
      <button
        type="button"
        className={`scroll-hint scroll-hint-right${canRight ? ' is-visible' : ''}`}
        aria-label="Прокрутить вправо"
        aria-hidden={!canRight}
        tabIndex={canRight ? 0 : -1}
        onMouseEnter={() => startScroll(1)}
        onMouseLeave={stopScroll}
        onFocus={() => startScroll(1)}
        onBlur={stopScroll}
        onClick={() => startScroll(1)}
      >
        <span className="scroll-hint-arrow">›</span>
      </button>
    </div>
  );
}
