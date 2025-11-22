import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToMany,
    JoinTable
} from "typeorm";
import { User } from "./user";
import { Team } from "./team"

@Entity()
export class Credential {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column()
    version: string;

    @Column({ nullable: true })
    description?: string;

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
