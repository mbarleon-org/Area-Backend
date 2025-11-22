export { };

const IORedis = require('ioredis');

module.exports = {
    createConsumer: function (trig: any, consumerFn: Function, options: any) {
        let cred: any = null;
        try {
            if (options && typeof options.getCredentialById === 'function' && trig.credential_id) {
                cred = options.getCredentialById(trig.credential_id);
            }
        } catch (e) { }

        const channel = (trig.options && (trig.options.queue || trig.options.channel)) || 'demo';

        const connOpts: any = {};
        if (cred) {
            if (cred.host) {
                connOpts.host = cred.host;
            }
            if (cred.port) {
                connOpts.port = parseInt(cred.port, 10);
            }
            if (cred.password) {
                connOpts.password = cred.password;
            }
        } else {
            connOpts.host = process.env.REDIS_HOST || '127.0.0.1';
            connOpts.port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
        }

        const sub = new IORedis(connOpts);
        let stopped = false;
        sub.on('error', (err: any) => {
            console.error('[redis consumer] connection error', err && err.message || err);
        });

        sub.subscribe(channel).then(() => { }).catch((e: any) => {
            console.error('[redis consumer] subscribe failed', e && e.message || e);
        });

        sub.on('message', async (ch: string, message: string) => {
            try {

                let payload: any = message;
                try {
                    payload = JSON.parse(message);
                } catch (_) {
                    payload = message;
                }
                await consumerFn(payload);
            } catch (e) {
                console.error('redis consumer handler error', e);
            }
        });

        return {
            stop: () => {
                if (stopped) {
                    return;
                }
                stopped = true;
                try {
                    sub.quit();
                } catch (e) { }
            }
        };
    }
};
