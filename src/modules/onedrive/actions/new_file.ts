/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** new_file.ts
*/

module.exports = {
    spec: {
        id: 'new_file',
        pretty_name: 'New File in Directory',
        description: 'Triggers when new file appears in OneDrive directory',
        credential_type: 'onedrive.oauth',
        inputs: [
            { id: 'directory_path', pretty_name: 'Directory Path', type: 'string', required: true }
        ],
        outputs: [
            { id: 'file_name', pretty_name: 'File Name', type: 'string' },
            { id: 'file_url', pretty_name: 'File URL', type: 'string' },
            { id: 'file_size', pretty_name: 'File Size', type: 'number' }
        ]
    },
    handler: async (ctx, inputs) => {
        const credential = ctx.getCredential('onedrive.oauth');
        // Use Microsoft Graph API
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${inputs.directory_path}:/children`, {
            headers: { 'Authorization': `Bearer ${credential.access_token}` }
        });
        const data = await response.json();
        const latestFile = data.value[0];
        return {
            file_name: latestFile.name,
            file_url: latestFile.webUrl,
            file_size: latestFile.size
        };
    }
};
