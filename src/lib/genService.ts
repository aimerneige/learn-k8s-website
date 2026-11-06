import type { Messages } from '../i18n/locales/en';
import { Out, type Line } from './out';

export type SvcType = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'Headless';
export interface ServiceState {
  type: SvcType;
  port: number;
  nodePort: number;
  affinity: boolean;
  local: boolean;
  ingress: boolean;
  className: 'nginx' | 'traefik';
  host: 'example.com' | 'app.example.com' | 'shop.example.com';
  path: '/' | '/api' | '/app';
  tls: boolean;
  netpol: boolean;
}

export const SERVICE_DEFAULTS: ServiceState = {
  type: 'ClusterIP',
  port: 80,
  nodePort: 30080,
  affinity: false,
  local: false,
  ingress: true,
  className: 'nginx',
  host: 'app.example.com',
  path: '/',
  tls: false,
  netpol: false,
};

export function genService(s: ServiceState, m: Messages, comments: boolean): Line[] {
  const c = m.gen.service;
  const o = new Out(comments);
  const external = s.type === 'NodePort' || s.type === 'LoadBalancer';

  o.line('apiVersion: v1', 'svc');
  o.line('kind: Service', 'svc');
  o.line('metadata:', 'svc');
  o.line('  name: web', 'svc');
  o.line('spec:', 'svc');
  o.comment(c[s.type], 2, 'type');
  if (s.type === 'Headless') o.line('  clusterIP: None', 'type');
  else o.line(`  type: ${s.type}`, 'type');
  o.comment(c.selector, 2, 'svc');
  o.line('  selector:', 'svc');
  o.line('    app: web', 'svc');
  o.line('  ports:', 'port');
  o.line('    - name: http', 'port');
  o.line(`      port: ${s.port}${o.ic(c.port)}`, 'port');
  o.line(`      targetPort: http${o.ic(c.targetPort)}`, 'port');
  if (s.type === 'NodePort') o.line(`      nodePort: ${s.nodePort}`, 'nodePort');
  if (s.affinity) {
    o.comment(c.affinity, 2, 'affinity');
    o.line('  sessionAffinity: ClientIP', 'affinity');
  }
  if (external && s.local) {
    o.comment(c.local, 2, 'local');
    o.line('  externalTrafficPolicy: Local', 'local');
  }

  if (s.ingress) {
    o.line('---', 'ingress');
    o.comment(c.ingress, 0, 'ingress');
    o.line('apiVersion: networking.k8s.io/v1', 'ingress');
    o.line('kind: Ingress', 'ingress');
    o.line('metadata:', 'ingress');
    o.line('  name: web', 'ingress');
    if (s.tls) {
      o.line('  annotations:', 'tls');
      o.comment(c.issuer, 4, 'tls');
      o.line('    cert-manager.io/cluster-issuer: letsencrypt', 'tls');
    }
    o.line('spec:', 'ingress');
    o.line(`  ingressClassName: ${s.className}`, 'className');
    if (s.tls) {
      o.line('  tls:', 'tls');
      o.line('    - hosts:', 'tls');
      o.line(`        - ${s.host}`, 'tls');
      o.line(`      secretName: web-tls${o.ic(c.tls)}`, 'tls');
    }
    o.line('  rules:', 'ingress');
    o.line(`    - host: ${s.host}`, 'host');
    o.line('      http:', 'ingress');
    o.line('        paths:', 'ingress');
    o.line(`          - path: ${s.path}`, 'path');
    o.line('            pathType: Prefix', 'path');
    o.line('            backend:', 'ingress');
    o.line('              service:', 'ingress');
    o.line('                name: web', 'ingress');
    o.line('                port:', 'ingress');
    o.line('                  name: http', 'ingress');
  }

  if (s.netpol) {
    o.line('---', 'netpol');
    o.comment(c.netpol, 0, 'netpol');
    o.line('apiVersion: networking.k8s.io/v1', 'netpol');
    o.line('kind: NetworkPolicy', 'netpol');
    o.line('metadata:', 'netpol');
    o.line('  name: web-allow-ingress', 'netpol');
    o.line('spec:', 'netpol');
    o.line('  podSelector:', 'netpol');
    o.line('    matchLabels:', 'netpol');
    o.line('      app: web', 'netpol');
    o.line('  policyTypes:', 'netpol');
    o.line('    - Ingress', 'netpol');
    o.line('  ingress:', 'netpol');
    o.line('    - from:', 'netpol');
    o.line('        - namespaceSelector:', 'netpol');
    o.line('            matchLabels:', 'netpol');
    o.line(`              kubernetes.io/metadata.name: ${s.className === 'nginx' ? 'ingress-nginx' : 'traefik'}`, 'netpol');
    o.line('      ports:', 'netpol');
    o.line('        - port: http', 'netpol');
  }
  return o.done();
}
