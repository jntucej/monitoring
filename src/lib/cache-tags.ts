export const CACHE_TAGS = {
  departments: 'departments',
  gates: 'gates',
  alerts: 'alerts',
  config: 'config',
  roles: 'roles',
  passTypes: 'pass-types',
} as const;

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS];
