export const QUEUE_NAMES = {
  analytics: 'analytics',
  billing: 'billing',
  cleanup: 'cleanup',
  media: 'media',
  notifications: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

