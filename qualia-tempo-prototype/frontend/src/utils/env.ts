// This is the complete and correct content for env.ts

/**
 * Determines if the application is running in a development environment.
 * QUALIA.CODE: This check MUST be strict. Only 'development' is considered dev.
 * 'test', 'production', or any other value is NOT a development environment.
 */
export const env = {
  get isDev(): boolean {
    return process.env.NODE_ENV === 'development';
  }
};
