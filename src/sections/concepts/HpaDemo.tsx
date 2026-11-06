import { useEffect, useRef, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Segmented } from '../../components/ui/Segmented';
import { Slider } from '../../components/ui/Slider';
import { DemoLayout } from './DemoLayout';

const MIN = 1;
const MAX = 10;
const PER_POD = 200; // req/s one Pod handles at 100% CPU
const HISTORY = 60;

const cpuOf = (load: number, replicas: number) => Math.min(100, Math.round(5 + (load / replicas / PER_POD) * 95));

export function HpaDemo() {
  const { t } = useI18n();
  const h = t.hpa;
  const [load, setLoad] = useState(150);
  const [target, setTarget] = useState(50);
  const [replicas, setReplicas] = useState(2);
  const [hist, setHist] = useState<{ cpu: number; rep: number }[]>([]);
  const [status, setStatus] = useState<{ kind: 'up' | 'down' | 'steady' | 'cool' | 'limit'; n?: number }>({ kind: 'steady' });
  const state = useRef({ load, target, replicas, tick: 0, low: 0 });
  state.current.load = load;
  state.current.target = target;

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = state.current;
      s.tick++;
      const cpu = cpuOf(s.load, s.replicas);
      setHist((list) => [...list.slice(-(HISTORY - 1)), { cpu, rep: s.replicas }]);
      if (s.tick % 3 !== 0) return; // HPA evaluates periodically, not every tick
      const desired = Math.max(MIN, Math.min(MAX, Math.ceil((s.replicas * cpu) / s.target)));
      if (desired > s.replicas) {
        s.low = 0;
        s.replicas = desired;
        setReplicas(desired);
        setStatus({ kind: 'up', n: desired });
      } else if (desired < s.replicas) {
        s.low++;
        if (s.low >= 4) {
          s.low = 0;
          s.replicas = desired;
          setReplicas(desired);
          setStatus({ kind: 'down', n: desired });
        } else setStatus({ kind: 'cool' });
      } else {
        s.low = 0;
        setStatus(cpu > s.target && s.replicas === MAX ? { kind: 'limit', n: MAX } : { kind: 'steady' });
      }
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const cpu = cpuOf(load, replicas);
  const W = 600;
  const H = 150;
  const x = (i: number) => (i / (HISTORY - 1)) * W;
  const yCpu = (v: number) => H - (v / 100) * (H - 10) - 5;
  const yRep = (v: number) => H - (v / MAX) * (H - 10) - 5;
  const offset = HISTORY - hist.length;
  const line = (f: (p: { cpu: number; rep: number }) => number) => hist.map((p, i) => `${x(i + offset).toFixed(1)},${f(p).toFixed(1)}`).join(' ');

  const statusText =
    status.kind === 'up'
      ? fmt(h.scalingUp, { n: status.n! })
      : status.kind === 'down'
        ? fmt(h.scalingDown, { n: status.n! })
        : status.kind === 'cool'
          ? h.cooldown
          : status.kind === 'limit'
            ? fmt(h.limit, { n: MAX })
            : h.steady;

  return (
    <DemoLayout title={h.title} desc={h.desc} points={h.points}>
      <div className="hpa-top">
        <div className="hpa-stat">
          <span>{h.replicas}</span>
          <strong key={replicas} className="pop">
            {replicas}
          </strong>
          <small>
            {MIN}–{MAX}
          </small>
        </div>
        <div className={`hpa-stat${cpu > target + 15 ? ' is-hot' : cpu < target - 25 ? ' is-cool' : ''}`}>
          <span>{h.cpu}</span>
          <strong>{cpu}%</strong>
          <small>
            {h.target} {target}%
          </small>
        </div>
        <div className={`hpa-status is-${status.kind}`}>{statusText}</div>
      </div>
      <div className="hpa-pods">
        {Array.from({ length: MAX }, (_, i) => (
          <div key={i} className={`hpa-pod${i < replicas ? ' is-on' : ''}`}>
            <div className="hpa-pod-bar">
              <i style={{ height: i < replicas ? `${cpu}%` : 0 }} className={cpu > 85 ? 'is-hot' : ''} />
            </div>
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="hpa-chart">
        <div className="hpa-chart-head">
          <span>{h.chart}</span>
          <span className="hpa-legend">
            <i className="l-cpu" /> CPU <i className="l-rep" /> {h.replicas}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={h.chart}>
          <line x1="0" x2={W} y1={yCpu(target)} y2={yCpu(target)} className="hpa-target" />
          {hist.length > 1 && (
            <>
              <polyline points={line((p) => yRep(p.rep))} className="hpa-line-rep" />
              <polyline points={line((p) => yCpu(p.cpu))} className="hpa-line-cpu" />
            </>
          )}
        </svg>
      </div>
      <div className="stage-options">
        <div className="field is-stacked">
          <span className="field-text">
            <span className="field-label">{h.load}</span>
          </span>
          <Slider value={load} min={0} max={2400} step={50} onChange={setLoad} ariaLabel={h.load} format={(v) => fmt(h.rps, { n: v })} />
        </div>
        <div className="field">
          <span className="field-text">
            <span className="field-label">{h.target}</span>
            <span className="field-hint mono">averageUtilization</span>
          </span>
          <Segmented size="sm" ariaLabel={h.target} value={String(target)} onChange={(v) => setTarget(Number(v))} options={['50', '70', '90'].map((v) => ({ value: v, label: `${v}%` }))} />
        </div>
      </div>
    </DemoLayout>
  );
}
