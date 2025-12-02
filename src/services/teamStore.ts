import { Team } from "../db/types/team";
import { getUserById } from "./userStore";
import { getDataSource } from "./dataSource";

export async function getTeamByID(id: string) {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(Team);

    return repo.findOne({ where: { id: Number(id) } });
}

export async function getTeamsByUserID(id: string) {
    const user = await getUserById(id);
    if (!user) {
        return [];
    }

    const teams = user.teams;
    const ownedTeams = user.ownedTeams;

    return [...new Set([...teams, ...ownedTeams])]
}
