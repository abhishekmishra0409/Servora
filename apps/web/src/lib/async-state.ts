export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AsyncState {
  error?: string;
  status: AsyncStatus;
}

export const idle: AsyncState = { status: 'idle' };
export const loading: AsyncState = { status: 'loading' };
export const ready: AsyncState = { status: 'ready' };

export const failed = (error: unknown, fallback = 'Something went wrong.'): AsyncState => ({
  error: error instanceof Error ? error.message : fallback,
  status: 'error',
});

export const errorMessage = (error: unknown, fallback = 'Something went wrong.'): string =>
  error instanceof Error ? error.message : fallback;
