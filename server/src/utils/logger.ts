const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    if (meta !== undefined) {
      console.log(`[info] ${message}`, meta);
    } else {
      console.log(`[info] ${message}`);
    }
  },

  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (meta !== undefined) {
      console.warn(`[warn] ${message}`, meta);
    } else {
      console.warn(`[warn] ${message}`);
    }
  },

  error: (message: string, meta?: Record<string, unknown>): void => {
    if (meta !== undefined) {
      console.error(`[error] ${message}`, isDev ? meta : {});
    } else {
      console.error(`[error] ${message}`);
    }
  },
};
