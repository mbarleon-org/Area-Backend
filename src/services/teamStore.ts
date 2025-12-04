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

export async function getTeamByName(name: string): Promise<Team> {
    await initDataSource();
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);

    return repo.findOne({ where: { name: name }, relations: TEAM_RELATIONS });
}
