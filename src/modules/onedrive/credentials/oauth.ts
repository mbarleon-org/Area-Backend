/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** oauth.ts
*/

module.exports = {
    id: "oauth",
    pretty_name: "OneDrive OAuth",
    fields: [
        { id: "client_id", pretty_name: "Client ID", type: "string", required: true },
        { id: "client_secret", pretty_name: "Client Secret", type: "string", required: true },
        { id: "access_token", pretty_name: "Access Token", type: "string", required: true }
    ]
}
