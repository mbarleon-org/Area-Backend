import * as fs from 'fs';

function stripJsonComments(input: string) {
    return input
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*(?=$|\n|\r)/g, '');
}

export async function readJsoncFile(fp: string): Promise<any | null> {
    const raw = await fs.promises.readFile(fp, 'utf8');
    const parsed = JSON.parse(stripJsonComments(raw));
    if (!parsed?.id) {
        return null;
    }
    return parsed;
}
