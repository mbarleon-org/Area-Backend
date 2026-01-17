export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

async function createNotionPage(token: string, databaseId: string, properties: any, children?: any[]) {
    const fetchFn = getFetch();
    const res = await fetchFn('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            parent: { database_id: databaseId },
            properties,
            children
        })
    });
    const json = await res.json();
    if (!res.ok) {
        const err = (json && json.message) ? json.message : 'notion_create_failed';
        throw new Error(err);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'create_database_item',
        pretty_name: 'Create Database Item',
        description: 'Create a new item in a Notion database.',
        credential_type: 'notion.api_token',
        inputs: [
            { id: 'database_id', pretty_name: 'Database ID', type: 'string', required: true },
            { id: 'properties', pretty_name: 'Properties JSON', type: 'json', required: true },
            { id: 'children', pretty_name: 'Children Blocks', type: 'json', required: false }
        ],
        outputs: [
            { id: 'page_id', pretty_name: 'Page ID', type: 'string' },
            { id: 'url', pretty_name: 'URL', type: 'string' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('notion.api_token');
        const token = cred && (cred.token || cred.api_token);
        if (!token) throw new Error('missing Notion API token credential');

        const res = await createNotionPage(token, inputs.database_id, inputs.properties, inputs.children);
        return { page_id: res.id, url: res.url };
    }
};
