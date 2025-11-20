import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn
} from "typeorm";
import { User } from "./user"

@Entity()
export class UserDetails {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.details, {
        onDelete: "CASCADE"
    })
    @JoinColumn()
    user: User;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    passwordHash?: string;
}
