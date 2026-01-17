export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

async function createIssue(token: string, owner: string, repo: string, title: string, body: string | undefined, labels: any) {
    const fetchFn = getFetch();
    const res = await fetchFn(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'area-backend',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, body, labels })
    });
    const json = await res.json();
    if (!res.ok) {
        const err = (json && json.message) ? json.message : 'github_issue_failed';
        throw new Error(err);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'create_issue',
        pretty_name: 'Create Issue',
        description: 'Create a GitHub issue in a repository.',
        credential_type: 'github.pat',
        inputs: [
            { id: 'owner', pretty_name: 'Owner/Org', type: 'string', required: true },
            { id: 'repo', pretty_name: 'Repository', type: 'string', required: true },
            { id: 'title', pretty_name: 'Title', type: 'string', required: true },
            { id: 'body', pretty_name: 'Body', type: 'string', required: false },
            { id: 'labels', pretty_name: 'Labels (array)', type: 'json', required: false }
        ],
        outputs: [
            { id: 'url', pretty_name: 'Issue URL', type: 'string' },
            { id: 'number', pretty_name: 'Issue Number', type: 'number' },
            { id: 'id', pretty_name: 'Issue ID', type: 'string' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('github.pat');
        const token = cred && (cred.token || cred.pat);
        if (!token) throw new Error('missing GitHub PAT credential');

        const res = await createIssue(token, inputs.owner, inputs.repo, inputs.title, inputs.body, inputs.labels);
        return { url: res.html_url, number: res.number, id: String(res.id) };
    }
};
