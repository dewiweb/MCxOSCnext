import type { Connection, ConnectionConfig, ServiceStatus, TreeNode, Session, ApiResponse, AppConfig } from '../types';

const API_BASE = '/api/v1';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data: ApiResponse<T> = await res.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data.data;
}

export const api = {
  // Connections
  async getConnections(): Promise<Connection[]> {
    return request<Connection[]>('/connections');
  },

  async getConnection(id: string): Promise<Connection> {
    return request<Connection>(`/connections/${id}`);
  },

  async createConnection(config: ConnectionConfig): Promise<Connection> {
    return request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async updateConnection(id: string, changes: Partial<ConnectionConfig>): Promise<Connection> {
    return request<Connection>(`/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
  },

  async deleteConnection(id: string): Promise<void> {
    await fetch(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
  },

  async activateConnection(id: string): Promise<Connection> {
    return request<Connection>(`/connections/${id}/activate`, { method: 'POST' });
  },

  async deactivateConnection(id: string): Promise<Connection> {
    return request<Connection>(`/connections/${id}/deactivate`, { method: 'POST' });
  },

  async activateAllConnections(): Promise<{ success: number; failed: number }> {
    return request<{ success: number; failed: number }>('/connections/activate-all', { method: 'POST' });
  },

  // Status
  async getStatus(): Promise<ServiceStatus> {
    return request<ServiceStatus>('/status');
  },

  // Sessions
  async getSessions(): Promise<Session[]> {
    return request<Session[]>('/sessions');
  },

  async loadSession(name: string): Promise<{ connections: number; activated: number }> {
    return request<{ connections: number; activated: number }>(`/sessions/${name}`);
  },

  async saveSession(name: string): Promise<{ name: string; connections: number }> {
    return request<{ name: string; connections: number }>(`/sessions/${name}`, { method: 'PUT' });
  },

  async createSession(name: string): Promise<{ name: string; connections: number }> {
    return request<{ name: string; connections: number }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteSession(name: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${name}`, { method: 'DELETE' });
  },

  // Tree
  async getTree(): Promise<TreeNode[]> {
    return request<TreeNode[]>('/tree');
  },

  async getTreeNode(path: string): Promise<TreeNode> {
    const urlPath = path.replace(/\./g, '/');
    return request<TreeNode>(`/tree/${urlPath}`);
  },

  async expandNode(path: string): Promise<TreeNode[]> {
    const urlPath = path.replace(/\./g, '/');
    return request<TreeNode[]>(`/tree/${urlPath}/expand`, { method: 'POST' });
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    return request<AppConfig>('/config');
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    return request<AppConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  async connectEmber(host: string, port: number): Promise<void> {
    await request<{ message: string }>('/config/ember/connect', {
      method: 'POST',
      body: JSON.stringify({ host, port }),
    });
  },

  async restartOsc(rxPort: number, txHost: string, txPort: number): Promise<void> {
    await request<{ message: string }>('/config/osc/restart', {
      method: 'POST',
      body: JSON.stringify({ rxPort, txHost, txPort }),
    });
  },

  // Session import/export
  async importSession(data: unknown): Promise<{ connections: number; activated: number }> {
    return request<{ connections: number; activated: number }>('/sessions/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
