import { useCallback, type RefObject } from 'react';

export type Tone = 'req' | 'ok' | 'bad';

/**
 * Animates small glowing "packets" between elements inside a positioned stage.
 * Each call creates its own dot, so several packets can be in flight at once.
 */
export function usePackets(stage: RefObject<HTMLElement>) {
  return useCallback(
    async (path: (HTMLElement | null)[], tone: Tone = 'req', ms = 700, fadeOut = false) => {
      const root = stage.current;
      if (!root || path.some((p) => !p)) return;
      const s = root.getBoundingClientRect();
      const pts = path.map((el) => {
        const r = el!.getBoundingClientRect();
        return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
      });
      const dot = document.createElement('span');
      dot.className = `packet is-${tone}`;
      root.appendChild(dot);
      try {
        await dot.animate(
          pts.map((p, i) => ({
            transform: `translate(${p.x}px, ${p.y}px) scale(${i === 0 ? 0.5 : 1})`,
            opacity: fadeOut && i === pts.length - 1 ? 0 : 1,
          })),
          { duration: ms, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' },
        ).finished;
      } catch {
        /* element removed mid-flight */
      }
      dot.remove();
    },
    [stage],
  );
}
