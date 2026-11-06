import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CodeView } from '../../components/CodeView';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { Slider } from '../../components/ui/Slider';
import { Stepper } from '../../components/ui/Stepper';
import { genConfig, type AccessMode, type ConfigState } from '../../lib/genConfig';
import { Field, Group, Toggle, useHoverTag } from './parts';

export function ConfigBuilder({ s, set, comments }: { s: ConfigState; set: (p: Partial<ConfigState>) => void; comments: boolean }) {
  const { t } = useI18n();
  const p = t.playground.config;
  const hover = useHoverTag();
  const lines = useMemo(() => genConfig(s, t, comments), [s, t, comments]);

  return (
    <div className="pg">
      <div className="pg-controls" {...hover.handlers}>
        <p className="pg-intro">{p.intro}</p>
        <Group title={p.configMap} hint={p.configMapHint} tag="configMap" enabled={s.configMap} onToggle={(v) => set({ configMap: v })}>
          <Toggle tag="configFile" checked={s.configFile} onChange={(v) => set({ configFile: v })} label={p.configFile} hint={p.configFileHint} />
          <Toggle tag="immutable" checked={s.immutable} onChange={(v) => set({ immutable: v })} label={p.immutable} hint={p.immutableHint} />
        </Group>

        <Group title={p.secret} hint={p.secretHint} tag="secret" enabled={s.secret} onToggle={(v) => set({ secret: v })}>
          <Field label={p.encoding} tag="encoding">
            <Segmented
              size="sm"
              ariaLabel={p.encoding}
              value={s.encoding}
              onChange={(v) => set({ encoding: v })}
              options={[
                { value: 'stringData', label: p.encodings.stringData },
                { value: 'data', label: p.encodings.data },
              ]}
            />
          </Field>
        </Group>

        <Group title={p.pvc} hint={p.pvcHint} tag="pvc" enabled={s.pvc} onToggle={(v) => set({ pvc: v })}>
          <Field label={p.size} tag="size" stacked>
            <Slider value={s.size} min={1} max={100} step={1} onChange={(v) => set({ size: v })} ariaLabel={p.size} format={(v) => `${v} Gi`} />
          </Field>
          <Field label={p.accessMode} tag="accessMode">
            <Select
              ariaLabel={p.accessMode}
              value={s.accessMode}
              onChange={(v: AccessMode) => set({ accessMode: v })}
              minWidth={260}
              options={(['ReadWriteOnce', 'ReadWriteMany', 'ReadOnlyMany'] as AccessMode[]).map((v) => ({ value: v, label: v, description: p.accessModes[v] }))}
            />
          </Field>
          <Field label={p.storageClass} tag="storageClass">
            <Segmented size="sm" ariaLabel={p.storageClass} value={s.storageClass} onChange={(v) => set({ storageClass: v })} options={(['standard', 'fast-ssd', 'nfs'] as const).map((v) => ({ value: v, label: v }))} />
          </Field>
        </Group>

        <Group title={p.hpa} hint={p.hpaHint} tag="hpa" enabled={s.hpa} onToggle={(v) => set({ hpa: v })}>
          <Field label={p.minReplicas} tag="replicas">
            <Stepper value={s.minReplicas} min={1} max={20} onChange={(v) => set({ minReplicas: v, maxReplicas: Math.max(v, s.maxReplicas) })} ariaLabel={p.minReplicas} />
          </Field>
          <Field label={p.maxReplicas} tag="replicas">
            <Stepper value={s.maxReplicas} min={1} max={50} onChange={(v) => set({ maxReplicas: v, minReplicas: Math.min(v, s.minReplicas) })} ariaLabel={p.maxReplicas} />
          </Field>
          <Field label={p.cpuTarget} tag="cpuTarget" stacked>
            <Slider value={s.cpuTarget} min={10} max={95} step={5} onChange={(v) => set({ cpuTarget: v })} ariaLabel={p.cpuTarget} format={(v) => `${v}%`} />
          </Field>
          <Toggle tag="memoryMetric" checked={s.memoryMetric} onChange={(v) => set({ memoryMetric: v })} label={p.memoryMetric} />
          <Toggle tag="stabilize" checked={s.stabilize} onChange={(v) => set({ stabilize: v })} label={p.stabilize} hint={p.stabilizeHint} />
        </Group>

        <Group title={p.pdb} hint={p.pdbHint} tag="pdb" enabled={s.pdb} onToggle={(v) => set({ pdb: v })}>
          <Field label={p.minAvailable} tag="pdb">
            <Stepper value={s.minAvailable} min={0} max={20} onChange={(v) => set({ minAvailable: v })} ariaLabel={p.minAvailable} />
          </Field>
        </Group>
      </div>
      <div className="pg-output">
        <CodeView lines={lines} lang="yaml" filename="config.yaml" hoverTag={hover.tag} empty={p.empty} />
      </div>
    </div>
  );
}
