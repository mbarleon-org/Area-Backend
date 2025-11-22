import { In } from 'typeorm';
import { Credential } from '../db/types/credential.js';
import { getDataSource, initDataSource } from './dataSource.js';

export interface StoredCredential {
    id: string;
    type: string;
    data: any;
    name?: string;
}

export async function getCredentialById(id: string): Promise<StoredCredential | null> {
    await initDataSource();
    const repo = getDataSource().getRepository(Credential);
    const cred = await repo.findOne({ where: { id } });
    if (!cred) return null;
    return {
        id: cred.id,
        type: cred.type,
        data: cred.credential,
        name: cred.name
    };
}

export async function getCredentialsByIds(ids: string[]): Promise<Record<string, StoredCredential>> {
    if (!ids || ids.length === 0) {
        return {};
    }
    await initDataSource();
    const repo = getDataSource().getRepository(Credential);
    const creds = await repo.find({ where: { id: In(ids) } });
    const out: Record<string, StoredCredential> = {};
    for (const c of creds) {
        out[c.id] = {
            id: c.id,
            type: c.type,
            data: c.credential,
            name: c.name
        };
    }
    return out;
}
