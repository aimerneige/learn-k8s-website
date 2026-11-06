import type { Messages } from '../i18n/locales/en';
import { Out, type Line } from './out';

export type AccessMode = 'ReadWriteOnce' | 'ReadWriteMany' | 'ReadOnlyMany';
export interface ConfigState {
  configMap: boolean;
  configFile: boolean;
  immutable: boolean;
  secret: boolean;
  encoding: 'stringData' | 'data';
  pvc: boolean;
  size: number; // Gi
  accessMode: AccessMode;
  storageClass: 'standard' | 'fast-ssd' | 'nfs';
  hpa: boolean;
  minReplicas: number;
  maxReplicas: number;
  cpuTarget: number;
  memoryMetric: boolean;
  stabilize: boolean;
  pdb: boolean;
  minAvailable: number;
}

export const CONFIG_DEFAULTS: ConfigState = {
  configMap: true,
  configFile: false,
  immutable: false,
  secret: true,
  encoding: 'stringData',
  pvc: false,
  size: 10,
  accessMode: 'ReadWriteOnce',
  storageClass: 'standard',
  hpa: true,
  minReplicas: 2,
  maxReplicas: 10,
  cpuTarget: 70,
  memoryMetric: false,
  stabilize: false,
  pdb: false,
  minAvailable: 1,
};

const PASSWORD = 's3cr3t-pa55w0rd';
const API_KEY = 'sk-live-12345';

export function genConfig(s: ConfigState, m: Messages, comments: boolean): Line[] {
  const c = m.gen.config;
  const o = new Out(comments);
  const sep = () => {
    if (o.lines.length) o.line('---', 'sep');
  };

  if (s.configMap) {
    o.comment(c.configMap, 0, 'configMap');
    o.line('apiVersion: v1', 'configMap');
    o.line('kind: ConfigMap', 'configMap');
    o.line('metadata:', 'configMap');
    o.line('  name: web-config', 'configMap');
    o.line('data:', 'configMap');
    o.line('  LOG_LEVEL: info', 'configMap');
    o.line('  FEATURE_FLAGS: "search,dark-mode"', 'configMap');
    if (s.configFile) {
      o.comment(c.file, 2, 'configFile');
      o.line('  app.properties: |', 'configFile');
      o.line('    server.port=3000', 'configFile');
      o.line('    cache.ttl=60', 'configFile');
      o.line('    cache.size=512', 'configFile');
    }
    if (s.immutable) o.line(`immutable: true${o.ic(c.immutable)}`, 'immutable');
  }

  if (s.secret) {
    sep();
    o.comment(c.secret, 0, 'secret');
    o.line('apiVersion: v1', 'secret');
    o.line('kind: Secret', 'secret');
    o.line('metadata:', 'secret');
    o.line('  name: web-secrets', 'secret');
    o.line('type: Opaque', 'secret');
    if (s.encoding === 'stringData') {
      o.comment(c.stringData, 0, 'encoding');
      o.line('stringData:', 'encoding');
      o.line(`  DB_PASSWORD: ${PASSWORD}`, 'encoding');
      o.line(`  API_KEY: ${API_KEY}`, 'encoding');
    } else {
      o.comment(c.base64, 0, 'encoding');
      o.line('data:', 'encoding');
      o.line(`  DB_PASSWORD: ${btoa(PASSWORD)}`, 'encoding');
      o.line(`  API_KEY: ${btoa(API_KEY)}`, 'encoding');
    }
    if (s.immutable) o.line('immutable: true', 'immutable');
  }

  if (s.pvc) {
    sep();
    o.comment(c.pvc, 0, 'pvc');
    o.line('apiVersion: v1', 'pvc');
    o.line('kind: PersistentVolumeClaim', 'pvc');
    o.line('metadata:', 'pvc');
    o.line('  name: web-data', 'pvc');
    o.line('spec:', 'pvc');
    o.line('  accessModes:', 'accessMode');
    o.line(`    - ${s.accessMode}`, 'accessMode');
    o.line(`  storageClassName: ${s.storageClass}`, 'storageClass');
    o.line('  resources:', 'size');
    o.line('    requests:', 'size');
    o.line(`      storage: ${s.size}Gi`, 'size');
  }

  if (s.hpa) {
    sep();
    o.comment(c.hpa, 0, 'hpa');
    o.line('apiVersion: autoscaling/v2', 'hpa');
    o.line('kind: HorizontalPodAutoscaler', 'hpa');
    o.line('metadata:', 'hpa');
    o.line('  name: web', 'hpa');
    o.line('spec:', 'hpa');
    o.line('  scaleTargetRef:', 'hpa');
    o.line('    apiVersion: apps/v1', 'hpa');
    o.line('    kind: Deployment', 'hpa');
    o.line('    name: web', 'hpa');
    o.line(`  minReplicas: ${s.minReplicas}`, 'replicas');
    o.line(`  maxReplicas: ${s.maxReplicas}`, 'replicas');
    o.line('  metrics:', 'cpuTarget');
    const metric = (name: string, value: number, tag: string) => {
      o.line('    - type: Resource', tag);
      o.line('      resource:', tag);
      o.line(`        name: ${name}`, tag);
      o.line('        target:', tag);
      o.line('          type: Utilization', tag);
      o.line(`          averageUtilization: ${value}${o.ic(c.metric)}`, tag);
    };
    metric('cpu', s.cpuTarget, 'cpuTarget');
    if (s.memoryMetric) metric('memory', 80, 'memoryMetric');
    if (s.stabilize) {
      o.comment(c.stabilize, 2, 'stabilize');
      o.line('  behavior:', 'stabilize');
      o.line('    scaleDown:', 'stabilize');
      o.line('      stabilizationWindowSeconds: 300', 'stabilize');
    }
  }

  if (s.pdb) {
    sep();
    o.comment(c.pdb, 0, 'pdb');
    o.line('apiVersion: policy/v1', 'pdb');
    o.line('kind: PodDisruptionBudget', 'pdb');
    o.line('metadata:', 'pdb');
    o.line('  name: web', 'pdb');
    o.line('spec:', 'pdb');
    o.line(`  minAvailable: ${s.minAvailable}`, 'pdb');
    o.line('  selector:', 'pdb');
    o.line('    matchLabels:', 'pdb');
    o.line('      app: web', 'pdb');
  }

  return o.done();
}
