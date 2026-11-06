import { useI18n } from '../i18n';
import { Button } from './ui/Button';
import { ArrowRightIcon, PlayIcon } from './ui/Icons';

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden>
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grid-lines" />
      </div>
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="badge-pill">
            <span className="dot-live" />
            {t.hero.badge}
          </span>
          <h1>
            {t.hero.title}
            <br />
            <span className="grad-text">{t.hero.titleAccent}</span>
          </h1>
          <p className="hero-sub">{t.hero.subtitle}</p>
          <div className="hero-cta">
            <Button variant="primary" size="lg" icon={<PlayIcon />} onClick={() => go('concepts')}>
              {t.hero.start}
            </Button>
            <Button variant="outline" size="lg" iconRight={<ArrowRightIcon />} onClick={() => go('playground')}>
              {t.hero.playground}
            </Button>
          </div>
          <ul className="hero-features">
            {t.hero.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <ClusterScene />
      </div>
    </section>
  );
}

const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const NODES = [40, 155, 270];
const SLOTS = [
  [30, 228],
  [80, 228],
  [30, 276],
  [80, 276],
];
// Which slots hold a Pod in each node, and which Pod "crashes" and is replaced.
const PODS: { node: number; slot: number; heal?: boolean; d: number }[] = [
  { node: 0, slot: 0, d: 0.2 },
  { node: 0, slot: 1, d: 0.5 },
  { node: 0, slot: 2, d: 0.8 },
  { node: 1, slot: 0, d: 0.35 },
  { node: 1, slot: 1, d: 0.65, heal: true },
  { node: 1, slot: 3, d: 0.95 },
  { node: 2, slot: 0, d: 0.45 },
  { node: 2, slot: 2, d: 0.75 },
];
const SPOKES = Array.from({ length: 7 }, (_, i) => (i * 360) / 7);

function ClusterScene() {
  const { t } = useI18n();
  return (
    <div className="k8s-scene" aria-hidden>
      <svg viewBox="0 0 420 340" className="k8s-svg">
        <defs>
          <clipPath id="scene-clip">
            <rect x="0" y="0" width="420" height="340" rx="28" />
          </clipPath>
        </defs>
        <g clipPath="url(#scene-clip)">
          {NODES.map((x, i) => (
            <path key={i} className="scene-link" d={`M210 108 C210 150 ${x + 55} 150 ${x + 55} 190`} />
          ))}
          {NODES.map((x, i) => (
            <circle key={i} r="4.5" className="scene-packet">
              <animateMotion dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" path={`M210 108 C210 150 ${x + 55} 150 ${x + 55} 190`} />
            </circle>
          ))}
          <g className="scene-cp">
            <rect x="140" y="28" width="140" height="80" rx="18" className="scene-cp-box" />
            <g className="scene-wheel">
              <circle cx="210" cy="68" r="17" />
              {SPOKES.map((a) => (
                <g key={a} transform={`rotate(${a} 210 68)`}>
                  <path d="M210 60V42" />
                  <circle cx="210" cy="41" r="3" className="knob" />
                </g>
              ))}
              <circle cx="210" cy="68" r="5" className="knob" />
            </g>
          </g>
          {NODES.map((x, i) => (
            <g key={i} transform={`translate(${x} 0)`}>
              <rect x="0" y="190" width="110" height="122" rx="16" className="scene-node" />
              <text x="12" y="208" className="scene-node-label">
                node-{i + 1}
              </text>
              {SLOTS.map(([sx, sy], k) => (
                <polygon key={k} points={hex(sx, sy, 17)} className="scene-slot" />
              ))}
            </g>
          ))}
          {PODS.map((p, i) => {
            const [sx, sy] = SLOTS[p.slot];
            const cx = NODES[p.node] + sx;
            return (
              <g key={i} className={`scene-pod${p.heal ? ' is-heal' : ''}`} style={{ animationDelay: `${p.d}s`, transformOrigin: `${cx}px ${sy}px` }}>
                <polygon points={hex(cx, sy, 15)} />
                <circle cx={cx} cy={sy} r="4" className="pod-core" />
              </g>
            );
          })}
        </g>
      </svg>
      <div className="float-card fc1">
        <code>$ kubectl apply -f app.yaml</code>
      </div>
      <div className="float-card fc2">
        <span className="dot-ok" /> {t.hero.ready}
      </div>
    </div>
  );
}
