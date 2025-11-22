export interface Trigger {
    name: string;
    type: string;
    path?: string;
    cron?: string;
    payload?: any;
}

export interface ActionNode {
    id: string;
    name?: string;
    node_id?: string;
    parents?: string[];
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    credential_id?: string;
}

export interface Workflow {
    id: string;
    enabled?: boolean;
    pretty_name?: string;
    description?: string;
    triggers?: Trigger[];
    actions?: ActionNode[];
    credential_id?: string;
}

export interface RegisteredRoute { workflow: string; path: string; router?: any }
export interface ScheduledJobInfo { workflow: string; trigger: string; cron: string }
