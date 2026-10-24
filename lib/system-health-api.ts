/** Tipos y funciones API para el módulo de salud del sistema (solo superadmin) */

import { apiFetch } from './api-fetch';

export type SystemEventType = 'activity' | 'error' | 'alert';
export type SystemEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SystemEvent {
  id: number;
  event_type: SystemEventType;
  severity: SystemEventSeverity;
  module: string;
  action: string;
  message: string;
  user_id: number | null;
  username: string | null;
  user_role: string | null;
  request_method: string | null;
  request_path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

export interface SystemEventStats {
  total: number;
  last24h: {
    activity: number;
    error: number;
    alert: number;
  };
  bySeverity: Record<SystemEventSeverity, number>;
  topModules: Array<{ module: string; count: number }>;
  recentErrors: SystemEvent[];
}

export interface SystemStatus {
  api: string;
  database: string;
  timestamp: string;
  uptime_seconds: number;
  node_version: string;
  environment: string;
}

export interface SystemEventsParams {
  event_type?: SystemEventType;
  severity?: SystemEventSeverity;
  module?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getSystemHealthOverview(params: SystemEventsParams = {}): Promise<{
  status: SystemStatus;
  stats: SystemEventStats;
  modules: string[];
  events: SystemEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const searchParams = new URLSearchParams();
  if (params.event_type) searchParams.set('event_type', params.event_type);
  if (params.module) searchParams.set('module', params.module);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const res = await apiFetch(`/system-health/overview${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  return data.data;
}

export async function getSystemHealthStatus(): Promise<SystemStatus> {
  const res = await apiFetch('/system-health/status');
  const data = await res.json();
  return data.data;
}

export async function getSystemHealthStats(): Promise<SystemEventStats> {
  const res = await apiFetch('/system-health/stats');
  const data = await res.json();
  return data.data;
}

export async function getSystemHealthModules(): Promise<string[]> {
  const res = await apiFetch('/system-health/modules');
  const data = await res.json();
  return data.data;
}

export async function getSystemHealthEvents(params: SystemEventsParams = {}): Promise<{
  events: SystemEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const searchParams = new URLSearchParams();
  if (params.event_type) searchParams.set('event_type', params.event_type);
  if (params.severity) searchParams.set('severity', params.severity);
  if (params.module) searchParams.set('module', params.module);
  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const res = await apiFetch(`/system-health/events${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  return data.data;
}
