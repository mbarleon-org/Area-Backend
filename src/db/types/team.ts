import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToMany,
    JoinTable
} from "typeorm";
import { User } from "./user";
import { Workflow } from "./workflow";
import { Credential } from "./credential";

@Entity()
export class Team {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @ManyToMany(() => User, user => user.ownedTeams)
    @JoinTable()
    owners: User[];

    @ManyToMany(() => User, user => user.teams)
    @JoinTable()
    users: User[];

    @ManyToMany(() => Workflow, workflow => workflow.ownerTeams)
    ownedWorkflows: Workflow[];

    @ManyToMany(() => Workflow, workflow => workflow.userTeams)
    workflows: Workflow[];

    @ManyToMany(() => Credential, credential => credential.ownerTeams)
    ownedCredentials: Credential[];

    @ManyToMany(() => Credential, credential => credential.userTeams)
    credentials: Credential[];
}
