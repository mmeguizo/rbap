import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(
  error: unknown,
  fallback = 'Request failed. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'The backend could not be reached. Make sure the API server is running.';
    }

    const payload = error.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const message = (payload as { message?: unknown }).message;

      if (Array.isArray(message)) {
        const combined = message
          .filter((item): item is string => typeof item === 'string')
          .join(' ');
        if (combined) {
          return combined;
        }
      }

      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
