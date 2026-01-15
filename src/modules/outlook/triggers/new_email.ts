import { createOutlookListener } from "./src/create_listener";

export const spec = {
    id: "new_email",
    pretty_name: "New Email Received",
    description: "Triggers when a new email is received in Outlook inbox",
    credential_type: "outlook.oauth",
    inputs: [
        { id: "sender_filter", pretty_name: "Sender Email Filter (optional)", type: "string", required: false },
        { id: "subject_filter", pretty_name: "Subject Contains (optional)", type: "string", required: false }
    ],
    outputs: [
        { id: "subject", pretty_name: "Email Subject", type: "string" },
        { id: "sender", pretty_name: "Sender Email", type: "string" },
        { id: "body", pretty_name: "Email Body", type: "string" },
        { id: "received_time", pretty_name: "Received Time", type: "string" }
    ]
};

export async function handler(ctx: any, inputs: any) {
    const { createOutlookListener } = await import('./src/create_listener');
    return await createOutlookListener(ctx, inputs);
}
