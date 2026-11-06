import type { Messages } from '../i18n/locales/en';
import { Out, type Line } from './out';

export type PullPolicy = 'IfNotPresent' | 'Always' | 'Never';
export interface DeploymentState {
  image: 'nginx' | 'app';
  namespace: 'default' | 'staging' | 'production';
  replicas: number;
  labels: boolean;
  env: boolean;
  envFrom: boolean;
  spread: boolean;
  pullPolicy: PullPolicy;
  strategy: 'RollingUpdate' | 'Recreate';
  maxSurge: '0' | '1' | '25%';
  maxUnavailable: '0' | '1' | '25%';
  requests: boolean;
  cpu: number; // millicores
  memory: number; // Mi
  limits: boolean;
  readiness: boolean;
  liveness: boolean;
  startup: boolean;
  nonRoot: boolean;
  readOnly: boolean;
  dropCaps: boolean;
}

export const DEPLOYMENT_DEFAULTS: DeploymentState = {
  image: 'nginx',
  namespace: 'default',
  replicas: 3,
  labels: false,
  env: false,
  envFrom: false,
  spread: false,
  pullPolicy: 'IfNotPresent',
  strategy: 'RollingUpdate',
  maxSurge: '25%',
  maxUnavailable: '0',
  requests: true,
  cpu: 100,
  memory: 128,
  limits: false,
  readiness: true,
  liveness: false,
  startup: false,
  nonRoot: false,
  readOnly: false,
  dropCaps: false,
};

const mem = (mi: number) => (mi >= 1024 ? `${mi / 1024}Gi` : `${mi}Mi`);

export function genDeployment(s: DeploymentState, m: Messages, comments: boolean): { lines: Line[]; fixedZero: boolean } {
  const c = m.gen.deployment;
  const o = new Out(comments);
  const nginx = s.image === 'nginx';
  const unprivileged = nginx && s.nonRoot;
  const image = nginx ? (unprivileged ? 'nginxinc/nginx-unprivileged:1.27-alpine' : 'nginx:1.27-alpine') : 'ghcr.io/example/web:1.4.2';
  const port = nginx ? (unprivileged ? 8080 : 80) : 3000;
  const readyPath = nginx ? '/' : '/ready';
  const livePath = nginx ? '/' : '/healthz';
  const fixedZero = s.strategy === 'RollingUpdate' && s.maxSurge === '0' && s.maxUnavailable === '0';
  const unavailable = fixedZero ? '1' : s.maxUnavailable;

  const labels = (indent: number, tag: string) => {
    const p = ' '.repeat(indent);
    o.line(`${p}app: web`, tag);
    if (s.labels) o.line(`${p}tier: frontend`, 'labels');
  };

  o.comment(c.apiVersion, 0, 'base');
  o.line('apiVersion: apps/v1', 'base');
  o.line('kind: Deployment', 'base');
  o.line('metadata:', 'base');
  o.line('  name: web', 'base');
  if (s.namespace !== 'default') {
    o.line(`  namespace: ${s.namespace}${o.ic(c.namespace)}`, 'namespace');
  }
  o.comment(c.labels, 2, 'labels');
  o.line('  labels:', 'labels');
  labels(4, 'labels');
  o.line('spec:', 'base');
  o.line(`  replicas: ${s.replicas}${o.ic(c.replicas)}`, 'replicas');
  o.comment(c.selector, 2, 'base');
  o.line('  selector:', 'base');
  o.line('    matchLabels:', 'base');
  o.line('      app: web', 'base');
  o.comment(c.strategy, 2, 'strategy');
  o.line('  strategy:', 'strategy');
  if (s.strategy === 'Recreate') {
    o.line(`    type: Recreate${o.ic(c.recreate)}`, 'strategy');
  } else {
    o.line('    type: RollingUpdate', 'strategy');
    o.line('    rollingUpdate:', 'strategy');
    o.line(`      maxSurge: ${s.maxSurge}${o.ic(c.surge)}`, 'strategy.surge');
    o.line(`      maxUnavailable: ${unavailable}${o.ic(c.unavailable)}`, 'strategy.unavailable');
  }
  o.comment(c.template, 2, 'base');
  o.line('  template:', 'base');
  o.line('    metadata:', 'base');
  o.line('      labels:', 'labels');
  labels(8, 'labels');
  o.line('    spec:', 'base');

  if (s.nonRoot) {
    o.comment(c.podSecurity, 6, 'nonRoot');
    o.line('      securityContext:', 'nonRoot');
    o.line('        runAsNonRoot: true', 'nonRoot');
    o.line('        runAsUser: 10001', 'nonRoot');
  }
  if (s.spread) {
    o.comment(c.spread, 6, 'spread');
    o.line('      topologySpreadConstraints:', 'spread');
    o.line('        - maxSkew: 1', 'spread');
    o.line('          topologyKey: kubernetes.io/hostname', 'spread');
    o.line('          whenUnsatisfiable: ScheduleAnyway', 'spread');
    o.line('          labelSelector:', 'spread');
    o.line('            matchLabels:', 'spread');
    o.line('              app: web', 'spread');
  }

  o.line('      containers:', 'base');
  o.line('        - name: web', 'base');
  o.comment(unprivileged ? c.unprivileged : c.image, 10, unprivileged ? 'nonRoot' : 'image');
  o.line(`          image: ${image}`, unprivileged ? 'nonRoot' : 'image');
  if (s.pullPolicy !== 'IfNotPresent') o.line(`          imagePullPolicy: ${s.pullPolicy}${o.ic(c.pull)}`, 'pullPolicy');
  o.line('          ports:', 'image');
  o.line('            - name: http', 'image');
  o.line(`              containerPort: ${port}`, 'image');

  if (s.env) {
    o.comment(c.env, 10, 'env');
    o.line('          env:', 'env');
    o.line('            - name: LOG_LEVEL', 'env');
    o.line('              value: "info"', 'env');
    o.line('            - name: POD_NAME', 'env');
    o.line('              valueFrom:', 'env');
    o.line('                fieldRef:', 'env');
    o.line('                  fieldPath: metadata.name', 'env');
  }
  if (s.envFrom) {
    o.comment(c.envFrom, 10, 'envFrom');
    o.line('          envFrom:', 'envFrom');
    o.line('            - configMapRef:', 'envFrom');
    o.line('                name: web-config', 'envFrom');
  }

  if (s.requests || s.limits) {
    o.line('          resources:', s.requests ? 'requests' : 'limits');
    if (s.requests) {
      o.comment(c.requests, 12, 'requests');
      o.line('            requests:', 'requests');
      o.line(`              cpu: ${s.cpu}m`, 'requests');
      o.line(`              memory: ${mem(s.memory)}`, 'requests');
    }
    if (s.limits) {
      o.comment(c.limits, 12, 'limits');
      o.line('            limits:', 'limits');
      o.line(`              memory: ${mem(s.memory * 2)}`, 'limits');
    }
  }

  const probe = (kind: 'startup' | 'readiness' | 'liveness', path: string, extra: [string, string | number][]) => {
    o.comment(c[kind], 10, kind);
    o.line(`          ${kind}Probe:`, kind);
    o.line('            httpGet:', kind);
    o.line(`              path: ${path}`, kind);
    o.line('              port: http', kind);
    extra.forEach(([k, v]) => o.line(`            ${k}: ${v}`, kind));
  };
  if (s.startup)
    probe('startup', livePath, [
      ['periodSeconds', 2],
      ['failureThreshold', 30],
    ]);
  if (s.readiness)
    probe('readiness', readyPath, [
      ['periodSeconds', 5],
      ['failureThreshold', 2],
    ]);
  if (s.liveness)
    probe('liveness', livePath, [
      ['periodSeconds', 10],
      ['failureThreshold', 3],
    ]);

  if (s.readOnly || s.dropCaps) {
    o.comment(c.containerSecurity, 10, s.dropCaps ? 'dropCaps' : 'readOnly');
    o.line('          securityContext:', s.dropCaps ? 'dropCaps' : 'readOnly');
    if (s.dropCaps) o.line('            allowPrivilegeEscalation: false', 'dropCaps');
    if (s.readOnly) o.line('            readOnlyRootFilesystem: true', 'readOnly');
    if (s.dropCaps) {
      o.line('            capabilities:', 'dropCaps');
      o.line('              drop: ["ALL"]', 'dropCaps');
    }
  }

  if (s.readOnly) {
    const mounts: [string, string][] = nginx
      ? [
          ['tmp', '/tmp'],
          ['cache', '/var/cache/nginx'],
        ]
      : [['tmp', '/tmp']];
    o.line('          volumeMounts:', 'readOnly');
    mounts.forEach(([n, path]) => {
      o.line(`            - name: ${n}`, 'readOnly');
      o.line(`              mountPath: ${path}`, 'readOnly');
    });
    o.comment(c.tmp, 6, 'readOnly');
    o.line('      volumes:', 'readOnly');
    mounts.forEach(([n]) => {
      o.line(`        - name: ${n}`, 'readOnly');
      o.line('          emptyDir: {}', 'readOnly');
    });
  }

  return { lines: o.done(), fixedZero };
}
