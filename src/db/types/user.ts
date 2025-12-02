import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToMany
} from "typeorm";
import { Team } from "./team";
import { Workflow } from "./workflow";
import { Credential } from "./credential";
import { OidcAccount } from "./oidcAccount";
import { WorkflowResult } from "./workflowResult";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @Column({ nullable: true })
    passwordHash?: string;

    @Column({ default: 0 })
    permissions: number;

    @Column({ type: "bytea", nullable: true })
    profilePicture?: Buffer;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => OidcAccount, (acc) => acc.user)
    oidcAccounts: OidcAccount[];

    @ManyToMany(() => Workflow, workflow => workflow.owners)
    ownedWorkflows: Workflow[];

    @ManyToMany(() => Workflow, workflow => workflow.users)
    workflows: Workflow[];

    @ManyToMany(() => Team, team => team.owners)
    ownedTeams: Team[];

    @ManyToMany(() => Team, team => team.users)
    teams: Team[];

    @ManyToMany(() => Credential, credential => credential.owners)
    ownedCredentials: Credential[];

    @ManyToMany(() => Credential, credential => credential.users)
    credentials: Credential[];

    @OneToMany(() => WorkflowResult, (wr) => wr.startedBy)
    startedWorkflows: WorkflowResult[];
}
