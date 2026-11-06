import { useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { CheckIcon, PlayIcon, ResetIcon } from '../../components/ui/Icons';
import { usePackets } from '../../lib/usePackets';
import { DemoLayout, randomHex, sleep } from './DemoLayout';

type Phase = 'Pending' | 'ContainerCreating' | 'Running';
interface Pod {
  name: string;
  node: number | null;
  phase: Phase;
}
type Comp = 'kubectl' | 'api' | 'etcd' | 'scheduler' | 'controller' | 'kubelet';

export function ClusterDemo() {
  const { t } = useI18n();
  const c = t.cluster;
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [pods, setPods] = useState<Pod[]>([]);
  const [glow, setGlow] = useState<Comp | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const run = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const fly = usePackets(stage);
  const el = {
    kubectl: useRef<HTMLDivElement>(null),
    api: useRef<HTMLDivElement>(null),
    etcd: useRef<HTMLDivElement>(null),
    scheduler: useRef<HTMLDivElement>(null),
    controller: useRef<HTMLDivElement>(null),
    nodes: [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)],
  };

  const reset = () => {
    run.current++;
    setStep(-1);
    setPods([]);
    setGlow(null);
    setLog([]);
    setBusy(false);
  };

  const apply = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setBusy(true);
    setPods([]);
    setLog([]);
    const rs = randomHex(10);

    setStep(0);
    setGlow('kubectl');
    await fly([el.kubectl.current, el.api.current], 'req', 800);
    if (!alive()) return;
    setGlow('api');
    setLog(['deployment.apps/web created']);
    await sleep(500);

    setStep(1);
    await fly([el.api.current, el.etcd.current], 'req', 600);
    if (!alive()) return;
    setGlow('etcd');
    await sleep(600);

    setStep(2);
    setGlow('controller');
    await fly([el.controller.current, el.api.current], 'req', 600);
    if (!alive()) return;
    const created: Pod[] = Array.from({ length: 3 }, () => ({ name: `web-${rs}-${randomHex(5)}`, node: null, phase: 'Pending' }));
    setPods(created);
    await sleep(800);

    setStep(3);
    setGlow('scheduler');
    for (let i = 0; i < 3; i++) {
      await fly([el.scheduler.current, el.nodes[i].current], 'req', 520);
      if (!alive()) return;
      setPods((list) => list.map((p, k) => (k === i ? { ...p, node: i, phase: 'ContainerCreating' } : p)));
    }
    await sleep(400);

    setStep(4);
    setGlow('kubelet');
    for (let i = 0; i < 3; i++) {
      await sleep(550);
      if (!alive()) return;
      setPods((list) => list.map((p, k) => (k === i ? { ...p, phase: 'Running' } : p)));
    }
    await sleep(300);
    setStep(5);
    setGlow(null);
    setBusy(false);
  };

  const g = (k: Comp) => (glow === k ? ' is-glow' : '');
  const pending = pods.filter((p) => p.node === null);

  return (
    <DemoLayout title={c.title} desc={c.desc} points={c.points}>
      <div className="cl-stage" ref={stage}>
        <div className={`cl-kubectl${g('kubectl')}`} ref={el.kubectl}>
          <span className="term-prompt">$</span> kubectl apply
          {log.map((l) => (
            <div key={l} className="cl-kubectl-out">
              {l}
            </div>
          ))}
        </div>
        <div className="cl-cp">
          <span className="zone-label">{c.controlPlane}</span>
          <div className="cl-comps">
            <div className={`cl-comp is-api${g('api')}`} ref={el.api}>
              {c.comps.api}
            </div>
            <div className={`cl-comp${g('etcd')}`} ref={el.etcd}>
              {c.comps.etcd}
            </div>
            <div className={`cl-comp${g('scheduler')}`} ref={el.scheduler}>
              {c.comps.scheduler}
            </div>
            <div className={`cl-comp${g('controller')}`} ref={el.controller}>
              {c.comps.controller}
            </div>
          </div>
          <div className="cl-pending">
            {pending.map((p) => (
              <span key={p.name} className="k-pod is-Pending sm">
                {p.name.slice(-5)} · {c.pending}
              </span>
            ))}
          </div>
        </div>
        <div className="cl-nodes">
          {[0, 1, 2].map((n) => (
            <div key={n} className="cl-node" ref={el.nodes[n]}>
              <div className="cl-node-head">
                <span>node-{n + 1}</span>
                <span className={`cl-kubelet${g('kubelet')}`}>{c.comps.kubelet}</span>
              </div>
              <div className="cl-node-pods">
                {pods
                  .filter((p) => p.node === n)
                  .map((p) => (
                    <span key={p.name} className={`k-pod is-${p.phase}`}>
                      {p.phase === 'ContainerCreating' && <span className="spin" />}
                      {p.name.slice(-5)}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ol className="cl-steps">
        {c.steps.map((s, i) => (
          <li key={i} className={step === i ? 'is-active' : step > i ? 'is-done' : ''}>
            <span className="cl-step-mark">{step > i ? <CheckIcon width={13} height={13} /> : step === i ? <span className="spin" /> : i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className={`stage-msg${step === 5 ? ' is-ok' : ''}`}>{step === 5 ? c.done : c.idle}</div>
      <div className="stage-controls">
        <Button variant="primary" icon={<PlayIcon />} loading={busy} onClick={apply}>
          <span className="mono-label">{busy ? c.applying : c.apply}</span>
        </Button>
        <Button variant="soft" icon={<ResetIcon />} onClick={reset} disabled={step === -1}>
          {c.reset}
        </Button>
      </div>
    </DemoLayout>
  );
}
