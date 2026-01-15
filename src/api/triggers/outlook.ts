import * as express from 'express';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export function register(
    app: express.Express,
    workflow: any,
    trigger: any,
    actionsList: any[],
    registry: any,
    options: any
) {
    // Get the Outlook module trigger handler
    const outlookModule = registry.modules.outlook;
    const newEmailTrigger = outlookModule.triggers.new_email;

    // Call the module trigger handler to set up the listener
    const listener = newEmailTrigger.handler({
        getCredential: (type: string) => trigger.credentials[type],
        logger: console
    }, trigger.inputs, (emailData: any) => {
        // This callback is called when new email arrives
        dispatchWorkflow({
            wf: workflow,
            actionsList,
            registry,
            triggerOutputs: emailData,
            initialNodeOutputs: {},
            options
        });
    });

    return {
        unregister: () => listener.stop()
    };
}
