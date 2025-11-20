import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable
} from "typeorm";
import { User } from "./user";
import { Team } from "./team"

@Entity()
export class Credential {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column("jsonb")
    credential: any;

    @ManyToMany(() => User, user => user.ownedCredentials)
    @JoinTable()
    owners: User[];

    @ManyToMany(() => Team, team => team.ownedCredentials)
    @JoinTable()
    ownerTeams: Team[];

    @ManyToMany(() => User, user => user.credentials)
    @JoinTable()
    users: User[];

    @ManyToMany(() => Team, team => team.credentials)
    @JoinTable()
    userTeams: Team[];
}
