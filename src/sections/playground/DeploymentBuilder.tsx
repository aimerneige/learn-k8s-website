import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { AlertIcon } from '../../components/ui/Icons';
import { genDeployment, type DeploymentState, type PullPolicy } from '../../lib/genDeployment';
import { Field, Group, Reveal, Toggle, useHoverTag } from './parts';

export function DeploymentBuilder({ s, set, comments }: { s: DeploymentState; set: (p: Partial<DeploymentState>) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.deployment;
  const hover = useHoverTag();
  const out = useMemo(() => genDeployment(s, t, comments), [s, t, comments]);
  const memOpts = [64, 128, 256, 512, 1024];

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>
        <Group title={p.groupBasic}>
          <Field label={p.image} tag="image">
            <Segmented
              size="sm"
              ariaLabel={p.image}
              value={s.image}
              onChange={(v) => set({ image: v })}
              options={[
                { value: 'nginx', label: p.images.nginx },
                { value: 'app', label: p.images.app },
              ]}
            />
          </Field>
          <Field label={p.namespace} tag="namespace">
            <Segmented
              size="sm"
              ariaLabel={p.namespace}
              value={s.namespace}
              onChange={(v) => set({ namespace: v })}
              options={(['default', 'staging', 'production'] as const).map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label={p.replicas} tag="replicas" stacked>
            <Slider value={s.replicas} min={1} max={10} step={1} ticks onChange={(v) => set({ replicas: v })} ariaLabel={p.replicas} format={(v) => `× ${v}`} />
          </Field>
          <Field label={p.pullPolicy} tag="pullPolicy">
            <Select
              ariaLabel={p.pullPolicy}
              value={s.pullPolicy}
              onChange={(v: PullPolicy) => set({ pullPolicy: v })}
              minWidth={250}
              options={(['IfNotPresent', 'Always', 'Never'] as PullPolicy[]).map((v) => ({ value: v, label: v, description: p.pullPolicies[v] }))}
            />
          </Field>
          <Toggle tag="labels" checked={s.labels} onChange={(v) => set({ labels: v })} label={p.labels} hint={p.labelsHint} />
          <Toggle tag="env" checked={s.env} onChange={(v) => set({ env: v })} label={p.env} hint={p.envHint} />
          <Toggle tag="envFrom" checked={s.envFrom} onChange={(v) => set({ envFrom: v })} label={p.envFrom} hint={p.envFromHint} />
          <Toggle tag="spread" checked={s.spread} onChange={(v) => set({ spread: v })} label={p.spread} hint={p.spreadHint} />
        </Group>

        <Group title={p.groupStrategy} tag="strategy">
          <Field label={p.strategy} tag="strategy">
            <Segmented
              size="sm"
              ariaLabel={p.strategy}
              value={s.strategy}
              onChange={(v) => set({ strategy: v })}
              options={[
                { value: 'RollingUpdate', label: 'RollingUpdate' },
                { value: 'Recreate', label: 'Recreate' },
              ]}
            />
          </Field>
          <Reveal show={s.strategy === 'RollingUpdate'}>
            <Field label={p.maxSurge} tag="strategy.surge">
              <Segmented size="sm" ariaLabel={p.maxSurge} value={s.maxSurge} onChange={(v) => set({ maxSurge: v })} options={(['0', '1', '25%'] as const).map((v) => ({ value: v, label: v }))} />
            </Field>
            <Field label={p.maxUnavailable} tag="strategy.unavailable">
              <Segmented size="sm" ariaLabel={p.maxUnavailable} value={s.maxUnavailable} onChange={(v) => set({ maxUnavailable: v })} options={(['0', '1', '25%'] as const).map((v) => ({ value: v, label: v }))} />
            </Field>
          </Reveal>
          {s.strategy === 'Recreate' && <p className="opt-note">{p.recreateHint}</p>}
        </Group>

        <Group title={p.groupResources}>
          <Toggle tag="requests" checked={s.requests} onChange={(v) => set({ requests: v })} label={p.requests} hint={p.requestsHint} />
          <Reveal show={s.requests || s.limits}>
            <Field label={p.cpu} tag="requests" stacked>
              <Slider value={s.cpu} min={50} max={2000} step={50} onChange={(v) => set({ cpu: v })} ariaLabel={p.cpu} format={(v) => `${v}m`} />
            </Field>
            <Field label={p.memory} tag="requests">
              <Segmented
                size="sm"
                ariaLabel={p.memory}
                value={String(s.memory)}
                onChange={(v) => set({ memory: Number(v) })}
                options={memOpts.map((v) => ({ value: String(v), label: v >= 1024 ? `${v / 1024}Gi` : `${v}Mi` }))}
              />
            </Field>
          </Reveal>
          <Toggle tag="limits" checked={s.limits} onChange={(v) => set({ limits: v })} label={p.limits} hint={p.limitsHint} />
        </Group>

        <Group title={p.groupHealth}>
          <Toggle tag="readiness" checked={s.readiness} onChange={(v) => set({ readiness: v })} label={p.readiness} hint={p.readinessHint} />
          <Toggle tag="liveness" checked={s.liveness} onChange={(v) => set({ liveness: v })} label={p.liveness} hint={p.livenessHint} />
          <Toggle tag="startup" checked={s.startup} onChange={(v) => set({ startup: v })} label={p.startup} hint={p.startupHint} />
        </Group>

        <Group title={p.groupSecurity}>
          <Toggle tag="nonRoot" checked={s.nonRoot} onChange={(v) => set({ nonRoot: v })} label={p.nonRoot} hint={p.nonRootHint} />
          <Toggle tag="readOnly" checked={s.readOnly} onChange={(v) => set({ readOnly: v })} label={p.readOnly} hint={p.readOnlyHint} />
          <Toggle tag="dropCaps" checked={s.dropCaps} onChange={(v) => set({ dropCaps: v })} label={p.dropCaps} hint={p.dropCapsHint} />
        </Group>
      </div>
      <div className="pg-output">
        <CodeView lines={out.lines} lang="yaml" filename="deployment.yaml" hoverTag={hover.tag} />
        {out.fixedZero && (
          <div className="notice">
            <AlertIcon width={16} height={16} />
            {p.bothZero}
          </div>
        )}
      </div>
    </div>
  );
}
