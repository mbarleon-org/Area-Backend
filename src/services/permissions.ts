export const PERMISSIONS = {
    ADMIN: 0b1 << 0
};

export function computePerms(base: number, newPerm: number): number {
    return base |= newPerm;
}

export function isAdmin(base: number): boolean {
    return (base & PERMISSIONS.ADMIN) !== 0;
}
