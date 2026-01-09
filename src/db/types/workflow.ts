import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany
} from "typeorm";
import { User } from "./user";
import { Team } from "./team";
import { WorkflowResult } from "./workflowResult";

@Entity()
export class Workflow {
  @PrimaryColumn({ unique: true })
  id: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb"
  })
  triggers: any;

  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb"
  })
  actions: any;

  @ManyToMany(() => User, user => user.ownedWorkflows)
  @JoinTable()
  owners: User[];

  @ManyToMany(() => Team, team => team.ownedWorkflows)
  @JoinTable()
  ownerTeams: Team[];

  @ManyToMany(() => User, user => user.workflows)
  @JoinTable()
  users: User[];

  @ManyToMany(() => Team, team => team.workflows)
  @JoinTable()
  userTeams: Team[];

  @OneToMany(() => WorkflowResult, (wres) => wres.workflow)
  results: WorkflowResult[];

  @Column({
    type: "jsonb",
    default: () => "'{}'::jsonb"
  })
  data: JSON;
}
