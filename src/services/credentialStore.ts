import { In, Repository } from 'typeorm';
import { decryptObject } from './crypto.js';
import { getUserById } from './userStore.js';
import { getTeamByID } from './teamStore.js';
import { Credential } from '../db/types/credential.js';
import { getDataSource, initDataSource } from './dataSource.js';
import { User } from '../db/types/user.js';
import { isAdmin } from './permissions.js';

export interface StoredCredential {
    id: string;
    type: string;
    data: any;
    name?: string;
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
function mapEntityToStoredCredential(entity: any): StoredCredential {
    return {
        id: entity.id,
        type: entity.type,
        data: decryptObject(entity.credential),
        name: entity.name
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
 * Retrieve multiple stored credentials by their ids.
 *
 * @param {string[]} ids - Array of credential ids to fetch
 * @returns {Promise<Record<string, StoredCredential>>} Map of id -> StoredCredential
 */
export async function getCredentialsByIds(ids: string[]): Promise<Record<string, StoredCredential>> {
    if (!ids || ids.length === 0) {
        return {};
    }
    const repo = await getCredentialRepository();
    const creds = await repo.find({ where: { id: In(ids) } });
    const out: Record<string, StoredCredential> = {};
    for (const c of creds) {
        out[c.id] = mapEntityToStoredCredential(c);
    }
    return out;
}

export async function getCredentialsByTeamId(id: string) {
    const team = await getTeamByID(id);
    if (!team) {
        return [];
    }

    const creds = team.credentials;
    const ownCreds = team.ownedCredentials;

    return [...new Set([...creds, ...ownCreds])];
}

export async function getCredentialsByTeamIds(ids: string[]) {
    if (!ids || ids.length === 0) {
        return [];
    }

    let creds = []

    for (const id in ids) {
        creds = [...new Set([...creds, ...(await getCredentialsByTeamId(id))])];
    }
    return creds;
}

export async function getCredentialsByUserId(id: string) {
    const user = await getUserById(id);
    if (!user) {
        return [];
    }

    const creds = user.credentials;
    const ownCreds = user.ownedCredentials;

    let teamCreds = [];

    const tIds = user.teams?.map(team => String(team.id));
    if (tIds) {
        teamCreds.concat(await getCredentialsByTeamIds(tIds));
    }

    const otIds = user.ownedTeams?.map(team => String(team.id));
    if (otIds) {
        teamCreds.concat(await getCredentialsByTeamIds(otIds));
    }

    return [...new Set([...creds, ...ownCreds, ...teamCreds])]
}

export async function isCredentialOwner(cId: string, uId: string): Promise<boolean> {
    const repo = await getCredentialRepository();
    const entity = await repo.findOne({ where: { id: cId } });

    if (!entity) {
        return false;
    }

    const num_uId = Number(uId);

    const userRepo = getDataSource().getRepository(User);
    const user = await userRepo.findOne({ where: { id: num_uId } });

    if (!entity.owners && !entity.ownerTeams) {
        return user && isAdmin(user!.permissions);
    }

    return entity.owners.some(u => u.id === num_uId) ||
        [...user.teams, ...user.ownedTeams].some(t => entity.ownerTeams.some(c => c.id === t.id));
}

export async function isCredentialUser(cId: string, uId: string): Promise<boolean> {
    const repo = await getCredentialRepository();
    const entity = await repo.findOne({ where: { id: cId } });

    if (!entity) {
        return false;
    }

    const num_uId = Number(uId);

    const userRepo = getDataSource().getRepository(User);
    const user = await userRepo.findOne({ where: { id: num_uId } });

    if (!entity.owners && !entity.users && !entity.userTeams && !entity.ownerTeams) {
        return true;
    }

    return [...entity.users, ...entity.owners].some(u => u.id === num_uId) ||
        [...user.teams, ...user.ownedTeams].some(t => [...entity.userTeams, ...entity.ownerTeams].some(c => c.id === t.id));
}

export async function getPublicCredentials(): Promise<Credential[]> {
    const repo = await getCredentialRepository();
    const entities = await repo
        .createQueryBuilder("x")
        .where("(x.owners IS NULL OR x.owners = '{}')")
        .andWhere("(x.users IS NULL OR x.users = '{}')")
        .andWhere("(x.userTeams IS NULL OR x.userTeams = '{}')")
        .andWhere("(x.ownerTeams IS NULL OR x.ownerTeams = '{}')")
        .getMany();

    return entities;
}
