export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;

export interface ClientOptions {
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
}

function resolveFetch(opts: ClientOptions): FetchLike {
  if (opts.fetchImpl) return opts.fetchImpl;
  const g = (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (!g) throw new Error("No fetch implementation available; pass opts.fetchImpl");
  return g;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export class OgmiosClient {
  private readonly fetchImpl: FetchLike;
  constructor(private readonly baseUrl: string, private readonly opts: ClientOptions = {}) {
    this.fetchImpl = resolveFetch(opts);
  }

  async query<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const body: Record<string, unknown> = { jsonrpc: "2.0", method, id: null };
    if (params !== undefined) body.params = params;
    const res = await this.fetchImpl(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.opts.headers ?? {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Ogmios HTTP ${res.status} for ${method}`);
    const json = (await res.json()) as JsonRpcResponse<T>;
    if (json.error) throw new Error(`Ogmios error ${json.error.code}: ${json.error.message}`);
    return json.result as T;
  }
}

export class KupoClient {
  private readonly fetchImpl: FetchLike;
  constructor(private readonly baseUrl: string, private readonly opts: ClientOptions = {}) {
    this.fetchImpl = resolveFetch(opts);
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: { Accept: "application/json", ...(this.opts.headers ?? {}) }
    });
    if (!res.ok) throw new Error(`Kupo HTTP ${res.status} for ${path}`);
    return (await res.json()) as T;
  }

  matches<T = unknown>(pattern: string, opts: { unspent?: boolean } = {}): Promise<T> {
    const qs = opts.unspent ? "?unspent" : "";
    return this.get<T>(`/matches/${pattern}${qs}`);
  }

  health<T = unknown>(): Promise<T> {
    return this.get<T>("/health");
  }
}
