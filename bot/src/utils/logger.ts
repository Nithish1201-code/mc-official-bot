import pino from "pino";

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "mc-bot",
    environment: process.env.NODE_ENV || "production",
  },
};

export const logger = pino(pinoOptions);

export class StructuredLogger {
  constructor(private module: string) {}

  info(msg: string, data?: Record<string, unknown>): void {
    logger.info({ module: this.module, ...data }, msg);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    logger.warn({ module: this.module, ...data }, msg);
  }

  error(msg: string, error?: Error, data?: Record<string, unknown>): void {
    logger.error(
      { module: this.module, error, ...data },
      msg
    );
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    logger.debug({ module: this.module, ...data }, msg);
  }
}
