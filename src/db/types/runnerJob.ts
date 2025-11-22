import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from "typeorm";

@Entity()
export class RunnerJob {
    @PrimaryColumn()
    jobId: string;

    @Index()
    @Column()
    workflowId: string;

    @Column({ nullable: true })
    workflowVersion?: string;

    @Column({ nullable: true })
    startedByUser?: string;

    @Column({ type: 'jsonb', nullable: true })
    input?: any;

    @Column({ type: 'varchar' })
    status: 'queued' | 'running' | 'succeeded' | 'failed';

    @Column()
    callbackNonce: string;

    @Column()
    callbackUrl: string;

    @Column({ type: 'jsonb', nullable: true })
    result?: any;

    @Column({ nullable: true })
    errorMessage?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
