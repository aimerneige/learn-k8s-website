import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { Stepper } from '../../components/ui/Stepper';
import { genService, type ServiceState, type SvcType } from '../../lib/genService';
import { Field, Group, Reveal, Toggle, useHoverTag } from './parts';

export function ServiceBuilder({ s, set, comments }: { s: ServiceState; set: (p: Partial<ServiceState>) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.service;
  const hover = useHoverTag();
  const lines = useMemo(() => genService(s, t, comments), [s, t, comments]);
  const external = s.type === 'NodePort' || s.type === 'LoadBalancer';

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>
        <Group title={p.groupService} tag="svc">
          <Field label={p.type} tag="type">
            <Select
              ariaLabel={p.type}
              value={s.type}
              onChange={(v: SvcType) => set({ type: v })}
              minWidth={230}
              options={(['ClusterIP', 'NodePort', 'LoadBalancer', 'Headless'] as SvcType[]).map((v) => ({ value: v, label: v, description: p.types[v] }))}
            />
          </Field>
          <Field label={p.port} tag="port">
            <Stepper value={s.port} min={1} max={65535} onChange={(v) => set({ port: v })} ariaLabel={p.port} />
          </Field>
          <Reveal show={s.type === 'NodePort'}>
            <Field label={p.nodePort} tag="nodePort">
              <Stepper value={s.nodePort} min={30000} max={32767} onChange={(v) => set({ nodePort: v })} ariaLabel={p.nodePort} />
            </Field>
          </Reveal>
          <Toggle tag="affinity" checked={s.affinity} onChange={(v) => set({ affinity: v })} label={p.affinity} hint={p.affinityHint} />
          <Reveal show={external}>
            <Toggle tag="local" checked={s.local} onChange={(v) => set({ local: v })} label={p.localTraffic} hint={p.localTrafficHint} />
          </Reveal>
        </Group>

        <Group title={p.groupIngress} hint={p.ingressHint} tag="ingress" enabled={s.ingress} onToggle={(v) => set({ ingress: v })}>
          <Field label={p.className} tag="className">
            <Segmented
              size="sm"
              ariaLabel={p.className}
              value={s.className}
              onChange={(v) => set({ className: v })}
              options={[
                { value: 'nginx', label: 'nginx' },
                { value: 'traefik', label: 'traefik' },
              ]}
            />
          </Field>
          <Field label={p.host} tag="host">
            <Select
              ariaLabel={p.host}
              value={s.host}
              onChange={(v) => set({ host: v })}
              minWidth={200}
              options={(['example.com', 'app.example.com', 'shop.example.com'] as const).map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label={p.path} tag="path">
            <Segmented size="sm" ariaLabel={p.path} value={s.path} onChange={(v) => set({ path: v })} options={(['/', '/api', '/app'] as const).map((v) => ({ value: v, label: v }))} />
          </Field>
          <Toggle tag="tls" checked={s.tls} onChange={(v) => set({ tls: v })} label={p.tls} hint={p.tlsHint} />
        </Group>

        <Group title={p.groupPolicy} tag="netpol">
          <Toggle tag="netpol" checked={s.netpol} onChange={(v) => set({ netpol: v })} label={p.netpol} hint={p.netpolHint} />
        </Group>
      </div>
      <div className="pg-output">
        <CodeView lines={lines} lang="yaml" filename="service.yaml" hoverTag={hover.tag} />
      </div>
    </div>
  );
}
