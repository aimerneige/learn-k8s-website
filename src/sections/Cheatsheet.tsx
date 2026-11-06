import { useMemo, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import type { Messages } from '../i18n/locales/en';
import { Section } from '../components/Section';
import { copyText } from '../components/CodeView';
import { useToast } from '../components/ui/Toast';
import { CopyIcon, SearchIcon, XIcon } from '../components/ui/Icons';
import { highlight } from '../lib/highlight';
import { useReveal } from '../lib/useReveal';

type ItemId = keyof Messages['cheatsheet']['items'];
type GroupId = keyof Messages['cheatsheet']['groups'];

const DATA: { group: GroupId; items: [ItemId, string][] }[] = [
  {
    group: 'basics',
    items: [
      ['get', 'kubectl get pods'],
      ['getWide', 'kubectl get pods -o wide'],
      ['describe', 'kubectl describe pod web-7d4f9c-xk2p'],
      ['apply', 'kubectl apply -f deployment.yaml'],
      ['delete', 'kubectl delete -f deployment.yaml'],
      ['explain', 'kubectl explain deployment.spec.strategy'],
    ],
  },
  {
    group: 'workloads',
    items: [
      ['createDeploy', 'kubectl create deployment web --image=nginx:1.27 --replicas=3'],
      ['scale', 'kubectl scale deployment web --replicas=5'],
      ['setImage', 'kubectl set image deployment/web web=nginx:1.28'],
      ['rolloutStatus', 'kubectl rollout status deployment/web'],
      ['rolloutUndo', 'kubectl rollout undo deployment/web'],
    ],
  },
  {
    group: 'debug',
    items: [
      ['logs', 'kubectl logs -f deploy/web'],
      ['exec', 'kubectl exec -it deploy/web -- sh'],
      ['portForward', 'kubectl port-forward svc/web 8080:80'],
      ['top', 'kubectl top pods'],
      ['events', 'kubectl get events --sort-by=.lastTimestamp'],
    ],
  },
  {
    group: 'config',
    items: [
      ['contexts', 'kubectl config get-contexts'],
      ['useContext', 'kubectl config use-context staging'],
      ['setNs', 'kubectl config set-context --current --namespace=production'],
      ['createSecret', 'kubectl create secret generic db --from-literal=password=s3cr3t'],
      ['dryRun', 'kubectl create deployment web --image=nginx --dry-run=client -o yaml'],
    ],
  },
  {
    group: 'cluster',
    items: [
      ['nodes', 'kubectl get nodes'],
      ['cordon', 'kubectl cordon node-2'],
      ['drain', 'kubectl drain node-2 --ignore-daemonsets'],
      ['apiResources', 'kubectl api-resources'],
    ],
  },
];

export function Cheatsheet() {
  const { t } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useReveal<HTMLDivElement>();

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DATA.map((g) => ({
      ...g,
      items: g.items.filter(([id, cmd]) => !needle || cmd.toLowerCase().includes(needle) || t.cheatsheet.items[id].toLowerCase().includes(needle)),
    })).filter((g) => g.items.length);
  }, [q, t]);

  const copy = async (cmd: string) => {
    const ok = await copyText(cmd);
    toast(ok ? t.common.copied : t.common.copyFailed, ok ? 'success' : 'error');
    if (ok) {
      setCopied(cmd);
      window.setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1400);
    }
  };

  return (
    <Section id="cheatsheet" eyebrow={t.cheatsheet.eyebrow} title={t.cheatsheet.title} subtitle={t.cheatsheet.subtitle}>
      <div className="reveal" ref={ref}>
        <div className="search">
          <SearchIcon />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.cheatsheet.search} aria-label={t.cheatsheet.search} spellCheck={false} />
          {q && (
            <button type="button" className="search-clear" onClick={() => setQ('')} aria-label={t.cheatsheet.clear}>
              <XIcon width={14} height={14} />
            </button>
          )}
        </div>
        {groups.length === 0 ? (
          <p className="cs-empty">{fmt(t.cheatsheet.empty, { q })}</p>
        ) : (
          <div className="cs-grid">
            {groups.map((g) => (
              <div key={g.group} className="card cs-group">
                <h3>{t.cheatsheet.groups[g.group]}</h3>
                <ul>
                  {g.items.map(([id, cmd]) => (
                    <li key={id}>
                      <button type="button" className={`cs-item${copied === cmd ? ' is-copied' : ''}`} onClick={() => copy(cmd)}>
                        <code>
                          {highlight(cmd, 'shell').map((tk, k) => (
                            <span key={k} className={tk.c ? `tk-${tk.c}` : undefined}>
                              {tk.s}
                            </span>
                          ))}
                        </code>
                        <span className="cs-desc">{t.cheatsheet.items[id]}</span>
                        <span className="cs-copy" aria-hidden>
                          <CopyIcon width={14} height={14} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
