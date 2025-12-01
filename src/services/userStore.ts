/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** userStore.ts
*/

import { getDataSource } from './dataSource';
import { User } from '../db/types/user';

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    displayName?: string;
}

/**
 * Create a new user in the database
 */
export async function createUser(input: CreateUserInput): Promise<string> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);

    const [firstName, lastName] = (input.displayName || input.email).split(' ');
    const userObj: any = {
        username: input.email.split('@')[0],
        email: input.email,
        password: input.passwordHash,
        firstName: firstName || 'User',
        lastName: lastName || '',
    };
    const created = repo.create(userObj);
    const saved = await repo.save(created);
    return String(saved.id);
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
 * Get user by ID
 */
export async function getUserById(id: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository(User);
    return repo.findOne({ where: { id: Number(id) } });
}

/**
 * Get user permissions (placeholder — extend based on your DB schema)
 */
export async function getPermissions(userId: string): Promise<string[]> {
    // TODO: Query user_permissions or roles table
    // For now return empty array
    return [];
}

/**
 * Add permission to user (placeholder)
 */
export async function addPermission(userId: string, permission: string): Promise<void> {
    // TODO: Insert into user_permissions table
    return;
}
