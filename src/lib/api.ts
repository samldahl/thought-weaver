const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface Thought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: string;
  parentId?: string;
  notes?: string;
}

export interface Document {
  _id?: string;
  id?: string;
  name: string;
  thoughts: Thought[];
  zoom: number;
  pan: { x: number; y: number };
  usedColors: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
  };
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Important for cookies/sessions
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async login(username: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/me');
  }

  async logout(): Promise<void> {
    await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Document methods
  async getAllDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/documents');
  }

  async getDocument(id: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}`);
  }

  async createDocument(document: Partial<Document>): Promise<Document> {
    return this.request<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document> {
    return this.request<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(document),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
