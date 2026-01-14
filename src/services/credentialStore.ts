import { In, Repository } from 'typeorm';
import { decryptObject, encryptObject } from './crypto.js';
import { getUserById } from './userStore.js';
import { getTeamByID } from './teamStore.js';
import { Credential } from '../db/types/credential.js';
import { getDataSource, initDataSource } from './dataSource.js';
import { User } from '../db/types/user.js';
import { hasPerms, PERMISSIONS } from './permissions.js';

export interface StoredCredential {
    id: string;
    type: string;
    data: any;
    name?: string;
    version?: string;
    description?: string | null;
}

const REDACTED_VALUE = '***';

function redactCredentialData(value: any): any {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(() => REDACTED_VALUE);
    }
    if (typeof value === 'object') {
        const maybeEncrypted = value as Record<string, any>;
        if (maybeEncrypted.__encrypted === true && typeof maybeEncrypted.data === 'string') {
            return REDACTED_VALUE;
        }
        const out: Record<string, any> = {};
        for (const key of Object.keys(maybeEncrypted)) {
            out[key] = redactCredentialData(maybeEncrypted[key]);
        }
        return out;
    }
    return REDACTED_VALUE;
}

/**
 * Ensure the data source is initialized and return the credentials repository.
 *
 * @returns {Promise<any>} repository instance for the `Credential` entity
 */
async function getCredentialRepository(): Promise<Repository<Credential>> {
    await initDataSource();
    return getDataSource().getRepository(Credential);
}

/**
 * Map a database entity to the public `StoredCredential` shape.
 *
 * @param {any} entity - Raw credential entity from the DB
 * @returns {StoredCredential} normalized credential object
 */
function mapEntityToStoredCredential(entity: any, includeSecret: boolean = false): StoredCredential {
    const decrypted = decryptObject(entity.credential);
    return {
        id: entity.id,
        type: entity.type,
        data: includeSecret ? decrypted : redactCredentialData(decrypted),
        name: entity.name,
        version: entity.version,
        description: entity.description ?? null
    };
}

/**
 * Retrieve a stored credential by id.
 *
 * @param {string} id - Credential id to lookup
 * @returns {Promise<StoredCredential|null>} the stored credential, or `null` when not found
 */
export async function getCredentialById(id: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const cred = await repo.findOne({ where: { id } });
    if (!cred) return null;
    return mapEntityToStoredCredential(cred);
}

/**
 * Load a credential by id. Alias for `getCredentialById` to mirror the workflow API.
 *
 * @param {string} id - Credential identifier
 * @returns {Promise<StoredCredential|null>} stored credential or null when missing
 */
export async function loadCredential(id: string): Promise<StoredCredential | null> {
    return getCredentialById(id);
}

/**
 * Retrieve multiple stored credentials by their ids.
 *
 * @param {string[]} ids - Array of credential ids to fetch
 * @returns {Promise<Record<string, StoredCredential>>} Map of id -> StoredCredential
 */
export async function getCredentialsByIds(ids: string[], options: { includeSecret?: boolean } = {}): Promise<Record<string, StoredCredential>> {
    if (!ids || ids.length === 0) {
        return {};
    }
    const repo = await getCredentialRepository();
    const creds = await repo.find({ where: { id: In(ids) } });
    const out: Record<string, StoredCredential> = {};
    for (const c of creds) {
        out[c.id] = mapEntityToStoredCredential(c, options.includeSecret === true);
    }
    return out;
}

interface CredentialDefinition extends Partial<StoredCredential> {
    credential?: any;
}

/**
 * Create or update a credential definition in the database.
 *
 * @param {CredentialDefinition} def - credential payload (must contain id, type and data/credential)
 * @returns {Promise<StoredCredential>} stored credential view
 */
export async function saveCredential(def: CredentialDefinition, userId?: string): Promise<StoredCredential> {
    if (!def || def.id === undefined || def.id === null) {
        throw new Error('credential id is required');
    }
    if (!def.type) {
        throw new Error('credential type is required');
    }
    const rawData = def.data ?? def.credential;
    if (rawData === undefined) {
        throw new Error('credential data is required');
    }

    const repo = await getCredentialRepository();
    let owner: User | undefined;
    if (userId) {
        owner = await getUserById(String(userId));
        if (!owner) {
            throw new Error('valid user id is required for credential creation');
        }
    }
    const obj: Partial<Credential> = {
        id: String(def.id),
        name: def.name || (def as any).pretty_name || String(def.id),
        type: def.type,
        version: def.version || '1.0.0',
        description: def.description || null,
        credential: encryptObject(rawData)
    };
    if (owner) {
        obj.owners = [owner];
    }
    const entity = repo.create(obj);
    const saved = await repo.save(entity);
    return mapEntityToStoredCredential(saved);
}

export async function getCredentialsByTeamId(id: string) {
    const team = await getTeamByID(id);
    if (!team) {
        return [];
    }

    const creds = team.credentials;
    const ownCreds = team.ownedCredentials;

    return [...new Set([...(creds || []), ...(ownCreds || [])])];
}

export async function getCredentialsByTeamIds(ids: string[]) {
    if (!ids || ids.length === 0) {
        return [];
    }

    let creds: Credential[] = [];
    for (const id of ids) {
        const teamCreds = await getCredentialsByTeamId(id);
        creds = [...new Set([...(creds || []), ...(teamCreds || [])])];
    }
    return creds;
}

export async function getCredentialsByUserId(id: string) {
    const repo = await getCredentialRepository();
    await initDataSource();
    const user = await getUserById(id);
    if (!user) {
        return [];
    }

    const relations = ['owners', 'users', 'ownerTeams', 'userTeams']

    let creds: Credential[] = []

    for (const c of Array.isArray(user.credentials) ? user.credentials : []) {
        const entity = await repo.findOne({ where: { id: c.id }, relations });
        if (entity) {
            creds.push(entity);
        }
    }

    let ownCreds: Credential[] = [];

    for (const c of Array.isArray(user.ownedCredentials) ? user.ownedCredentials : []) {
        const entity = await repo.findOne({ where: { id: c.id }, relations });
        if (entity) {
            ownCreds.push(entity);
        }
    }

    let teamCreds: Credential[] = [];

    const tIds = user.teams?.map(team => String(team.id));
    if (tIds) {
        let tCreds = await getCredentialsByTeamIds(tIds);
        for (const tc of Array.isArray(tCreds) ? tCreds : []) {
            const entity = await repo.findOne({ where: { id: tc.id }, relations });
            if (entity) {
                teamCreds.push(entity);
            }
        }
    }

    const otIds = user.ownedTeams?.map(team => String(team.id));
    if (otIds) {
        let otCreds = await getCredentialsByTeamIds(otIds);
        for (const otc of Array.isArray(otCreds) ? otCreds : []) {
            const entity = await repo.findOne({ where: { id: otc.id }, relations });
            if (entity) {
                teamCreds.push(entity);
            }
        }
    }

    return [...new Set([...(creds || []), ...(ownCreds || []), ...(teamCreds || [])])]
}

export async function isCredentialOwner(cId: string, uId: string): Promise<boolean> {
    const repo = await getCredentialRepository();
    const entity = await repo.findOne({
        where: { id: cId },
        relations: ['owners', 'ownerTeams']
    });

    if (!entity) {
        return false;
    }

    const user = await getUserById(uId);
    if (!entity.owners && !entity.ownerTeams) {
        return !!(user && hasPerms(user!.permissions, PERMISSIONS.ADMIN));
    }

    const ownerMatch = (entity.owners || []).some(u => String(u.id) === String(uId));
    const teamMatch = [...(user?.teams || []), ...(user?.ownedTeams || [])]
        .some(t => (entity.ownerTeams || []).some(c => c.id === t.id));
    return ownerMatch || teamMatch;
}

export async function isCredentialUser(cId: string, uId: string): Promise<boolean> {
    const repo = await getCredentialRepository();
    const entity = await repo.findOne({
        where: { id: cId },
        relations: ['owners', 'users', 'ownerTeams', 'userTeams']
    });

    if (!entity) {
        return false;
    }

    const user = await getUserById(uId);

    if (!entity.owners && !entity.users && !entity.userTeams && !entity.ownerTeams) {
        return true;
    }

    const directMatch = [...(entity.users || []), ...(entity.owners || [])]
        .some(u => String(u.id) === String(uId));
    const teamMatch = [...(user?.teams || []), ...(user?.ownedTeams || [])]
        .some(t => [...(entity.userTeams || []), ...(entity.ownerTeams || [])].some(c => c.id === t.id));
    return directMatch || teamMatch;
}

export async function getPublicCredentials(): Promise<StoredCredential[]> {
    const repo = await getCredentialRepository();
    const entities = await repo.find({ relations: ['owners', 'users', 'userTeams', 'ownerTeams'] });

    return entities
        .filter((e) => {
            const hasOwners = Array.isArray(e.owners) && e.owners.length > 0;
            const hasUsers = Array.isArray(e.users) && e.users.length > 0;
            const hasUserTeams = Array.isArray(e.userTeams) && e.userTeams.length > 0;
            const hasOwnerTeams = Array.isArray(e.ownerTeams) && e.ownerTeams.length > 0;
            return !(hasOwners || hasUsers || hasUserTeams || hasOwnerTeams);
        })
        .map(entity => mapEntityToStoredCredential(entity));
}

export async function listCredentials(): Promise<StoredCredential[]> {
    const repo = await getCredentialRepository();
    const entities = await repo.find();

    return entities.map(entity => mapEntityToStoredCredential(entity));
}

export async function deleteCredential(id: string): Promise<boolean> {
    const repo = await getCredentialRepository();
    const result = await repo.delete({ id });
    return Boolean(result?.affected && result.affected > 0);
}

function uniqueById<T extends { id: any }>(items: T[] = []): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
        const key = String(item.id);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(item);
        }
    }
    return out;
}

async function getCredentialEntity(id: string) {
    const repo = await getCredentialRepository();
    return repo.findOne({
        where: { id },
        relations: ['owners', 'users', 'ownerTeams', 'userTeams']
    });
}

export async function addUserToCredential(cId: string, uId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    const user = await getUserById(uId);
    if (!credential || !user) {
        return null;
    }
    credential.users = uniqueById([...(credential.users || []), user]);
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function addOwnerToCredential(cId: string, uId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    const user = await getUserById(uId);
    if (!credential || !user) {
        return null;
    }
    credential.users = (credential.users || []).filter(u => String(u.id) !== String(user.id));
    credential.owners = uniqueById([...(credential.owners || []), user]);
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function removeUserFromCredential(cId: string, uId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    if (!credential) {
        return null;
    }
    credential.users = (credential.users || []).filter(u => String(u.id) !== String(uId));
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function removeOwnerFromCredential(cId: string, uId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    if (!credential) {
        return null;
    }
    credential.owners = (credential.owners || []).filter(u => String(u.id) !== String(uId));
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function addUserTeamToCredential(cId: string, tId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    const team = await getTeamByID(tId);
    if (!credential || !team) {
        return null;
    }
    credential.userTeams = uniqueById([...(credential.userTeams || []), team]);
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function addOwnerTeamToCredential(cId: string, tId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    const team = await getTeamByID(tId);
    if (!credential || !team) {
        return null;
    }
    credential.userTeams = (credential.userTeams || []).filter(t => String(t.id) !== String(team.id));
    credential.ownerTeams = uniqueById([...(credential.ownerTeams || []), team]);
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function removeUserTeamFromCredential(cId: string, tId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    if (!credential) {
        return null;
    }
    credential.userTeams = (credential.userTeams || []).filter(t => String(t.id) !== String(tId));
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}

export async function removeOwnerTeamFromCredential(cId: string, tId: string): Promise<StoredCredential | null> {
    const repo = await getCredentialRepository();
    const credential = await getCredentialEntity(cId);
    if (!credential) {
        return null;
    }
    credential.ownerTeams = (credential.ownerTeams || []).filter(t => String(t.id) !== String(tId));
    const saved = await repo.save(credential);
    return mapEntityToStoredCredential(saved);
}
