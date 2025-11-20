import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from "typeorm";
import { User } from "./user";
import { Workflow } from "./workflow";

@Entity()
export class WorkflowResult {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Workflow, (workflow) => workflow.results, { onDelete: "CASCADE" })
    @JoinColumn()
    workflow: Workflow;

    @Column({ type: "jsonb", nullable: true })
    results?: any;

    @ManyToOne(() => User, (user) => user.startedWorkflows, { onDelete: "SET NULL" })
    @JoinColumn()
    startedBy?: User;

    @CreateDateColumn()
    createdAt: Date;
}
