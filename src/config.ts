/**
 * Lightweight configuration shape for the application.
 *
 * @typedef {Object} AppConfig
 * @property {string} BASE_PATH - base API path
 * @property {string} PUBLIC_URL - public URL of the backend
 * @property {number} LISTEN_ADDRESS - numeric listen port/address
 * @property {boolean} USE_RUNNERS - whether to use external runners
 * @property {string} RUNNER_SHARED_SECRET - shared secret for runners
 * @property {string} RUNNER_CALLBACK_PATH - callback path for runners
 * @property {string} REDIS_URL - redis connection URL
 * @property {string} WORKFLOW_STREAM - redis stream name for workflow jobs
 * @property {string} DB_HOST - database host
 * @property {number} DB_PORT - database port
 * @property {string} DB_USER - database username
 * @property {string} DB_PASSWORD - database password
 * @property {string} DB_NAME - database name
 * @property {string} DATABASE_URL - full database URL (optional)
 * @property {string} LEGACY_WORKFLOWS_DIR - optional legacy workflows dir
 * @property {string} LEGACY_CREDENTIALS_DIR - optional legacy credentials dir
 */
export interface AppConfig {
    BASE_PATH: string;
    PUBLIC_URL: string;
    LISTEN_ADDRESS: number;
    USE_RUNNERS: boolean;
    RUNNER_SHARED_SECRET: string;
    RUNNER_CALLBACK_PATH: string;
    REDIS_URL: string;
    WORKFLOW_STREAM: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    DATABASE_URL: string;
    AREA_ENCRYPTION_KEY?: string;
    LEGACY_WORKFLOWS_DIR: string;
    LEGACY_CREDENTIALS_DIR: string;
    RUNNER_EPHEMERAL_K8S?: boolean;
    K8S_NAMESPACE?: string;
    K8S_IMAGE?: string;
    JWT_SECRET: string;
    JWT_EXPIRY: string;
    CHECK_USER_EMAIL?: boolean;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_FROM?: string;
    SMTP_PASSWORD?: string;
    SMTP_SSL?: boolean;
    FRONTEND_PUBLIC_URL?: string;
}

/**
 * Build the runtime configuration from environment variables.
 *
 * @returns {AppConfig} resolved configuration object
 */
function buildConfig(): AppConfig {
    return {
        BASE_PATH: '/api', // enforce /api as of now
        PUBLIC_URL: process.env.PUBLIC_URL || '',
        LISTEN_ADDRESS: parseInt(process.env.BACKEND_ADDRESS || '', 10) || 3000,
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
        LEGACY_CREDENTIALS_DIR: process.env.LEGACY_CREDENTIALS_DIR || '',
        AREA_ENCRYPTION_KEY: process.env.AREA_ENCRYPTION_KEY,
        RUNNER_EPHEMERAL_K8S: (process.env.RUNNER_EPHEMERAL_K8S || process.env.K8S_SUBMITTER_ENABLED || process.env.ENABLE_K8S_SUBMITTER || 'false') === 'true',
        K8S_NAMESPACE: process.env.K8S_NAMESPACE || process.env.K8S_SUBMITTER_NAMESPACE || 'default',
        K8S_IMAGE: process.env.K8S_IMAGE || process.env.K8S_SUBMITTER_IMAGE || process.env.RUNNER_EPHEMERAL_IMAGE || 'ghcr.io/area/worker:latest',
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRY: process.env.JWT_EXPIRY || '8h',
        CHECK_USER_EMAIL: process.env.CHECK_USER_EMAIL !== 'false',
        SMTP_HOST: process.env.SMTP_HOST || (process.env.CHECK_USER_EMAIL !== 'false' ? null : ''),
        SMTP_PORT: process.env.SMTP_PORT || (process.env.CHECK_USER_EMAIL !== 'false' ? null : ''),
        SMTP_USER: process.env.SMTP_USER || (process.env.CHECK_USER_EMAIL !== 'false' ? null : ''),
        SMTP_FROM: process.env.SMTP_FROM || 'AREA',
        SMTP_PASSWORD: process.env.SMTP_PASSWORD || (process.env.CHECK_USER_EMAIL !== 'false' ? null : ''),
        SMTP_SSL: process.env.SMTP_SSL === 'true',
        FRONTEND_PUBLIC_URL: process.env.FRONTEND_PUBLIC_URL || process.env.PUBLIC_URL || '',
    };
}

export const CONFIG: AppConfig = buildConfig();
