/**
 * Custom Error Types for Task Provider operations
 */

export class TaskProviderError extends Error {
  constructor(message: string, public statusCode?: number, public originalError?: Error) {
    super(message);
    this.name = 'TaskProviderError';
  }
}

export class ValidationError extends TaskProviderError {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends TaskProviderError {
  constructor(message: string, public retryable: boolean = true) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends TaskProviderError {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}