import { detectTokenType, type TokenType } from './auth';
import { setToken as persistToken } from './token-storage';

export interface MessageRecord {
  sprintId: number;
  sessionId: string;
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  model?: { providerID: string; modelID: string };
  timestamp: number;
}

interface ClientConfig {
  token: string;
  baseUrl: string;
  timeout?: number;
  retryCount?: number;
}

export interface SprintOptions {
  includeStories?: boolean;
  includeFiles?: boolean;
}

export interface ListSprintsParams {
  organizationId?: number;
  includeSystemOrg?: boolean;
}

export interface CreateSprintRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isPrivate?: boolean;
  organizationId?: number;
}

export interface CreateStoryRequest {
  title: string;
  description?: string;
  sprintId: number;
  type?: 'story' | 'bug' | 'task' | 'doc_folder' | 'schedule';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  points?: number;
  assigneeId?: number;
  assigneeType?: 'user' | 'agent';
  assigneeAgentKey?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'blocked';
  x?: number;
  y?: number;
  zIndex?: number;
  templateId?: number;
  metadata?: any;
}

export interface Template {
  id: number;
  name: string;
  slug: string | null;
  description: string;
  fields: string;
  storyType: 'story' | 'bug' | 'task' | 'doc_folder' | 'schedule' | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ChatRequest {
  message: string;
  sprintId?: number;
  selectedAgentKey?: string;
  type?: 'chat' | 'summary' | 'suggestion' | 'analysis' | 'translation' | 'feature' | 'planner.chat' | 'developer.sprint';
  conversationId?: string;
  metadata?: any;
}

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ForLoopAPIClient {
  private config: Required<ClientConfig>;
  private defaultHeaders: HeadersInit;
  private tokenType: TokenType | null;
  private jwtExchangePromise: Promise<string> | null;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 30000,
      retryCount: 3,
      ...config,
    };
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    // Detect token type once at initialization
    this.tokenType = detectTokenType(config.token);
    this.jwtExchangePromise = null;
  }

  public setToken(token: string) {
    this.config.token = token;
    this.tokenType = detectTokenType(token);
  }

  private async ensureOpencodeApiToken(endpoint: string): Promise<void> {
    if (this.tokenType !== 'jwt') return;
    if (!endpoint.startsWith('/api/opencode/')) return;
    if (endpoint.startsWith('/api/opencode/auth/tokens')) return;

    if (!this.jwtExchangePromise) {
      this.jwtExchangePromise = this.exchangeJwtForApiToken();
    }
    const token = await this.jwtExchangePromise;
    this.setToken(token);
  }

  private async exchangeJwtForApiToken(): Promise<string> {
    const url = `${this.config.baseUrl}/api/opencode/auth/tokens`;
    const jwt = this.config.token;

    const scopes = [
      'sprint:read',
      'sprint:write',
      'story:read',
      'story:write',
      'story:delete',
      'agent:read',
      'agent:query',
      'profile:read',
      'organization:read',
      'organization:write',
      'organization:delete',
    ];

    const name = `lambda-planner-${Date.now()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        name,
        expiresIn: '7d',
        scopes,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    const payload = await response.json();
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
    if (!token) {
      throw new APIError('invalid_token_exchange', 'Token exchange returned empty token', 500);
    }

    await persistToken(token);
    return token;
  }

  /**
   * Get auth headers based on token type
   * - JWT tokens: Authorization: Bearer <token>
   * - API keys: X-API-Token: <token>
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    
    if (this.tokenType === 'jwt') {
      // JWT token - use Authorization header
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else {
      // API key or unknown - use X-API-Token header (backward compatible)
      headers['X-API-Token'] = this.config.token;
    }
    
    return headers;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureOpencodeApiToken(endpoint);
    const url = `${this.config.baseUrl}${endpoint}`;
    
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...this.getAuthHeaders(),  // Dynamic auth headers based on token type
            ...(options.headers || {}),
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const error = await this.parseError(response);
          throw error;
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof APIError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        if (attempt < this.config.retryCount) {
          await this.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  private async parseError(response: Response): Promise<APIError> {
    try {
      const body = await response.json();
      return new APIError(body.error || 'UnknownError', body.message || response.statusText, response.status);
    } catch {
      return new APIError('UnknownError', response.statusText, response.status);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async listSprints(params?: ListSprintsParams): Promise<any[]> {
    const query = new URLSearchParams(params as Record<string, string>);
    const response = await this.request<{ data: any[] }>(`/api/opencode/sprints?${query}`);
    return Array.isArray(response) ? response : (response.data || []);
  }

  async getSprint(id: number, options?: SprintOptions): Promise<any> {
    const query = new URLSearchParams({
      includeStories: options?.includeStories !== false ? 'true' : 'false',
      includeFiles: options?.includeFiles !== false ? 'true' : 'false',
    });
    return this.request(`/api/opencode/sprints/${id}?${query}`);
  }

  async createSprint(data: CreateSprintRequest): Promise<any> {
    return this.request('/api/opencode/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSprint(id: number, data: Partial<CreateSprintRequest>): Promise<any> {
    return this.request(`/api/opencode/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSprint(id: number): Promise<void> {
    await this.request(`/api/opencode/sprints/${id}`, {
      method: 'DELETE',
    });
  }

  async createStory(data: CreateStoryRequest): Promise<any> {
    return this.request('/api/opencode/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStory(id: number, options?: { includeComments?: boolean }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.includeComments) params.set('includeComments', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/opencode/stories/${id}${query}`);
  }

  async updateStory(id: number, data: Partial<any>): Promise<any> {
    return this.request(`/api/opencode/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStory(id: number): Promise<void> {
    await this.request(`/api/opencode/stories/${id}`, {
      method: 'DELETE',
    });
  }

  async listTemplates(): Promise<Template[]> {
    return this.request('/api/opencode/templates');
  }

  async getUserProfile(): Promise<any> {
    return this.request('/api/opencode/user/profile');
  }

  async getUserQuotas(): Promise<any> {
    return this.request('/api/opencode/user/quotas');
  }

  async getOrganizationQuotas(orgId: number): Promise<any> {
    return this.request(`/api/opencode/organization/${orgId}/quotas`);
  }

  async listOrganizations(): Promise<any[]> {
    return this.request('/api/opencode/organizations');
  }

  async getOwnedOrganizations(): Promise<any[]> {
    return this.request('/api/opencode/organizations/owned');
  }

  async getOrganization(id: number): Promise<any> {
    return this.request(`/api/opencode/organizations/${id}`);
  }

  async createOrganization(data: { name: string; description?: string }): Promise<any> {
    return this.request('/api/opencode/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrganization(id: number, data: { name?: string; description?: string }): Promise<any> {
    return this.request(`/api/opencode/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganization(id: number): Promise<void> {
    await this.request(`/api/opencode/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  async chatWithAI(request: ChatRequest): Promise<any> {
    return this.request('/api/opencode/agents/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDeveloperStatus(sprintId: number): Promise<any> {
    return this.request(`/api/opencode/sprints/${sprintId}/developer-status`);
  }

  async getStorySuggestions(sprintId: number, storyId?: number): Promise<any> {
    return this.request('/api/opencode/agents/suggestions', {
      method: 'POST',
      body: JSON.stringify({ sprintId, storyId }),
    });
  }

  async getAITasks(sprintId?: number): Promise<any> {
    const query = sprintId ? new URLSearchParams({ sprintId: String(sprintId) }) : new URLSearchParams();
    return this.request(`/api/opencode/agents/tasks?${query}`);
  }

  async getSprintSummaries(sprintId: number): Promise<any> {
    return this.request(`/api/opencode/agents/summary?sprintId=${sprintId}`);
  }

  async getAgentSuggestions(request: AgentSuggestionRequest): Promise<any> {
    return this.request('/api/agents/suggestions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getStoryBreakdown(storyId: number): Promise<any> {
    return this.request(`/api/agents/stories/${storyId}/breakdown`);
  }

  async getStoryEstimate(storyId: number): Promise<any> {
    return this.request(`/api/agents/stories/${storyId}/estimate`);
  }

  async getConversationHistory(params?: ConversationHistoryParams): Promise<any> {
    const query = new URLSearchParams();
    if (params?.sprintId) query.append('sprintId', String(params.sprintId));
    if (params?.limit) query.append('limit', String(params.limit));
    return this.request(`/api/opencode/messages?${query}`);
  }

  async clearConversationHistory(params?: ClearHistoryParams): Promise<any> {
    const query = new URLSearchParams();
    if (params?.sprintId) query.append('sprintId', String(params.sprintId));
    query.append('confirm', 'true');
    return this.request(`/api/opencode/messages?${query}`, {
      method: 'DELETE',
    });
  }

  async createPresignedUpload(data: {
    sprintId: number;
    contentType: string;
    originalName: string;
    folder?: string;
  }): Promise<any> {
    return this.request('/api/opencode/files/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeUpload(data: {
    sprintId: number;
    fileName: string;
    originalName: string;
    fileType: string;
    size: number;
    folder?: string;
    storyId?: number;
    x?: number;
    y?: number;
  }): Promise<any> {
    return this.request('/api/opencode/files/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSprintFiles(sprintId: number): Promise<any[]> {
    return this.request(`/api/opencode/files/sprint/${sprintId}`);
  }

  async deleteFile(fileId: number): Promise<void> {
    await this.request(`/api/opencode/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async logFileRead(fileId: number): Promise<void> {
    await this.request(`/api/opencode/files/${fileId}/read`, {
      method: 'POST',
    });
  }

  async getFileDownloadUrl(fileId: number): Promise<any> {
    return this.request(`/api/opencode/files/download/${fileId}`);
  }

  async getFileOpenUrl(fileId: number): Promise<any> {
    return this.request(`/api/opencode/files/open-url/${fileId}`);
  }

  async updateFilePosition(fileId: number, data: {
    x?: number;
    y?: number;
    zIndex?: number;
  }): Promise<any> {
    return this.request(`/api/opencode/files/${fileId}/position`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async listAiAgents(): Promise<AiAgentDefinition[]> {
    const response = await this.request('/api/opencode/ai/agents') as any;
    return response.agents || [];
  }

  async updateSprintAiAgents(sprintId: number, enabledAgentKeys: string[]): Promise<SprintAiAgent[]> {
    const response = await this.request(`/api/opencode/sprints/${sprintId}/ai-agents`, {
      method: 'PUT',
      body: JSON.stringify({ enabledAgentKeys }),
    }) as any;
    return response.sprintAiAgents || [];
  }

  async updateSchedule(storyId: number, data: {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    videoUrl?: string;
  }): Promise<any> {
    return this.updateStory(storyId, {
      title: data.title,
      description: data.description,
      metadata: data,
    });
  }

  async recordMessage(data: MessageRecord): Promise<any> {
    return this.request('/api/opencode/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeMessage(messageId: string, sprintId: number, sessionId: string): Promise<void> {
    await this.request(`/api/opencode/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ sprintId, sessionId }),
    });
  }
}

export interface AgentSuggestionRequest {
  sprintId?: number;
  storyId?: number;
  type: 'breakdown' | 'estimate' | 'related' | 'acceptance_criteria' | 'test_cases' | 'sprint_planning';
  query?: string;
}

export interface ConversationHistoryParams {
  sprintId?: number;
  limit?: number;
}

export interface ClearHistoryParams {
  sprintId?: number;
}

export interface AiAgentDefinition {
  key: string;
  name: string;
  description: string;
  icon: string | null;
  category: string | null;
  capabilities: string;
  defaultEnabled: boolean;
}

export interface SprintAiAgent {
  sprintId: number;
  agentKey: string;
  enabled: boolean;
  position: number;
  agent: AiAgentDefinition;
}
