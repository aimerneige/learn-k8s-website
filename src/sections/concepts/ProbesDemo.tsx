import { useEffect, useRef, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { CheckIcon, XIcon } from '../../components/ui/Icons';
import { usePackets } from '../../lib/usePackets';
import { DemoLayout, sleep } from './DemoLayout';

type St = 'starting' | 'ready' | 'hung';
interface Pod {
  id: string;
  state: St;
  age: number;
  fails: number;
  restarts: number;
}

const START: Pod[] = ['p-4kx', 'p-9qz', 'p-2mr'].map((id) => ({ id, state: 'ready', age: 0, fails: 0, restarts: 0 }));

export function ProbesDemo() {
  const { t } = useI18n();
  const p = t.probes;
  const [pods, setPods] = useState<Pod[]>(START);
  const [readiness, setReadiness] = useState(false);
  const [liveness, setLiveness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState<{ ok: number; fail: number } | null>(null);
  const [flash, setFlash] = useState<Record<string, 'ok' | 'bad'>>({});
  const stage = useRef<HTMLDivElement>(null);
  const svc = useRef<HTMLDivElement>(null);
  const els = useRef<Record<string, HTMLDivElement | null>>({});
  const fly = usePackets(stage);
  const rr = useRef(0);
  const live = useRef(liveness);
  live.current = liveness;
  const latest = useRef(pods);
  latest.current = pods;

  useEffect(() => {
    const id = window.setInterval(() => {
      setPods((list) =>
        list.map((x) => {
          if (x.state === 'starting') return x.age >= 6 ? { ...x, state: 'ready', age: 0 } : { ...x, age: x.age + 1 };
          if (x.state === 'hung' && live.current) {
            const fails = x.fails + 1;
            return fails >= 3 ? { ...x, state: 'starting', age: 0, fails: 0, restarts: x.restarts + 1 } : { ...x, fails };
          }
          return x;
        }),
      );
    }, 650);
    return () => window.clearInterval(id);
  }, []);

  const inEndpoints = (x: Pod) => (readiness ? x.state === 'ready' : true);

  const pick = (from: St) => {
    const candidates = pods.filter((x) => x.state === from);
    return candidates[Math.floor(Math.random() * candidates.length)];
  };
  const restart = () => {
    const x = pick('ready');
    if (x) setPods((l) => l.map((y) => (y.id === x.id ? { ...y, state: 'starting', age: 0, restarts: y.restarts + 1 } : y)));
  };
  const hang = () => {
    const x = pick('ready');
    if (x) setPods((l) => l.map((y) => (y.id === x.id ? { ...y, state: 'hung', fails: 0 } : y)));
  };

  const send = async () => {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    setTally({ ok, fail });
    const flights: Promise<void>[] = [];
    for (let i = 0; i < 12; i++) {
      // Read the latest Pod states for every request.
      const current = latest.current;
      const targets = current.filter((x) => (readiness ? x.state === 'ready' : true));
      if (!targets.length) {
        fail++;
        setTally({ ok, fail });
        await sleep(150);
        continue;
      }
      const pod = targets[rr.current++ % targets.length];
      const good = pod.state === 'ready';
      flights.push(
        fly([svc.current, els.current[pod.id]], good ? 'ok' : 'bad', 420).then(() => {
          if (good) ok++;
          else fail++;
          setTally({ ok, fail });
          setFlash((f) => ({ ...f, [pod.id]: good ? 'ok' : 'bad' }));
          window.setTimeout(() => setFlash((f) => ({ ...f, [pod.id]: undefined as never })), 220);
        }),
      );
      await sleep(170);
    }
    await Promise.all(flights);
    setBusy(false);
  };

  return (
    <DemoLayout title={p.title} desc={p.desc} points={p.points}>
      <div className="stage-options two">
        <Switch checked={readiness} onChange={setReadiness} label={p.readiness} hint={p.readinessHint} />
        <Switch checked={liveness} onChange={setLiveness} label={p.liveness} hint={p.livenessHint} />
      </div>
      <div className="pr-stage" ref={stage}>
        <div className="pr-svc" ref={svc}>
          <strong>Service web</strong>
          <code>{pods.filter(inEndpoints).length} endpoints</code>
        </div>
        <div className="pr-pods">
          {pods.map((x) => {
            const traffic = inEndpoints(x);
            const readyOk = x.state === 'ready';
            const liveOk = x.state !== 'hung';
            return (
              <div key={x.id} ref={(el) => (els.current[x.id] = el)} className={`pr-pod is-${x.state}${traffic ? '' : ' is-out'}${flash[x.id] ? ` flash-${flash[x.id]}` : ''}`}>
                <div className="pr-pod-head">
                  <code>web-{x.id}</code>
                  <span className={`pr-state is-${x.state}`}>
                    {x.state === 'starting' && <span className="spin" />}
                    {p.states[x.state]}
                  </span>
                </div>
                {x.state === 'starting' && (
                  <div className="pr-boot">
                    <i style={{ width: `${(x.age / 6) * 100}%` }} />
                  </div>
                )}
                <div className="pr-probes">
                  <span className={!readiness ? 'is-off' : readyOk ? 'is-ok' : 'is-bad'}>
                    {readiness && (readyOk ? <CheckIcon width={12} height={12} /> : <XIcon width={12} height={12} />)} readiness
                  </span>
                  <span className={!liveness ? 'is-off' : liveOk ? 'is-ok' : 'is-bad'}>
                    {liveness && (liveOk ? <CheckIcon width={12} height={12} /> : <XIcon width={12} height={12} />)} liveness
                    {liveness && x.fails > 0 && ` ${x.fails}/3`}
                  </span>
                </div>
                <div className="pr-foot">
                  <span>{traffic ? p.inEndpoints : p.outEndpoints}</span>
                  <span>{fmt(p.restarts, { n: x.restarts })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`stage-msg${tally ? (tally.fail ? ' is-bad' : ' is-ok') : ''}`} aria-live="polite">
        {tally ? fmt(p.result, tally) : p.hint}
      </div>
      <div className="stage-controls">
        <Button variant="primary" onClick={send} loading={busy}>
          {p.send}
        </Button>
        <Button variant="soft" onClick={restart} disabled={!pods.some((x) => x.state === 'ready')}>
          {p.restart}
        </Button>
        <Button variant="danger" onClick={hang} disabled={!pods.some((x) => x.state === 'ready')}>
          {p.hang}
        </Button>
      </div>
    </DemoLayout>
  );
}
