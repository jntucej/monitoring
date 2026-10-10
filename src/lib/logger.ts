import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: () => ({
      service: 'gate-monitor',
      env: process.env.NODE_ENV,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password', 'token', 'authorization', 'cookie', 'secret',
      '*.password', '*.token', '*.pin', '*.thumbprint_hash',
      '*.two_factor_secret', '*.initial_pin_hash',
    ],
    censor: '[REDACTED]',
  },
});

export function createLogger(context: string) {
  return logger.child({ context });
}
