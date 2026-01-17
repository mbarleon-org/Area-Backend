export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

async function sheetsUpdate(accessToken: string, spreadsheetId: string, range: string, values: any, valueInputOption: string) {
    const fetchFn = getFetch();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=${encodeURIComponent(valueInputOption)}`;
    const body = {
        values: Array.isArray(values) && Array.isArray(values[0]) ? values : [values],
        majorDimension: 'ROWS'
    };
    const res = await fetchFn(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok || json.error) {
        const err = (json && json.error && json.error.message) ? json.error.message : 'sheets_update_failed';
        throw new Error(err);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'update_row',
        pretty_name: 'Update Row',
        description: 'Update cells within a specified range (row) in a Google Sheet.',
        credential_type: ['google_sheets.oauth_token', 'google_sheets.api_token'],
        inputs: [
            { id: 'spreadsheet_id', pretty_name: 'Spreadsheet ID', type: 'string', required: true },
            { id: 'range', pretty_name: 'Range (A1 notation)', type: 'string', required: true },
            { id: 'values', pretty_name: 'Values (array or array of arrays)', type: 'json', required: true },
            { id: 'value_input_option', pretty_name: 'Value Input Option', type: 'string', required: false, default: 'USER_ENTERED' }
        ],
        outputs: [
            { id: 'updatedRange', pretty_name: 'Updated Range', type: 'string' },
            { id: 'updatedRows', pretty_name: 'Updated Rows', type: 'number' },
            { id: 'spreadsheetId', pretty_name: 'Spreadsheet ID', type: 'string' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('google_sheets.oauth_token') || await ctx.getCredential('google_sheets.api_token');
        const token = cred && (cred.access_token || cred.token);
        if (!token) throw new Error('missing Google Sheets access token (oauth_token or api_token)');

        const valueInputOption = inputs.value_input_option || 'USER_ENTERED';
        const res = await sheetsUpdate(token, inputs.spreadsheet_id, inputs.range, inputs.values, valueInputOption);
        const updates = res.updatedData || res.updates || {};
        return {
            updatedRange: updates.updatedRange || inputs.range,
            updatedRows: updates.updatedRows || updates.updatedRowsCount || 0,
            spreadsheetId: res.spreadsheetId || inputs.spreadsheet_id
        };
    }
};
