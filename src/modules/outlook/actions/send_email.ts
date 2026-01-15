import { sendOutlookEmailHandler } from "./src/send_email_handler.js"

export const spec = {
    id: "send_email",
    pretty_name: "Send Email",
    description: "Send an email using Outlook 365",
    credential_type: "outlook.oauth",
    inputs: [
        { id: "to", pretty_name: "Recipient Email", type: "string", required: true },
        { id: "subject", pretty_name: "Subject", type: "string", required: true },
        { id: "body", pretty_name: "Email Body (Text)", type: "string", required: false },
        { id: "html", pretty_name: "Email Body (HTML)", type: "string", required: false },
        { id: "from", pretty_name: "From Address (optional)", type: "string", required: false }
    ],
    outputs: [
        { id: "messageId", pretty_name: "Message ID", type: "string" },
        { id: "status", pretty_name: "Send Status", type: "string" },
        { id: "method", pretty_name: "Send Method", type: "string" }
    ]
};

export async function handler(ctx: any, inputs: any) {
    const { sendOutlookEmailHandler } = await import('./src/send_email_handler');
    return await sendOutlookEmailHandler(ctx, inputs, {});
}
