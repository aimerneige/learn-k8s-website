import { useState } from 'react';
import { useI18n } from '../i18n';
import { Section } from '../components/Section';
import { Button } from '../components/ui/Button';
import { ResetIcon } from '../components/ui/Icons';
import { Switch } from '../components/ui/Switch';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { CONFIG_DEFAULTS } from '../lib/genConfig';
import { DEPLOYMENT_DEFAULTS } from '../lib/genDeployment';
import { SERVICE_DEFAULTS } from '../lib/genService';
import { usePersistent } from '../lib/usePersistent';
import { useReveal } from '../lib/useReveal';
import { ConfigBuilder } from './playground/ConfigBuilder';
import { DeploymentBuilder } from './playground/DeploymentBuilder';
import { ServiceBuilder } from './playground/ServiceBuilder';

const TABS = ['deployment', 'service', 'config'] as const;
type Tab = (typeof TABS)[number];

export function Playground() {
  const { t } = useI18n();
  const toast = useToast();
  const ref = useReveal<HTMLDivElement>();
  const [savedTab, setTab] = usePersistent<Tab>('lk-pg-tab', 'deployment');
  const tab: Tab = TABS.includes(savedTab) ? savedTab : 'deployment';
  const [comments, setComments] = usePersistent('lk-pg-comments', true);
  const [dep, setDep, resetDep] = usePersistent('lk-pg-deployment', DEPLOYMENT_DEFAULTS);
  const [svc, setSvc, resetSvc] = usePersistent('lk-pg-service', SERVICE_DEFAULTS);
  const [cfg, setCfg, resetCfg] = usePersistent('lk-pg-config', CONFIG_DEFAULTS);
  const [spin, setSpin] = useState(0);

  const reset = () => {
    ({ deployment: resetDep, service: resetSvc, config: resetCfg })[tab]();
    setSpin((n) => n + 1);
    toast(t.common.resetDone, 'info');
  };

  return (
    <Section id="playground" eyebrow={t.playground.eyebrow} title={t.playground.title} subtitle={t.playground.subtitle}>
      <div className="card pg-card reveal" ref={ref}>
        <div className="pg-top">
          <Tabs idPrefix="pg" ariaLabel={t.playground.title} value={tab} onChange={setTab} items={TABS.map((id) => ({ id, label: t.playground.tabs[id] }))} />
          <div className="pg-top-actions">
            <div className="compact-switch">
              <Switch checked={comments} onChange={setComments} label={t.playground.comments} />
            </div>
            <Button variant="ghost" size="sm" icon={<ResetIcon key={spin} className={spin ? 'spin-once' : ''} />} onClick={reset}>
              {t.common.reset}
            </Button>
          </div>
        </div>
        <p className="pg-hover-hint">{t.playground.hoverHint}</p>
        <div className="tab-panel" role="tabpanel" id="pg-panel" aria-labelledby={`pg-tab-${tab}`} key={tab}>
          {tab === 'deployment' && <DeploymentBuilder s={dep} set={(p) => setDep({ ...dep, ...p })} comments={comments} />}
          {tab === 'service' && <ServiceBuilder s={svc} set={(p) => setSvc({ ...svc, ...p })} comments={comments} />}
          {tab === 'config' && <ConfigBuilder s={cfg} set={(p) => setCfg({ ...cfg, ...p })} comments={comments} />}
        </div>
      </div>
    </Section>
  );
}
