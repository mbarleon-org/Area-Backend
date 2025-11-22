import * as https from 'https';
import * as nodemailer from 'nodemailer';

interface SendInputs {
    to?: string | string[];
    subject?: string;
    body?: any;
    html?: string;
    from?: string;
}

async function sendViaGmailApi(accessToken: string, fromAddr: string, toAddr: string, subject: string, textBody: string, htmlBody?: string) {
    let message = '';
    message += `From: ${fromAddr}\r\n`;
    message += `To: ${toAddr}\r\n`;
    message += `Subject: ${subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;

    if (htmlBody) {
        const boundary = '----=_NodeMailerBoundary_' + Date.now();
        message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += `${textBody || ''}\r\n\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
        message += `${htmlBody}\r\n\r\n`;
        message += `--${boundary}--`;
    } else {
        message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
        message += `${textBody || ''}`;
    }

    const b64 = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const postData = JSON.stringify({ raw: b64 });

    const options = {
        hostname: 'gmail.googleapis.com',
        path: '/gmail/v1/users/me/messages/send',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    } as any;

    return new Promise<any>((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try { const parsed = JSON.parse(data); resolve(parsed); } catch (e) { resolve({ raw: data }); }
                } else {
                    reject(new Error(`Gmail API error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

async function sendViaSmtp(email: string, appPassword: string, fromAddr: string, toAddr: string, subject: string, textBody: string, htmlBody?: string) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: email,
            pass: appPassword,
        }
    });

    const mailOptions: any = { from: fromAddr, to: toAddr, subject };
    if (htmlBody) {
        mailOptions.html = htmlBody;
    }
    if (textBody) {
        mailOptions.text = textBody;
    }

    const info = await transporter.sendMail(mailOptions);
    return info;
}

export async function sendEmailHandler(ctx: any, inputs: SendInputs) {
    const preferred = ['gmail.api_token', 'gmail.email_app_password'];
    let usedType: string | null = null;
    let cred: any = null;
    for (const t of preferred) {
        const c = await ctx.getCredential(t);
        if (c) { usedType = t; cred = c; break; }
    }

    if (!cred) {
        throw new Error('missing credential: provide gmail.api_token or gmail.email_app_password');
    }

    let toRaw: any = inputs.to;
    if (Array.isArray(toRaw)) {
        toRaw = toRaw.join(',');
    }
    if (typeof toRaw === 'string') {
        toRaw = toRaw.trim();
    }

    if (!toRaw && (inputs as any).parent) {
        const p = (inputs as any).parent;
        if (p && typeof p.to === 'string') toRaw = p.to.trim();
        if (!toRaw && p && p.body && typeof p.body.to === 'string') toRaw = p.body.to.trim();
    }

    if (!toRaw && inputs.from) {
        toRaw = String(inputs.from).trim();
    }

    if (!toRaw) {
        throw new Error('missing input: to (recipient)');
    }

    let subjectStr = inputs.subject || '';
    if (typeof subjectStr !== 'string') {
        subjectStr = String(subjectStr);
    }

    let bodyStr: string = '';
    if (inputs.body !== undefined && inputs.body !== null) {
        if (typeof inputs.body === 'string') {
            bodyStr = inputs.body;
        } else {
            try {
                bodyStr = JSON.stringify(inputs.body);
            } catch (e) {
                bodyStr = String(inputs.body);
            }
        }
    }

    const htmlStr = inputs.html && typeof inputs.html === 'string' ? inputs.html : undefined;

    ctx.logger.info('send_email called', { to: toRaw, subject: subjectStr, method: usedType });

    const from = inputs.from || (cred && cred.email) || 'no-reply@example.com';

    try {
        if (usedType === 'gmail.api_token') {
            const accessToken = cred.api_key || cred.access_token || cred.token;
            if (!accessToken) {
                throw new Error('gmail.api_token credential missing api_key/access_token');
            }
            const apiRes = await sendViaGmailApi(accessToken, from, toRaw, subjectStr, bodyStr, htmlStr);
            const apiResAny: any = apiRes;
            return { messageId: apiResAny && apiResAny.id ? apiResAny.id : null, status: 'sent', method: usedType };
        }

        if (usedType === 'gmail.email_app_password') {
            const email = cred.email;
            const appPassword = cred.app_password || cred.password;
            if (!email || !appPassword) {
                throw new Error('gmail.email_app_password missing email or app_password');
            }
            const info = await sendViaSmtp(email, appPassword, from, toRaw, subjectStr, bodyStr, htmlStr);
            const infoAny: any = info;
            return { messageId: infoAny && infoAny.messageId ? infoAny.messageId : null, status: 'sent', method: usedType };
        }

        throw new Error('unsupported credential method');
    } catch (err) {
        ctx.logger.error('send_email failed', err);
        throw err;
    }
}
