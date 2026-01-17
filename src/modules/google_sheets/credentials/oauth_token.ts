module.exports = {
    pretty_name: "Google Sheets OAuth Token",
    id: "oauth_token",
    fields: [
        { pretty_name: "Access Token", id: "access_token", type: "string", required: true },
        { pretty_name: "Refresh Token", id: "refresh_token", type: "string", required: false }
    ]
};
