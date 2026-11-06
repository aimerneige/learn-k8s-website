import { useState } from 'react';
import { useI18n } from '../i18n';
import { Section } from '../components/Section';
import { Tabs } from '../components/ui/Tabs';
import { ClusterDemo } from './concepts/ClusterDemo';
import { DeployDemo } from './concepts/DeployDemo';
import { RolloutDemo } from './concepts/RolloutDemo';
import { ServiceDemo } from './concepts/ServiceDemo';
import { ProbesDemo } from './concepts/ProbesDemo';
import { HpaDemo } from './concepts/HpaDemo';
import { useReveal } from '../lib/useReveal';

const DEMOS = { cluster: ClusterDemo, deploy: DeployDemo, rollout: RolloutDemo, service: ServiceDemo, probes: ProbesDemo, hpa: HpaDemo };
type Id = keyof typeof DEMOS;

export function Concepts() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Id>('cluster');
  const ref = useReveal<HTMLDivElement>();
  const Demo = DEMOS[tab];
  const ids = Object.keys(DEMOS) as Id[];
  return (
    <Section id="concepts" eyebrow={t.concepts.eyebrow} title={t.concepts.title} subtitle={t.concepts.subtitle}>
      <div className="card concepts-card reveal" ref={ref}>
        <Tabs idPrefix="concepts" ariaLabel={t.concepts.title} value={tab} onChange={setTab} items={ids.map((id) => ({ id, label: t.concepts.tabs[id] }))} />
        <div className="tab-panel" role="tabpanel" id="concepts-panel" aria-labelledby={`concepts-tab-${tab}`} key={tab}>
          <Demo />
        </div>
      </div>
    </Section>
  );
}
