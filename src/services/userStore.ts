/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** userStore.ts
*/

import { getDataSource } from './dataSource';
import { User } from '../db/types/user';
import { computePerms, PERMISSIONS } from './permissions';
import { permission } from 'process';

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    username: string;
}

export interface UpdateUserInput {
    username?: string;
    email?: string;
    permissions?: number;
    profilePicture?: Buffer | null;
}

/**
 * Create a new user in the database
 */
export async function createUser(input: CreateUserInput): Promise<string> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);

    const userCount = await repo.count();

    const userObj: any = {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
    };

    if (userCount === 0) {
        Object.assign(userObj, { permissions: computePerms(0, PERMISSIONS.ADMIN) });
    }
    const created = repo.create(userObj);
    const saved = await repo.save(created);
    return String(saved.id);
}

/**
 * Update user fields
 */
export async function updateUserById(id: string, fields: UpdateUserInput): Promise<User | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    const user = await repo.findOne({ where: { id: Number(id) } });
    if (!user) {
        return null;
    }
    Object.assign(user, fields);
    return repo.save(user);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    return repo.findOne({ where: { email } });
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    return repo.findOne({ where: { username } });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    return repo.findOne({ where: { id: Number(id) } });
}

/**
 * Get user permissions
 */
export async function getPermissions(userId: string): Promise<number | null> {
    return (await getUserById(userId))?.permissions;
}

/**
 * Add permission to user
 */
export async function addPermission(userId: string, permission: number): Promise<void> {
    const base = (await getPermissions(userId)) || 0;

    const newPerms = computePerms(base, permission);
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    repo.update({ id: Number(userId) }, { permissions: newPerms });
    return;
}

/**
 * Add permission to user
 */
export async function updatePassword(email: string, passwordHash: string): Promise<string | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);

    const user = await repo.findOne({ where: { email } });
    if (!user) {
        return null
    }

    await repo.update({ email }, { passwordHash });
    return user.id;
}

/**
 * Delete a user by ID
 */
export async function deleteUserById(id: string): Promise<boolean> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    const result = await repo.delete({ id: Number(id) });
    return Boolean(result?.affected && result.affected > 0);
}
