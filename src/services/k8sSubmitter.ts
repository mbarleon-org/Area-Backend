import { KubeConfig, BatchV1Api } from '@kubernetes/client-node';
import * as fs from 'fs';
import { CONFIG } from '../config';

export interface SubmitJobOptions {
    jobId: string;
    workflowId: string;
    workflowVersion?: string;
    input?: any;
    callbackUrl: string;
    callbackNonce: string;
    modulesBase?: string | null;
    image?: string;
    namespace?: string;
}

type JobPayload = {
    jobId: string;
    workflowId: string;
    workflowVersion?: string;
    input?: any;
    callbackUrl: string;
    callbackNonce: string;
    modulesBase?: string | null;
};

type JobManifest = Record<string, any>;

/**
 * Build the object injected into the `JOB_JSON` env var inside the ephemeral Job.
 * @param {SubmitJobOptions} opts - job submission options
 * @returns {JobPayload} payload object
 */
function buildPayload(opts: SubmitJobOptions): JobPayload {
    return {
        jobId: opts.jobId,
        workflowId: opts.workflowId,
        workflowVersion: opts.workflowVersion,
        input: opts.input,
        callbackUrl: opts.callbackUrl,
        callbackNonce: opts.callbackNonce,
        modulesBase: opts.modulesBase || null
    };
}

/**
 * Build the container spec used in the Job manifest.
 * @param {string} image - container image
 * @param {JobPayload} payload - payload to serialize into `JOB_JSON`
 * @returns {Record<string, any>} container spec
 */
function buildContainerSpec(image: string, payload: JobPayload): Record<string, any> {
    return {
        name: 'runner',
        image,
        command: ['sh', '-c', "[ -f /app/dist/ephemeral/execJob.js ] && exec node /app/dist/ephemeral/execJob.js || exec node -r ts-node/register/transpile-only /app/src/ephemeral/execJob.ts"],
        env: [
            { name: 'JOB_JSON', value: JSON.stringify(payload) },
            { name: 'RUNNER_SHARED_SECRET', value: String(process.env.RUNNER_SHARED_SECRET || '') }
        ]
    };
}

/**
 * Build a Kubernetes Job manifest for the ephemeral runner.
 * @param {string} name - job name
 * @param {string} namespace - k8s namespace
 * @param {string} image - container image
 * @param {JobPayload} payload - payload object to include
 * @returns {JobManifest} manifest object
 */
function buildJobManifest(name: string, namespace: string, image: string, payload: JobPayload): JobManifest {
    return {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: { name, namespace },
        spec: {
            template: {
                metadata: { name },
                spec: {
                    restartPolicy: 'Never',
                    containers: [buildContainerSpec(image, payload)]
                }
            }
        }
    };
}

/**
 * Load kube configuration. Tries default kubeconfig, then in-cluster config.
 * @returns {KubeConfig}
 * @throws Error when no kube config could be loaded
 */
function loadKubeConfig(): KubeConfig {
    const kc = new KubeConfig();
    try {
        kc.loadFromDefault();
        return kc;
    } catch (err) {
        try {
            kc.loadFromCluster();
            return kc;
        } catch (e) {
            throw new Error('Failed to load Kubernetes configuration: ' + String(e));
        }
    }
}

/**
 * Resolve namespace and image defaults from configuration and options.
 * @param {SubmitJobOptions} opts
 * @returns {{ns: string, image: string}}
 */
function resolveNamespaceAndImage(opts: SubmitJobOptions): { ns: string; image: string } {
    const ns = opts.namespace || CONFIG.K8S_NAMESPACE || 'default';
    const image = opts.image || CONFIG.K8S_IMAGE || process.env.RUNNER_EPHEMERAL_IMAGE || 'ghcr.io/area/worker:latest';
    return { ns, image };
}

/**
 * Submit a Kubernetes Job using the cluster configuration available in the environment.
 * Uses the current kubeconfig (in-cluster or KUBECONFIG) to authenticate.
 * The backend configuration in `CONFIG` must have `RUNNER_EPHEMERAL_K8S` enabled to allow submissions.
 *
 * @param {SubmitJobOptions} opts - submission options
 * @returns {Promise<any>} the created Job object as returned by the Kubernetes API
 * @throws {Error} when submitter is disabled or kube config cannot be loaded
 */
export async function submitK8sJob(opts: SubmitJobOptions): Promise<any> {
    if (!CONFIG.RUNNER_EPHEMERAL_K8S) {
        throw new Error('K8s submitter is disabled in configuration (RUNNER_EPHEMERAL_K8S=false)');
    }

    const kc = loadKubeConfig();
    const client = kc.makeApiClient(BatchV1Api) as any;

    const { ns, image } = resolveNamespaceAndImage(opts);
    const payload = buildPayload(opts);
    const manifest = buildJobManifest(`runner-${opts.jobId}`, ns, image, payload);
    manifest.metadata = manifest.metadata || {};
    manifest.metadata.namespace = manifest.metadata.namespace || ns;
    try {
        const res = await client.createNamespacedJob({ namespace: ns, body: manifest } as any);
        return res && res.body ? res.body : res;
    } catch (clientErr: any) {
        const clientMsg = String(clientErr && (clientErr.message || clientErr.body || clientErr));
        console.warn('[backend:k8s] createNamespacedJob client call failed, attempting HTTP fallback', { namespace: ns, err: clientMsg });

        const combined = new Error('createNamespacedJob client call failed: ' + clientMsg);
        (combined as any).cause = { clientError: clientErr };

        try {
            const cluster = (kc as any).getCurrentCluster ? (kc as any).getCurrentCluster() : null;
            if (cluster && (globalThis as any).fetch) {
                const url = `${cluster.server.replace(/\/$/, '')}/apis/batch/v1/namespaces/${encodeURIComponent(ns)}/jobs`;
                const fetchOpts: any = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(manifest)
                };

                try {
                    const user = (kc as any).getCurrentUser ? (kc as any).getCurrentUser() : null;
                    let token: string | undefined = undefined;
                    if (user) {
                        token = user.token || (user.authProvider && user.authProvider.config && user.authProvider.config['access-token']) || undefined;
                    }

                    if (!token && fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')) {
                        try {
                            token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8').trim();
                        } catch (e) { /* ignore */ }
                    }

                    try {
                        if (typeof (kc as any).applyToRequest === 'function') {
                            (kc as any).applyToRequest(fetchOpts);
                        }
                    } catch (e) { /* ignore */ }

                    if (!fetchOpts.headers) fetchOpts.headers = {};
                    if (!fetchOpts.headers['Authorization'] && token) {
                        fetchOpts.headers['Authorization'] = `Bearer ${token}`;
                    }
                } catch (e) { /* ignore */ }

                try {
                    const resp = await (globalThis as any).fetch(url, fetchOpts);
                    if (!resp.ok) {
                        const body = await resp.text();
                        throw new Error('k8s http fallback failed: ' + resp.status + ' ' + body);
                    }
                    const body = await resp.json();
                    return body;
                } catch (httpErr: any) {
                    (combined as any).httpFallbackError = String(httpErr);
                }
            }
        } catch (httpFallbackErr) {
            (combined as any).httpFallbackError = String(httpFallbackErr);
        }

        throw combined;
    }
}

export default { submitK8sJob };
