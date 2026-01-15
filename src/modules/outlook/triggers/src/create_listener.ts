export async function createOutlookListener(ctx: any, inputs: any) {
    const credential = ctx.getCredential('outlook.oauth');

    try {
        // Get recent emails from Outlook
        const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc', {
            headers: {
                'Authorization': `Bearer ${credential.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Outlook API error: ${response.statusText}`);
        }

        const data = await response.json();
        const messages = data.value || [];

        // Filter messages based on inputs
        let filteredMessages = messages;

        if (inputs.sender_filter) {
            filteredMessages = filteredMessages.filter((msg: any) =>
                msg.sender?.emailAddress?.address?.toLowerCase().includes(inputs.sender_filter.toLowerCase())
            );
        }

        if (inputs.subject_filter) {
            filteredMessages = filteredMessages.filter((msg: any) =>
                msg.subject?.toLowerCase().includes(inputs.subject_filter.toLowerCase())
            );
        }

        // Return the most recent matching message
        if (filteredMessages.length > 0) {
            const latestMessage = filteredMessages[0];
            return {
                subject: latestMessage.subject,
                sender: latestMessage.sender?.emailAddress?.address,
                body: latestMessage.body?.content,
                received_time: latestMessage.receivedDateTime
            };
        }

        return null; // No matching messages

    } catch (error) {
        ctx.logger.error('Failed to check Outlook emails:', error);
        throw error;
    }
}
