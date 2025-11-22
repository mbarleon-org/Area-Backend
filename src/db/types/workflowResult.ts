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

    @Column({ nullable: true })
    jobId?: string;

    @ManyToOne(() => Workflow, (workflow) => workflow.results, { onDelete: "CASCADE" })
    @JoinColumn()
    workflow: Workflow;

    @Column()
    workflowVersion: string;

    @Column({ default: 'queued' })
    status: string;

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

    @Column({ type: "jsonb", nullable: true })
    results?: any;

    @Column({ nullable: true })
    errorMessage?: string;

    @ManyToOne(() => User, (user) => user.startedWorkflows, { onDelete: "SET NULL" })
    @JoinColumn()
    startedBy?: User;

    @CreateDateColumn()
    createdAt: Date;
}
