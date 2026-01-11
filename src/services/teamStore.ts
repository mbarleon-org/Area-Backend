import { Team } from "../db/types/team";
import { User } from "../db/types/user";
import { getUserById } from "./userStore";
import { getDataSource, initDataSource } from "./dataSource";

export interface StoredTeam {
    name: string;
}

export async function persistTeamDefinition(def: StoredTeam, owner?: User): Promise<Team> {
    await initDataSource();
    const repo = getDataSource().getRepository(Team);
    const payload: Partial<Team> = {
        name: def.name
    };
    if (owner) {
        payload.owners = [owner];
    }
    const entity = repo.create(payload);
    return repo.save(entity);
}

export async function saveTeam(def: StoredTeam, uId?: string): Promise<Team> {
    if (!def?.name) {
        throw new Error('team name is required');
    }
    await initDataSource();
    let owner: User | undefined;
    if (uId) {
        const userRepo = getDataSource().getRepository(User);
        owner = await userRepo.findOne({ where: { id: Number(uId) } });
        if (!owner) {
            throw new Error('valid user id is required for team creation');
        }
    }
    return persistTeamDefinition(def, owner);
}

export async function listTeams(): Promise<Team[]> {
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);

    return repo.find();
}

const TEAM_RELATIONS = [
    'owners',
    'users',
    'ownedWorkflows',
    'workflows',
    'ownedCredentials',
    'credentials'
];

export async function getTeamByID(id: string): Promise<Team> {
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);

    return repo.findOne({ where: { id: Number(id) }, relations: TEAM_RELATIONS });
}

export async function getTeamsByUserID(id: string): Promise<Team[]> {
    await initDataSource();
    const user = await getUserById(id);
    if (!user) {
        return [];
    }

    const teams = user.teams;
    const ownedTeams = user.ownedTeams;

    return [...new Set([...(teams || []), ...(ownedTeams || [])])]
}

export async function isTeamMember(uId: string, tId: string): Promise<boolean> {
    const team = await getTeamByID(tId);

    if (!team) {
        return false;
    }
    const numuId = Number(uId);
    return ([...(team.owners || []), ...(team.users || [])].some(u => u.id === numuId));
}

export async function isTeamOwner(uId: string, tId: string): Promise<boolean> {
    const team = await getTeamByID(tId);

    if (!team) {
        return false;
    }
    const numuId = Number(uId);
    return (team.owners || []).some(u => u.id === numuId);
}

export async function getTeamByName(name: string): Promise<Team> {
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);

    return repo.findOne({ where: { name: name }, relations: TEAM_RELATIONS });
}

export async function updateTeamById(id: string, def: StoredTeam): Promise<Team | null> {
    if (!def?.name) {
        throw new Error('team name is required');
    }
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);
    const team = await repo.findOne({ where: { id: Number(id) } });
    if (!team) {
        return null;
    }
    team.name = def.name;
    return repo.save(team);
}

export async function deleteTeamById(id: string): Promise<boolean> {
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);
    const result = await repo.delete({ id: Number(id) });
    return Boolean(result?.affected && result.affected > 0);
}

function ensureUnique<T extends { id: number }>(items: T[] = []): T[] {
    const seen = new Set<number>();
    const out: T[] = [];
    for (const item of items) {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            out.push(item);
        }
    }
    return out;
}

export async function addUserToTeam(teamId: string, userId: string): Promise<Team | null> {
    await initDataSource();
    const team = await getTeamByID(teamId);
    const user = await getUserById(userId);
    if (!team || !user) {
        return null;
    }
    team.users = ensureUnique([...(team.users || []), user]);
    const repo = getDataSource().getRepository(Team);
    return repo.save(team);
}

export async function addOwnerToTeam(teamId: string, userId: string): Promise<Team | null> {
    await initDataSource();
    const team = await getTeamByID(teamId);
    const user = await getUserById(userId);
    if (!team || !user) {
        return null;
    }
    // promote: ensure user no longer sits in regular members
    team.users = (team.users || []).filter(u => u.id !== user.id);
    team.owners = ensureUnique([...(team.owners || []), user]);
    const repo = getDataSource().getRepository(Team);
    return repo.save(team);
}

export async function removeUserFromTeam(teamId: string, userId: string): Promise<Team | null> {
    await initDataSource();
    const team = await getTeamByID(teamId);
    if (!team) {
        return null;
    }
    const repo = getDataSource().getRepository(Team);
    team.users = (team.users || []).filter(u => String(u.id) !== String(userId));
    return repo.save(team);
}

export async function removeOwnerFromTeam(teamId: string, userId: string): Promise<Team | null> {
    await initDataSource();
    const team = await getTeamByID(teamId);
    if (!team) {
        return null;
    }
    const repo = getDataSource().getRepository(Team);
    team.owners = (team.owners || []).filter(u => String(u.id) !== String(userId));
    return repo.save(team);
}
