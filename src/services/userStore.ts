/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** userStore.ts
*/

import { getDataSource } from './dataSource';
// import type { User } from '../db/types/user'; // optional typed import

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
    const repo: any = ds.getRepository ? ds.getRepository('user') : ds.getRepository;
    // store password under a common field name ("password") to match likely schema
    const userObj: any = {
        email: input.email,
        // many schemas call the stored field "password"; adapt if your schema differs
        password: input.passwordHash,
        displayName: input.displayName ?? input.email.split('@')[0],
    };
    const created = repo.create ? repo.create(userObj) : userObj;
    const saved = await repo.save(created);
    return String(saved.id ?? saved._id ?? saved.userId ?? '');
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository ? ds.getRepository('user') : ds.getRepository;
    return repo.findOne ? repo.findOne({ where: { email } }) : repo.findOne({ email });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<any | null> {
    const ds: any = getDataSource();
    const repo: any = ds.getRepository ? ds.getRepository('user') : ds.getRepository;
    return repo.findOne ? repo.findOne({ where: { id } }) : repo.findOne(id);
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