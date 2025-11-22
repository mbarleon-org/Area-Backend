export { };

const IORedis = require('ioredis');

module.exports = {
    publish: async function (inputs: any, options: any) {
        let cred: any = null;
        try {
            if (options && typeof options.getCredentialById === 'function' && options.credential_id) {
                cred = options.getCredentialById(options.credential_id);
            }
        } catch (e) { }

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

        const client = new IORedis(connOpts);
        try {
            const payload = typeof inputs.message === 'string' ? inputs.message : JSON.stringify(inputs.message);
            await client.publish(inputs.channel, payload);
        } finally {
            try {
                client.quit();
            } catch (e) { }
        }
    }
};
