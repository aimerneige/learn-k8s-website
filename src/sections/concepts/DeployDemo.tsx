import { useEffect, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { ResetIcon } from '../../components/ui/Icons';
import { DemoLayout, randomHex } from './DemoLayout';

type Phase = 'Pending' | 'ContainerCreating' | 'Running' | 'Terminating' | 'Unknown';
interface Pod {
  id: string;
  node: number;
  phase: Phase;
  age: number;
}
interface State {
  desired: number;
  nodes: boolean[];
  pods: Pod[];
}

const RS = randomHex(10);
const NODE_COUNT = 3;
const initial = (): State => ({
  desired: 3,
  nodes: [true, true, true],
  pods: [0, 1, 2].map((n) => ({ id: randomHex(5), node: n, phase: 'Running', age: 10 })),
});

const isAlive = (p: Pod, nodes: boolean[]) => nodes[p.node] && (p.phase === 'Pending' || p.phase === 'ContainerCreating' || p.phase === 'Running');

/** One reconcile tick: advance Pod phases, then take at most one corrective action. */
function tick(s: State): State {
  let pods = s.pods
    .map((p) => ({ ...p, age: p.age + 1 }))
    .map((p): Pod => {
      if (!s.nodes[p.node] && p.phase !== 'Terminating' && p.phase !== 'Unknown') return { ...p, phase: 'Unknown', age: 0 };
      if (p.phase === 'Pending' && p.age >= 2) return { ...p, phase: 'ContainerCreating', age: 0 };
      if (p.phase === 'ContainerCreating' && p.age >= 3) return { ...p, phase: 'Running', age: 0 };
      return p;
    })
    .filter((p) => !(p.phase === 'Terminating' && p.age >= 3) && !(p.phase === 'Unknown' && p.age >= 4));

  const alive = pods.filter((p) => isAlive(p, s.nodes));
  if (alive.length < s.desired) {
    const ready = s.nodes.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
    if (ready.length) {
      const load = (n: number) => alive.filter((p) => p.node === n).length;
      const node = ready.reduce((a, b) => (load(b) < load(a) ? b : a));
      pods = [...pods, { id: randomHex(5), node, phase: 'Pending', age: 0 }];
    }
  } else if (alive.length > s.desired) {
    const victim = alive[alive.length - 1];
    pods = pods.map((p) => (p.id === victim.id ? { ...p, phase: 'Terminating', age: 0 } : p));
  }
  return { ...s, pods };
}

export function DeployDemo() {
  const { t } = useI18n();
  const d = t.deploy;
  const [s, setS] = useState<State>(initial);

  useEffect(() => {
    const id = window.setInterval(() => setS(tick), 450);
    return () => window.clearInterval(id);
  }, []);

  const alive = s.pods.filter((p) => isAlive(p, s.nodes));
  const ready = alive.filter((p) => p.phase === 'Running').length;
  const inSync = alive.length === s.desired && ready === s.desired && s.pods.every((p) => p.phase === 'Running');

  const kill = (id: string) => setS((st) => ({ ...st, pods: st.pods.map((p) => (p.id === id && p.phase !== 'Terminating' ? { ...p, phase: 'Terminating', age: 0 } : p)) }));
  const toggleNode = (n: number) => setS((st) => ({ ...st, nodes: st.nodes.map((ok, i) => (i === n ? !ok : ok)) }));

  return (
    <DemoLayout title={d.title} desc={d.desc} points={d.points}>
      <div className="dp-top">
        <div className="dp-counters">
          <div>
            <span>{d.desired}</span>
            <strong>{s.desired}</strong>
          </div>
          <div>
            <span>{d.current}</span>
            <strong>{alive.length}</strong>
          </div>
          <div className={ready === s.desired ? 'is-ok' : 'is-warn'}>
            <span>{d.ready}</span>
            <strong>{ready}</strong>
          </div>
        </div>
        <div className={`dp-loop${inSync ? '' : ' is-acting'}`}>
          <ResetIcon width={16} height={16} className="dp-loop-icon" />
          <span>{d.reconcile}</span>
          <b>{inSync ? d.stable : d.acting}</b>
        </div>
      </div>
      <div className="dp-nodes">
        {Array.from({ length: NODE_COUNT }, (_, n) => (
          <div key={n} className={`dp-node${s.nodes[n] ? '' : ' is-down'}`}>
            <div className="dp-node-head">
              <span>node-{n + 1}</span>
              {!s.nodes[n] && <span className="dp-node-bad">{d.notReady}</span>}
            </div>
            <div className="dp-node-pods">
              {s.pods
                .filter((p) => p.node === n)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`k-pod is-${p.phase}`}
                    onClick={() => kill(p.id)}
                    disabled={p.phase === 'Terminating' || p.phase === 'Unknown'}
                    aria-label={fmt(d.deleteLabel, { name: `web-${RS}-${p.id}` })}
                  >
                    {p.phase === 'ContainerCreating' && <span className="spin" />}
                    <span className="k-pod-name">{p.id}</span>
                    <small>{p.phase === 'Unknown' ? 'Unknown' : d.phases[p.phase]}</small>
                  </button>
                ))}
            </div>
            <Button size="sm" variant={s.nodes[n] ? 'ghost' : 'soft'} onClick={() => toggleNode(n)}>
              {fmt(s.nodes[n] ? d.failNode : d.recoverNode, { node: `node-${n + 1}` })}
            </Button>
          </div>
        ))}
      </div>
      <p className="stage-hint">{d.killHint}</p>
      <div className="stage-options">
        <div className="field">
          <span className="field-text">
            <span className="field-label">{d.replicas}</span>
            <span className="field-hint mono">kubectl scale deployment web --replicas={s.desired}</span>
          </span>
          <Stepper value={s.desired} min={0} max={9} onChange={(v) => setS((st) => ({ ...st, desired: v }))} ariaLabel={d.replicas} />
        </div>
      </div>
    </DemoLayout>
  );
}
