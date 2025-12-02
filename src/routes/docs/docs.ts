import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../../config';

const router = express.Router();

function resolveSpecPath(): string {
    const candidates = [
        path.resolve(process.cwd(), 'docs', 'swagger.yaml'),
        path.resolve(__dirname, '..', '..', '..', 'docs', 'swagger.yaml')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[0];
}

function readSpec(): string {
    return fs.readFileSync(resolveSpecPath(), 'utf8');
}

function buildHtml(specUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Area API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
        html, body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.addEventListener('load', () => {
            SwaggerUIBundle({
                url: '${specUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [SwaggerUIBundle.presets.apis],
                layout: "BaseLayout"
            });
        });
    </script>
</body>
</html>`;
}

router.get('/docs/swagger.yaml', (_req, res) => {
    try {
        const contents = readSpec();
        return res.type('text/yaml').send(contents);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Swagger file not found' });
        }
        return res.status(500).json({ error: 'Unable to load Swagger file' });
    }
});

router.get('/docs', (_req, res) => {
    const basePath = (CONFIG.BASE_PATH || '').replace(/\/$/, '');
    const specUrl = `${basePath}/docs/swagger.yaml` || '/docs/swagger.yaml';
    res.type('text/html').send(buildHtml(specUrl));
});

export default router;
