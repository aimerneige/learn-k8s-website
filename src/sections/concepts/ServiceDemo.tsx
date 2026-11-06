import { useRef, useState } from 'react';
import { fmt, useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { BoxIcon, GlobeIcon, LockIcon } from '../../components/ui/Icons';
import { usePackets } from '../../lib/usePackets';
import { DemoLayout, sleep } from './DemoLayout';

type SvcType = 'ClusterIP' | 'NodePort' | 'LoadBalancer';
interface Pod {
  id: string;
  ip: string;
  label: 'web' | 'api';
}

const PODS: Pod[] = [
  { id: 'web-a1', ip: '10.244.1.12', label: 'web' },
  { id: 'web-b7', ip: '10.244.2.31', label: 'web' },
  { id: 'web-c4', ip: '10.244.3.8', label: 'web' },
  { id: 'api-x9', ip: '10.244.1.40', label: 'api' },
];

export function ServiceDemo() {
  const { t } = useI18n();
  const sv = t.service;
  const [type, setType] = useState<SvcType>('ClusterIP');
  const [pods, setPods] = useState(PODS);
  const [busy, setBusy] = useState(false);
  const [hit, setHit] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const rr = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const fly = usePackets(stage);
  const ref = {
    client: useRef<HTMLDivElement>(null),
    internet: useRef<HTMLDivElement>(null),
    edge: useRef<HTMLDivElement>(null),
    svc: useRef<HTMLDivElement>(null),
    pods: useRef<Record<string, HTMLButtonElement | null>>({}),
  };
  const endpoints = pods.filter((p) => p.label === 'web');

  const send = async (from: 'inside' | 'outside') => {
    setBusy(true);
    setMsg(null);
    if (from === 'outside' && type === 'ClusterIP') {
      await fly([ref.internet.current, ref.edge.current], 'req', 650);
      await fly([ref.edge.current, ref.internet.current], 'bad', 500);
      setMsg({ ok: false, text: sv.blocked });
      setBusy(false);
      return;
    }
    const start = from === 'inside' ? [ref.client.current] : [ref.internet.current, ref.edge.current];
    await fly([...start, ref.svc.current], 'req', from === 'inside' ? 600 : 900);
    if (!endpoints.length) {
      await fly([ref.svc.current, start[0]], 'bad', 500);
      setMsg({ ok: false, text: sv.noEndpoints });
      setBusy(false);
      return;
    }
    const pod = endpoints[rr.current++ % endpoints.length];
    await fly([ref.svc.current, ref.pods.current[pod.id]], 'req', 500);
    setHit(pod.id);
    await sleep(250);
    setHit(null);
    await fly([ref.pods.current[pod.id], ref.svc.current, ...[...start].reverse()], 'ok', 900);
    setMsg({ ok: true, text: fmt(sv.served, { pod: `${pod.id} (${pod.ip})` }) });
    setBusy(false);
  };

  const edgeLabel = type === 'NodePort' ? 'node:30080' : type === 'LoadBalancer' ? 'LB 203.0.113.10' : '✕';

  return (
    <DemoLayout title={sv.title} desc={sv.desc} points={sv.points}>
      <div className="stage-row">
        <span className="stage-label">{sv.type}</span>
        <Segmented
          ariaLabel={sv.type}
          value={type}
          onChange={(v) => {
            setType(v);
            setMsg(null);
          }}
          options={(['ClusterIP', 'NodePort', 'LoadBalancer'] as SvcType[]).map((v) => ({ value: v, label: v }))}
          disabled={busy}
        />
      </div>
      <p className="stage-hint">{sv.typeHints[type]}</p>
      <div className="sv-stage" ref={stage}>
        <div className="sv-internet" ref={ref.internet}>
          <GlobeIcon width={22} height={22} />
          <span>{sv.internet}</span>
        </div>
        <div className={`sv-cluster type-${type}`}>
          <span className="zone-label">cluster</span>
          <div className={`sv-edge${type === 'ClusterIP' ? ' is-closed' : ''}`} ref={ref.edge}>
            {edgeLabel ?? <LockIcon width={14} height={14} />}
          </div>
          <div className="sv-client" ref={ref.client}>
            <BoxIcon width={16} height={16} />
            <span>{sv.client}</span>
          </div>
          <div className="sv-svc" ref={ref.svc}>
            <strong>Service web</strong>
            <code>{type} · 10.96.0.12:80</code>
            <code className="sv-selector">selector: app=web</code>
            <div className="sv-endpoints">
              <span>{sv.endpoints}:</span>
              {endpoints.length ? endpoints.map((p) => <code key={p.id}>{p.ip}</code>) : <em>{sv.none}</em>}
            </div>
          </div>
          <div className="sv-pods">
            {pods.map((p) => (
              <button
                key={p.id}
                type="button"
                ref={(el) => (ref.pods.current[p.id] = el)}
                className={`sv-pod${p.label === 'web' ? ' is-selected' : ''}${hit === p.id ? ' is-hit' : ''}`}
                onClick={() => setPods((list) => list.map((x) => (x.id === p.id ? { ...x, label: x.label === 'web' ? 'api' : 'web' } : x)))}
                disabled={busy}
              >
                <span className="sv-pod-name">{p.id}</span>
                <code>app={p.label}</code>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="stage-hint">{sv.labelHint}</p>
      <div className={`stage-msg${msg ? (msg.ok ? ' is-ok' : ' is-bad') : ''}`} aria-live="polite">
        {msg ? msg.text : ' '}
      </div>
      <div className="stage-controls">
        <Button variant="primary" onClick={() => send('inside')} disabled={busy}>
          {sv.inside}
        </Button>
        <Button variant="soft" icon={<GlobeIcon />} onClick={() => send('outside')} disabled={busy}>
          {sv.outside}
        </Button>
      </div>
    </DemoLayout>
  );
}
