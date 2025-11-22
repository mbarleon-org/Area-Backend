module.exports = {
    spec: {
        id: 'receive',
        pretty_name: 'WebSocket receive',
        description: 'Mounts a websocket/HTTP endpoint to receive events and trigger workflows. Module can mount real WS server if desired.',
        inputs: [],
        options: [
            { id: 'path', pretty_name: 'Path', type: 'string' }
        ],
        outputs: []
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const apiWs = require('../../../api/triggers/websocket');
        if (!apiWs || typeof apiWs.register !== 'function') {
            throw new Error('api trigger for websocket.receive is not available');
        }
        return apiWs.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
