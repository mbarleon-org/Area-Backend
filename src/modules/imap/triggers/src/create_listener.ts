const ImapFlow = require('imapflow').ImapFlow || require('imapflow');

export function createListener(trig: any, options: any, onMessage: (msg: any) => Promise<void>) {
    const credPromise = (options && typeof options.getCredentialById === 'function' && trig.credential_id)
        ? Promise.resolve(options.getCredentialById(trig.credential_id)).then((r: any) => r).catch(() => null)
        : Promise.resolve(null);

    const cfgHost = trig.host;
    const cfgPort = trig.port;
    const cfgInbox = trig.inbox;
    const cfgUser = trig.username;
    const cfgPass = trig.password;

    let client: any = null;
    let stopped = false;

    (async () => {
        try {
            const cred = await credPromise;
            let c: any = null;
            if (cred && typeof cred === 'object') {
                if (cred['imap.account']) {
                    c = cred['imap.account'];
                } else {
                    c = cred;
                }
            }

            const host = (c && c.host) || cfgHost;
            const port = (c && c.port) || cfgPort;
            const inbox = (c && c.inbox) || cfgInbox || 'INBOX';
            const user = (c && (c.username || c.user)) || cfgUser;
            const pass = (c && (c.password || c.pass)) || cfgPass;

            if (!host || !user || !pass) {
                console.debug('imap listener missing host/user/pass; skipping listener start');
                return;
            }

            const secure = (trig && typeof trig.secure === 'boolean') ? trig.secure : (Number(port) === 993);
            const quietLogger = { debug: () => {}, info: () => {}, error: () => {} };

            client = new ImapFlow({ host, port: Number(port), secure, auth: { user, pass }, logger: quietLogger });

            await client.connect();
            await client.mailboxOpen(inbox);

            client.on('exists', async () => {
                if (stopped) {
                    return;
                }
                try {
                    for await (const msg of client.fetch('1:*', { envelope: true })) {
                        try {
                            await onMessage({ envelope: msg.envelope, uid: msg.uid });
                        } catch (e) {
                            console.error('onMessage handler error', e);
                        }
                    }
                } catch (e) {
                    console.error('imap fetch error', e);
                }
            });
        } catch (e) {
            console.error('imap listener startup error', e);
        }
    })();

    return {
        stop: async () => {
            if (stopped) {
                return;
            }
            stopped = true;
            if (!client) {
                return;
            }
            try {
                await client.logout();
            } catch (e) {
                try { client.destroy(); } catch (_) { }
            }
        }
    };
}
