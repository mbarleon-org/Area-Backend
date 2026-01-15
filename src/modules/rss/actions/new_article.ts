/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** new_article.ts
*/

module.exports = {
    spec: {
        id: 'new_article',
        pretty_name: 'New RSS Article',
        description: 'Triggers when new article is available in RSS feed',
        inputs: [
            { id: 'feed_url', pretty_name: 'RSS Feed URL', type: 'string', required: true }
        ],
        outputs: [
            { id: 'title', pretty_name: 'Article Title', type: 'string' },
            { id: 'link', pretty_name: 'Article Link', type: 'string' },
            { id: 'description', pretty_name: 'Article Description', type: 'string' }
        ]
    },
    handler: async (ctx, inputs) => {
        // Use rss-parser library
        const Parser = require('rss-parser');
        const parser = new Parser();
        const feed = await parser.parseURL(inputs.feed_url);
        return {
            title: feed.items[0]?.title,
            link: feed.items[0]?.link,
            description: feed.items[0]?.contentSnippet
        };
    }
};
