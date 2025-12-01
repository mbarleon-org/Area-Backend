import handler from "./src/send_message";

module.exports = {
    spec: {
        id: 'send_message',
        pretty_name: 'Send Message',
        description: 'Send a message to a Discord channel using a bot token',
        credential_type: ['discord.bot_token'],
        inputs: [
            { id: 'channel', pretty_name: 'Channel ID', type: 'string', required: true },
            { id: 'content', pretty_name: 'Content', type: 'string', required: true }
        ],
        outputs: [
            { id: 'messageId', pretty_name: 'Message ID', type: 'string' },
            { id: 'status', pretty_name: 'Status', type: 'string' }
        ]
    },

    handler: handler
};
