import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from "typeorm";
import { User } from "./user";

@Entity()
export class OidcAccount {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.oidcAccounts, { onDelete: "CASCADE" })
    @JoinColumn()
    user: User;

    @Column()
    provider: string;

    @Column({ unique: true })
    providerUserId: string;

    @Column({ nullable: true })
    accessToken?: string;

    @Column({ nullable: true })
    refreshToken?: string;

    @CreateDateColumn()
    createdAt: Date;
}
