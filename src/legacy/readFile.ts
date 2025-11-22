import * as fs from 'fs';

/**
 * Strip JavaScript-style comments from a JSONC string.
 *
 * @param {string} input - The raw JSONC content
 * @returns {string} the input with comments removed
 */
function stripJsonComments(input: string): string {
    return input
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*(?=$|\n|\r)/g, '');
}

/**
 * Parse a JSONC (JSON with comments) string into a JavaScript value.
 *
 * @param {string} raw - Raw JSONC string to parse
 * @returns {any} parsed object (may throw if JSON is invalid)
 */
function parseJsonc(raw: string): any {
    return JSON.parse(stripJsonComments(raw));
}

/**
 * Read a JSONC file and return the parsed object if it contains an `id` field.
 * If the parsed content does not include an `id`, `null` is returned (legacy files without id are skipped).
 *
 * @param {string} fp - File path to read
 * @returns {Promise<any|null>} parsed object or `null` when no `id` is present
 */
export async function readJsoncFile(fp: string): Promise<any | null> {
    const raw = await fs.promises.readFile(fp, 'utf8');
    const parsed = parseJsonc(raw);
    if (!parsed?.id) {
        return null;
    }
    return parsed;
}
