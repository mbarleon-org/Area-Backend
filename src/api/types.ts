/**
 * Describes a trigger attached to a workflow.
 * @property {string} name - unique trigger name within the workflow
 * @property {string} type - trigger type (e.g. 'cron', 'webhook', 'imap')
 * @property {string} [path] - optional HTTP path for web-based triggers
 * @property {string} [cron] - cron expression when applicable
 * @property {unknown} [payload] - optional static payload provided by trigger
 */
export interface Trigger {
    name: string;
    type: string;
    path?: string;
    cron?: string;
    payload?: unknown;
}

/**
 * Represents an action node within a workflow.
 * @property {string} id - unique id for the node (internal)
 * @property {string} [name] - human-friendly name used as output key
 * @property {string} [node_id] - optional alternate id field
 * @property {string[]} [parents] - parent node names/ids
 * @property {Record<string, unknown>} [inputs] - inputs mapping for this node
 * @property {Record<string, unknown>} [outputs] - outputs mapping from this node
 * @property {string} [credential_id] - optional credential reference
 */
export interface ActionNode {
    id: string;
    name?: string;
    node_id?: string;
    parents?: string[];
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    credential_id?: string;
}

/**
 * Workflow definition used by the runtime.
 * @property {string} id - unique workflow id
 * @property {boolean} [enabled] - whether the workflow is enabled
 * @property {string} [pretty_name] - optional display name
 * @property {string} [description] - optional description
 * @property {Trigger[]} [triggers] - array of triggers
 * @property {ActionNode[]} [actions] - array of action nodes
 * @property {string} [credential_id] - optional default credential id for the workflow
 *
 * @returns {string} the workflow id when used by validators (note: this is a type-only file)
 */
export interface Workflow {
    id: string;
    enabled?: boolean;
    pretty_name?: string;
    description?: string;
    triggers?: Trigger[];
    actions?: ActionNode[];
    credential_id?: string;
}

/**
 * Registered HTTP route descriptor returned by trigger registration.
 */
export interface RegisteredRoute { workflow: string; path: string; router?: unknown }

/**
 * Scheduled job info used by registrars.
 */
export interface ScheduledJobInfo { workflow: string; trigger: string; cron: string; job?: unknown }
