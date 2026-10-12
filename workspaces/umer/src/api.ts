import type {
  LeadStatus,
  OpportunityStage,
  Requests,
  Resource,
  Resources,
  User,
} from './contracts';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export interface ListQuery {
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  companyId?: string;
  contactId?: string;
  status?: LeadStatus;
  stage?: OpportunityStage;
}
export type CrmOperations = Pick<
  CrmApi,
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'archive'
  | 'changeLeadStatus'
  | 'changeOpportunityStage'
>;
export class CrmApi {
  private csrf: { headerName: string; token: string } | null = null;
  constructor(
    private baseUrl = '',
    private organizationId = '',
    private transport: typeof fetch = fetch,
  ) {}
  private async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!path.startsWith('/auth/')) {
      if (!this.organizationId)
        throw new ApiError(
          403,
          'Enter your active organization UUID before opening CRM records.',
        );
      headers['X-Organization-ID'] = this.organizationId;
    }
    if (method !== 'GET') {
      if (!this.csrf) await this.refreshCsrf(signal);
      headers[this.csrf!.headerName] = this.csrf!.token;
      if (body !== undefined) headers['Content-Type'] = 'application/json';
    }
    let response: Response;
    try {
      response = await this.transport(
        `${this.baseUrl.replace(/\/$/, '')}/api${path}`,
        {
          method,
          headers,
          credentials: 'include',
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
        },
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(
        0,
        'Cannot reach the CRM backend. Check its URL and whether it is running.',
      );
    }
    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as {
        detail?: string;
        title?: string;
      } | null;
      if (response.status === 401) this.csrf = null;
      throw new ApiError(
        response.status,
        problem?.detail ||
          problem?.title ||
          `Request failed (${response.status}).`,
      );
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(
        response.status,
        'Backend returned an invalid JSON response.',
      );
    }
  }
  async refreshCsrf(signal?: AbortSignal) {
    this.csrf = await this.request('/auth/csrf', 'GET', undefined, signal);
  }
  async login(email: string, password: string) {
    await this.refreshCsrf();
    const user = await this.request<User>('/auth/login', 'POST', {
      email,
      password,
    });
    this.csrf = null;
    await this.refreshCsrf();
    return user;
  }
  me(signal?: AbortSignal) {
    return this.request<User>('/auth/me', 'GET', undefined, signal);
  }
  async logout() {
    await this.request('/auth/logout', 'POST');
    this.csrf = null;
  }
  async list<K extends Resource>(
    resource: K,
    query: ListQuery = {},
    signal?: AbortSignal,
  ): Promise<Resources[K][]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value) params.set(key, value);
    const result = await this.request<Resources[K][]>(
      `/${resource}${params.size ? `?${params}` : ''}`,
      'GET',
      undefined,
      signal,
    );
    if (!Array.isArray(result))
      throw new ApiError(
        200,
        'Expected an array of CRM records from the backend.',
      );
    return result;
  }
  get<K extends Resource>(resource: K, id: string, signal?: AbortSignal) {
    return this.request<Resources[K]>(
      `/${resource}/${encodeURIComponent(id)}`,
      'GET',
      undefined,
      signal,
    );
  }
  create<K extends Resource>(resource: K, body: Requests[K]) {
    return this.request<Resources[K]>(`/${resource}`, 'POST', body);
  }
  update<K extends Resource>(resource: K, id: string, body: Requests[K]) {
    return this.request<Resources[K]>(
      `/${resource}/${encodeURIComponent(id)}`,
      'PUT',
      body,
    );
  }
  archive(resource: Resource, id: string) {
    return this.request<void>(
      `/${resource}/${encodeURIComponent(id)}`,
      'DELETE',
    );
  }
  changeLeadStatus(id: string, status: LeadStatus) {
    return this.request<Resources['leads']>(
      `/leads/${encodeURIComponent(id)}/status`,
      'PATCH',
      { status },
    );
  }
  changeOpportunityStage(id: string, stage: OpportunityStage) {
    return this.request<Resources['opportunities']>(
      `/opportunities/${encodeURIComponent(id)}/stage`,
      'PATCH',
      { stage },
    );
  }
}
