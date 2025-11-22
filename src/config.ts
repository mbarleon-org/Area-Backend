export const CONFIG = {
    BASE_PATH: process.env.BASE_PATH || '/api',
    PUBLIC_URL: process.env.PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || '',

    LISTEN_ADDRESS: parseInt(process.env.BACKEND_ADDRESS) || 3000,

    USE_RUNNERS: process.env.USE_RUNNERS !== 'false',

    RUNNER_SHARED_SECRET: process.env.RUNNER_SHARED_SECRET || '',
    RUNNER_CALLBACK_PATH: process.env.RUNNER_CALLBACK_PATH || '/api/runner/callback',

    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    WORKFLOW_STREAM: process.env.WORKFLOW_STREAM || 'workflow_jobs',

    DB_HOST: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432', 10),
    DB_USER: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || process.env.POSTGRES_DB || 'area',
    DATABASE_URL: process.env.DATABASE_URL || '',

    LEGACY_WORKFLOWS_DIR: process.env.LEGACY_WORKFLOWS_DIR || '',
    LEGACY_CREDENTIALS_DIR: process.env.LEGACY_CREDENTIALS_DIR || ''
};
