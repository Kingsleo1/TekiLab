/// <reference types="vite/client" />

// ============================================================================
// DATASTAX ASTRA DB (CASSANDRA CQL / STARGATE REST v2) CLIENT ENGINE
// Default Database: Tekipharm | Default Keyspace: default_keyspace
// Supports both Vercel Serverless (/api/astra/*) & Express Server Proxy
// ============================================================================

export interface AstraConfig {
  endpoint: string;
  token: string;
  keyspace: string;
  dbId?: string;
  region?: string;
}

const STORAGE_KEY = 'tekipharm_astra_config';

function sanitizeValue(val: string | undefined): string {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
}

function extractAstraToken(val: string | undefined): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  const match = trimmed.match(/AstraCS:[A-Za-z0-9:_+-]+/);
  if (match) return match[0];
  return sanitizeValue(trimmed);
}

function extractAstraEndpoint(val: string | undefined): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  const match = trimmed.match(/https:\/\/[a-zA-Z0-9-]+\.apps\.astra\.datastax\.com/);
  if (match) return match[0];
  return sanitizeValue(trimmed);
}

export function getAstraConfig(): AstraConfig {
  const env = (import.meta as any).env || {};
  let stored: Partial<AstraConfig> = {};

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        stored = JSON.parse(raw);
      }
    } catch {
      // Ignore storage parse error
    }
  }

  let endpoint = extractAstraEndpoint(
    stored.endpoint ||
      env.VITE_ASTRA_DB_API_ENDPOINT ||
      env.ASTRA_DB_API_ENDPOINT ||
      env.VITE_ASTRA_DB_ENDPOINT ||
      ''
  );

  const dbId = sanitizeValue(stored.dbId || env.VITE_ASTRA_DB_ID || '');
  const region = sanitizeValue(stored.region || env.VITE_ASTRA_DB_REGION || '');

  if (!endpoint && dbId && region) {
    endpoint = `https://${dbId}-${region}.apps.astra.datastax.com`;
  }

  const token = extractAstraToken(
    stored.token ||
      env.VITE_ASTRA_DB_APPLICATION_TOKEN ||
      env.ASTRA_DB_APPLICATION_TOKEN ||
      env.VITE_ASTRA_DB_TOKEN ||
      ''
  );

  const keyspace =
    sanitizeValue(
      stored.keyspace ||
        env.VITE_ASTRA_DB_KEYSPACE ||
        env.ASTRA_DB_KEYSPACE ||
        'default_keyspace'
    ) || 'default_keyspace';

  return { endpoint, token, keyspace, dbId, region };
}

export function saveAstraConfigToRuntime(config: Partial<AstraConfig>): void {
  if (typeof localStorage === 'undefined') return;
  const current = getAstraConfig();

  let endpoint = extractAstraEndpoint(config.endpoint ?? current.endpoint);
  const dbId = sanitizeValue(config.dbId ?? current.dbId);
  const region = sanitizeValue(config.region ?? current.region);

  if (!endpoint && dbId && region) {
    endpoint = `https://${dbId}-${region}.apps.astra.datastax.com`;
  }

  const cleaned: AstraConfig = {
    endpoint,
    token: extractAstraToken(config.token ?? current.token),
    keyspace: sanitizeValue(config.keyspace ?? current.keyspace) || 'default_keyspace',
    dbId,
    region
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('astra_config_updated', { detail: cleaned }));
  }
}

export const saveAstraRuntimeConfig = saveAstraConfigToRuntime;

export function clearAstraRuntimeConfig(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('astra_config_updated'));
  }
}

/**
 * Always returns true so that the frontend routes requests to `/api/astra/*`.
 * Even when deployed on Vercel where environment variables may be configured on
 * the serverless backend (`ASTRA_DB_API_ENDPOINT` / `ASTRA_DB_APPLICATION_TOKEN`)
 * without `VITE_` browser exposure, `/api/astra/*` resolves credentials server-side.
 */
export function isAstraConfigured(): boolean {
  return true;
}

export function hasClientAstraCredentials(): boolean {
  const { endpoint, token } = getAstraConfig();
  if (!endpoint || !token) return false;
  if (!endpoint.startsWith('https://')) return false;
  if (
    endpoint.includes('your-database-id') ||
    endpoint.includes('placeholder') ||
    token.includes('your_generated_application_token') ||
    token.includes('placeholder')
  ) {
    return false;
  }
  return true;
}

function getHeaders(): Record<string, string> {
  const { endpoint, token, keyspace } = getAstraConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (endpoint && !endpoint.includes('your-database-id')) {
    headers['x-astra-endpoint'] = endpoint;
  }
  if (token && !token.includes('your_generated_application_token')) {
    headers['x-astra-token'] = token;
  }
  if (keyspace) {
    headers['x-astra-keyspace'] = keyspace;
  }
  return headers;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export const astraClient = {
  async checkStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    keyspace: string;
    endpoint?: string;
    tables?: string[];
    message: string;
    error?: string;
  }> {
    const cfg = getAstraConfig();
    try {
      const res = await fetch('/api/astra/status', {
        method: 'GET',
        headers: getHeaders()
      });
      if (res.ok && isJsonResponse(res)) {
        const data = await res.json();
        return {
          ...data,
          message:
            data.message ||
            (data.connected
              ? `Connected to DataStax Astra DB (Keyspace: ${data.keyspace || 'default_keyspace'}, ${data.tables?.length || 0} tables active)`
              : data.error || 'Astra credentials loaded. Run the CQL schema or click Auto-Create Tables.')
        };
      }
    } catch {
      // Fallback to direct call if running on static host with client env vars
    }

    if (!hasClientAstraCredentials()) {
      return {
        configured: false,
        connected: false,
        keyspace: cfg.keyspace,
        message: 'Astra DB credentials not configured yet.'
      };
    }

    try {
      const directRes = await fetch(
        `${cfg.endpoint}/api/rest/v2/schemas/keyspaces/${encodeURIComponent(cfg.keyspace)}/tables`,
        {
          method: 'GET',
          headers: {
            'X-Cassandra-Token': cfg.token,
            Accept: 'application/json'
          }
        }
      );
      if (directRes.ok) {
        const json = await directRes.json();
        const tables = Array.isArray(json?.data) ? json.data.map((t: any) => t.name) : [];
        return {
          configured: true,
          connected: true,
          keyspace: cfg.keyspace,
          endpoint: cfg.endpoint,
          tables,
          message: `Connected to DataStax Astra DB (Keyspace: ${cfg.keyspace}, ${tables.length} tables active)`
        };
      }
      return {
        configured: true,
        connected: false,
        keyspace: cfg.keyspace,
        endpoint: cfg.endpoint,
        message: `HTTP ${directRes.status}: Check API Endpoint, Application Token, and Keyspace (${cfg.keyspace})`,
        error: `HTTP ${directRes.status}`
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        keyspace: cfg.keyspace,
        endpoint: cfg.endpoint,
        message: err?.message || 'Connection failed',
        error: err?.message || 'Connection failed'
      };
    }
  },

  async getStatus() {
    return this.checkStatus();
  },

  async initializeSchema(): Promise<{
    success: boolean;
    createdTables?: string[];
    errors?: string[];
    error?: string;
  }> {
    try {
      const res = await fetch('/api/astra/init-schema', {
        method: 'POST',
        headers: getHeaders()
      });
      if (isJsonResponse(res)) {
        return await res.json();
      }
      return { success: false, error: `Unexpected non-JSON response (${res.status})` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to initialize Astra schema' };
    }
  },

  async selectAll(table: string, whereObj?: Record<string, any>): Promise<any[] | null> {
    try {
      const query = whereObj ? `?where=${encodeURIComponent(JSON.stringify(whereObj))}` : '';
      const res = await fetch(`/api/astra/table/${encodeURIComponent(table)}${query}`, {
        method: 'GET',
        headers: getHeaders()
      });
      if (res.ok && isJsonResponse(res)) {
        const json = await res.json();
        if (Array.isArray(json?.data)) return json.data;
      }
    } catch {
      if (hasClientAstraCredentials()) {
        try {
          const cfg = getAstraConfig();
          const url = `${cfg.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(cfg.keyspace)}/${encodeURIComponent(table)}/rows?page-size=1000`;
          const directRes = await fetch(url, {
            headers: { 'X-Cassandra-Token': cfg.token, Accept: 'application/json' }
          });
          if (directRes.ok) {
            const json = await directRes.json();
            let rows: any[] = Array.isArray(json?.data) ? json.data : [];
            if (whereObj) {
              rows = rows.filter((row) =>
                Object.entries(whereObj).every(([k, v]) => {
                  if (v === undefined || v === null) return true;
                  const rowVal = row?.[k];
                  if (typeof v === 'string' && typeof rowVal === 'string') {
                    return rowVal.toLowerCase().trim() === v.toLowerCase().trim();
                  }
                  return rowVal === v;
                })
              );
            }
            return rows;
          }
        } catch {}
      }
    }
    return null;
  },

  async select(
    table: string,
    whereObj?: Record<string, any>
  ): Promise<{ data: any[] | null; error: string | null }> {
    const data = await this.selectAll(table, whereObj);
    if (data !== null) {
      return { data, error: null };
    }
    return { data: null, error: 'Not found or not connected' };
  },

  async upsert(table: string, rowOrRows: any): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/astra/table/${encodeURIComponent(table)}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rowOrRows)
      });
      if (res.ok && isJsonResponse(res)) {
        const data = await res.json();
        if (data?.success !== false) return { success: true };
        return { success: false, error: data?.error || 'Upsert failed' };
      }
      const errData = isJsonResponse(res) ? await res.json().catch(() => ({})) : {};
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    } catch (err: any) {
      if (hasClientAstraCredentials()) {
        try {
          const cfg = getAstraConfig();
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          for (const r of rows) {
            if (!r?.id) continue;
            const pk = encodeURIComponent(String(r.id));
            const copy = { ...r };
            delete copy.id;
            await fetch(
              `${cfg.endpoint}/api/rest/v2/keyspaces/${encodeURIComponent(cfg.keyspace)}/${encodeURIComponent(table)}/${pk}`,
              {
                method: 'PUT',
                headers: {
                  'X-Cassandra-Token': cfg.token,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(copy)
              }
            );
          }
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e?.message };
        }
      }
      return { success: false, error: err?.message };
    }
  },

  async patch(table: string, id: string, updates: Record<string, any>): Promise<boolean> {
    try {
      const res = await fetch(`/api/astra/table/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok && isJsonResponse(res)) return true;
    } catch {}
    return false;
  },

  async remove(table: string, id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/astra/table/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok && isJsonResponse(res)) return true;
    } catch {}
    return false;
  },

  async delete(table: string, idOrObj: string | { id: string }): Promise<boolean> {
    const id = typeof idOrObj === 'string' ? idOrObj : idOrObj?.id;
    if (!id) return false;
    return this.remove(table, id);
  }
};
