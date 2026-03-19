import type { ApiAdapter } from './types';

/**
 * Mock adapter for development/testing without a WordPress backend.
 * Pass pre-configured mock data keyed by URL pattern.
 */
export class MockAdapter implements ApiAdapter {
  constructor(private mockData: Record<string, unknown> = {}) {}

  private resolve<T>(url: string): T {
    // Try exact match first, then pattern match
    if (url in this.mockData) {
      return this.mockData[url] as T;
    }

    // Try prefix matching (e.g., "/dw-church/v1/sermons" matches "/dw-church/v1/sermons?page=1")
    for (const [pattern, data] of Object.entries(this.mockData)) {
      if (url.startsWith(pattern)) {
        return data as T;
      }
    }

    return [] as unknown as T;
  }

  async get<T>(url: string, _params?: Record<string, unknown>): Promise<T> {
    return Promise.resolve(this.resolve<T>(url));
  }

  async post<T>(url: string, _data?: unknown): Promise<T> {
    return Promise.resolve(this.resolve<T>(url));
  }

  async put<T>(url: string, _data?: unknown): Promise<T> {
    return Promise.resolve(this.resolve<T>(url));
  }

  async delete<T>(url: string): Promise<T> {
    return Promise.resolve(this.resolve<T>(url));
  }

  /** Add or update mock data at runtime */
  setMockData(url: string, data: unknown): void {
    this.mockData[url] = data;
  }
}
