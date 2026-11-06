import { useEffect, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { AlertIcon, PlayIcon, ResetIcon } from '../../components/ui/Icons';
import { DemoLayout, randomHex } from './DemoLayout';

type Phase = 'Pending' | 'Running' | 'Terminating' | 'ImagePullBackOff';
interface Pod {
  id: string;
  rev: number;
  phase: Phase;
  age: number;
}
interface Rev {
  n: number;
  tag: string;
  broken: boolean;
  hash: string;
}
type Strategy = 'RollingUpdate' | 'Recreate';
interface State {
  revs: Rev[];
  target: number;
  pods: Pod[];
}

const N = 4;
const initial = (): State => ({
  revs: [{ n: 1, tag: 'v1', broken: false, hash: randomHex(10) }],
  target: 1,
  pods: Array.from({ length: N }, () => ({ id: randomHex(5), rev: 1, phase: 'Running', age: 10 })),
});

function tick(s: State, strategy: Strategy, surge: number, unavail: number): State {
  const broken = (rev: number) => s.revs.find((r) => r.n === rev)?.broken;
  let pods = s.pods
    .map((p) => ({ ...p, age: p.age + 1 }))
    .map((p): Pod => (p.phase === 'Pending' && p.age >= 3 ? { ...p, phase: broken(p.rev) ? 'ImagePullBackOff' : 'Running', age: 0 } : p))
    .filter((p) => !(p.phase === 'Terminating' && p.age >= 2));

  const live = pods.filter((p) => p.phase !== 'Terminating');
  const fresh = live.filter((p) => p.rev === s.target);
  const old = live.filter((p) => p.rev !== s.target);
  const ready = live.filter((p) => p.phase === 'Running').length;
  const kill = (p: Pod) => (pods = pods.map((x) => (x.id === p.id ? { ...x, phase: 'Terminating', age: 0 } : x)));
  const add = () => (pods = [...pods, { id: randomHex(5), rev: s.target, phase: 'Pending', age: 0 }]);

  if (strategy === 'Recreate') {
    if (old.length) old.forEach(kill);
    else if (!pods.some((p) => p.phase === 'Terminating')) for (let i = fresh.length; i < N; i++) add();
    return { ...s, pods };
  }

  if (old.length) {
    // Prefer removing old Pods that are not serving anyway.
    const victim = old.find((p) => p.phase !== 'Running') ?? old[0];
    const after = ready - (victim.phase === 'Running' ? 1 : 0);
    if (after >= N - unavail) kill(victim);
  }
  if (fresh.length < N && live.length < N + surge) add();
  return { ...s, pods };
}

export function RolloutDemo() {
  const { t } = useI18n();
  const r = t.rollout;
  const [s, setS] = useState<State>(initial);
  const [strategy, setStrategy] = useState<Strategy>('RollingUpdate');
  const [surge, setSurge] = useState(1);
  const [unavail, setUnavail] = useState(1);
  const invalid = strategy === 'RollingUpdate' && surge === 0 && unavail === 0;

  useEffect(() => {
    if (invalid) return;
    const id = window.setInterval(() => setS((st) => tick(st, strategy, surge, unavail)), 520);
    return () => window.clearInterval(id);
  }, [strategy, surge, unavail, invalid]);

  const target = s.revs.find((x) => x.n === s.target)!;
  const nextGood = s.revs.filter((x) => !x.broken).length + 1;
  const deploy = (broken: boolean) =>
    setS((st) => {
      const n = st.revs.length + 1;
      return { ...st, revs: [...st.revs, { n, tag: broken ? 'v9-typo' : `v${nextGood}`, broken, hash: randomHex(10) }], target: n };
    });
  const undo = () =>
    setS((st) => {
      const prev = [...st.revs].reverse().find((x) => x.n !== st.target && !x.broken);
      return prev ? { ...st, target: prev.n } : st;
    });

  const live = s.pods.filter((p) => p.phase !== 'Terminating');
  const fresh = live.filter((p) => p.rev === s.target);
  const readyNew = fresh.filter((p) => p.phase === 'Running').length;
  const ready = live.filter((p) => p.phase === 'Running').length;
  const done = live.length === N && readyNew === N;
  const stuck = fresh.some((p) => p.phase === 'ImagePullBackOff');
  const status = done
    ? s.revs.length > 1
      ? r.status.done
      : fmt(r.status.idle, { v: target.tag })
    : stuck
      ? r.status.stuck
      : fmt(r.status.progress, { u: readyNew, n: N });

  const revsShown = [...new Set(s.pods.map((p) => p.rev))].sort((a, b) => a - b);

  return (
    <DemoLayout title={r.title} desc={r.desc} points={r.points}>
      <div className="stage-options two">
        <div className="field is-stacked">
          <span className="field-text">
            <span className="field-label">{r.strategy}</span>
          </span>
          <Segmented
            size="sm"
            ariaLabel={r.strategy}
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: 'RollingUpdate', label: 'RollingUpdate' },
              { value: 'Recreate', label: 'Recreate' },
            ]}
          />
        </div>
        <div className="field is-stacked">
          <span className="field-text">
            <span className="field-label mono">maxSurge</span>
          </span>
          <Segmented size="sm" ariaLabel="maxSurge" disabled={strategy === 'Recreate'} value={String(surge)} onChange={(v) => setSurge(Number(v))} options={['0', '1', '2'].map((v) => ({ value: v, label: v }))} />
        </div>
        <div className="field is-stacked">
          <span className="field-text">
            <span className="field-label mono">maxUnavailable</span>
          </span>
          <Segmented size="sm" ariaLabel="maxUnavailable" disabled={strategy === 'Recreate'} value={String(unavail)} onChange={(v) => setUnavail(Number(v))} options={['0', '1', '2'].map((v) => ({ value: v, label: v }))} />
        </div>
      </div>
      {invalid && (
        <div className="notice">
          <AlertIcon width={16} height={16} />
          {r.bothZero}
        </div>
      )}
      {strategy === 'Recreate' && <p className="stage-hint">{r.recreateHint}</p>}
      <div className="ro-sets">
        {revsShown.map((n) => {
          const rev = s.revs.find((x) => x.n === n)!;
          const pods = s.pods.filter((p) => p.rev === n);
          const isNew = n === s.target;
          return (
            <div key={n} className={`ro-set${isNew ? ' is-new' : ''}${rev.broken ? ' is-broken' : ''}`}>
              <div className="ro-set-head">
                <span className="ro-tag">{isNew ? r.newRs : r.oldRs}</span>
                <code>
                  web-{rev.hash} · web:{rev.tag}
                </code>
                <span className="ro-count">{pods.filter((p) => p.phase !== 'Terminating').length}</span>
              </div>
              <div className="ro-pods">
                {pods.map((p) => (
                  <span key={p.id} className={`k-pod is-${p.phase === 'ImagePullBackOff' ? 'Error' : p.phase}`}>
                    {p.phase === 'Pending' && <span className="spin" />}
                    <span className="k-pod-name">{p.id}</span>
                    <small>{p.phase === 'ImagePullBackOff' ? r.imagePull : t.deploy.phases[p.phase]}</small>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ro-meter">
        <span>
          {r.available} {ready}/{N}
        </span>
        <div className="ro-meter-bar">
          {Array.from({ length: N + 2 }, (_, i) => (
            <i key={i} className={i < ready ? 'is-on' : i < N ? '' : 'is-extra'} />
          ))}
        </div>
      </div>
      <div className={`stage-msg mono${ready === 0 ? ' is-bad' : done ? ' is-ok' : stuck ? ' is-bad' : ''}`} aria-live="polite">
        {ready === 0 ? r.downtime : status}
      </div>
      <div className="stage-controls">
        <Button variant="primary" icon={<PlayIcon />} onClick={() => deploy(false)} disabled={invalid}>
          {fmt(r.update, { v: `v${nextGood}` })}
        </Button>
        <Button variant="danger" icon={<AlertIcon />} onClick={() => deploy(true)} disabled={invalid || target.broken}>
          {r.broken}
        </Button>
        <Button variant="soft" icon={<ResetIcon />} onClick={undo} disabled={invalid || s.revs.length < 2}>
          <span className="mono-label">{r.undo}</span>
        </Button>
      </div>
    </DemoLayout>
  );
}
