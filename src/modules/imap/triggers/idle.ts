import { createListener } from "./src/create_listener";

module.exports = {
    spec: {
        id: 'idle',
        pretty_name: 'IMAP idle listener',
        description: 'Listen for new messages via IMAP IDLE. Module should create an IMAP client and pass a createListener function.',
        inputs: [],
        options: [
            { id: 'host', pretty_name: 'IMAP host', type: 'string' },
            { id: 'port', pretty_name: 'IMAP port', type: 'number' },
            { id: 'username', pretty_name: 'Username', type: 'string' },
            { id: 'password', pretty_name: 'Password', type: 'string' }
        ],
        outputs: []
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        if (!trig.createListener) {
            trig.createListener = (onMessage: (msg: any) => Promise<void>) => createListener(trig, options, onMessage);
        }

        const apiImap = require('../../../api/triggers/imap');
        if (!apiImap || typeof apiImap.register !== 'function') {
            throw new Error('api trigger for imap is not available');
        }
        return apiImap.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
