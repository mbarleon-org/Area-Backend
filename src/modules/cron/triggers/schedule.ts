module.exports = {
    spec: {
        id: 'schedule',
        pretty_name: 'Scheduled trigger (cron or interval)',
        description: 'Trigger workflows on a cron expression or on a fixed interval. Use `cron` for cron-style schedules or `interval` for human-friendly durations like `10s`, `5m`, `1h`.',
        inputs: [],
        options: [
            { id: 'cron', pretty_name: 'Cron expression', type: 'string', description: 'A cron expression (see node-cron).' },
            { id: 'interval', pretty_name: 'Interval', type: 'string', description: 'A human-friendly interval (e.g. `10s`, `5m`, `1h`). Takes precedence over `cron` when present.' },
        ],
        outputs: [],
    },

    handler: async function (_ctx, _inputs) {
        return {};
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const apiCron = require('../../../api/triggers/cron');
        if (!apiCron || typeof apiCron.register !== 'function') {
            throw new Error('api trigger for cron is not available');
        }
        return apiCron.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
