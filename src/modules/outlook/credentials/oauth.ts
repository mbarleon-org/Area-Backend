export const id = "oauth";
export const pretty_name = "Outlook OAuth2";
export const fields = [
    { id: "client_id", pretty_name: "Client ID", type: "string", required: true },
    { id: "client_secret", pretty_name: "Client Secret", type: "string", required: true },
    { id: "access_token", pretty_name: "Access Token", type: "string", required: true },
    { id: "refresh_token", pretty_name: "Refresh Token", type: "string", required: false }
];
