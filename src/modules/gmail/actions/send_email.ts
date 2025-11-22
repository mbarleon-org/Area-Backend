import { sendEmailHandler } from "./src/send_email_handler.js"

module.exports = {
    spec: {
        id: 'send_email',
        pretty_name: 'Send Email',
        description: 'Send an email using a Gmail API token or email+app-password (SMTP)',
        credential_type: ['gmail.api_token', 'gmail.email_app_password'],
        inputs: [
            { id: 'to', pretty_name: 'To', type: 'string', required: true },
            { id: 'subject', pretty_name: 'Subject', type: 'string', required: true },
            { id: 'body', pretty_name: 'Body', type: 'string', required: false },
            { id: 'html', pretty_name: 'HTML Body', type: 'string', required: false },
            { id: 'from', pretty_name: 'From', type: 'string', required: false }
        ],
        outputs: [
            { id: 'messageId', pretty_name: 'Message ID', type: 'string' },
            { id: 'status', pretty_name: 'Status', type: 'string' },
            { id: 'method', pretty_name: 'Method', type: 'string' }
        ],
    },

    handler: sendEmailHandler
};
