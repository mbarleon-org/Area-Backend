import * as https from 'https';

export async function sendOutlookEmailHandler(ctx: any, inputs: any, options: any) {
    const credential = ctx.getCredential('outlook.oauth');

    const emailData: any = {
        message: {
            subject: inputs.subject,
            body: {
                contentType: inputs.html ? 'HTML' : 'Text',
                content: inputs.html || inputs.body || ''
            },
            toRecipients: [{
                emailAddress: {
                    address: inputs.to
                }
            }]
        }
    };

    if (inputs.from) {
        emailData.message.from = {
            emailAddress: {
                address: inputs.from
            }
        };
    }

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credential.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (response.ok) {
            return {
                messageId: 'sent',
                status: 'success',
                method: 'outlook_api'
            };
        } else {
            const error = await response.text();
            throw new Error(`Outlook API error: ${error}`);
        }
    } catch (error) {
        ctx.logger.error('Failed to send Outlook email:', error);
        throw error;
    }
}
