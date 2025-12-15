export const PERMISSIONS = {
    ADMIN: 0b1 << 0
};

export function computePerms(base: number, ...newPerms: number[]): number {
    for (const perm of newPerms) {
        base |= perm;
    }
    return base;
}

export function removePerms(base: number, ...remPerms: number[]): number {
    for (const perm of remPerms) {
        base &= ~perm;
    }
    return base;
}

export function hasPerms(base: number, ...checkPerms: number[]): boolean {
    for (const perm of checkPerms) {
        if ((base & perm) !== perm) {
            return false;
        }
    }
    return true;
}

export function hasSomePerms(base: number, ...checkPerms: number[]): boolean {
    for (const perm of checkPerms) {
        if ((base & perm) === perm) {
            return true;
        }
    }
    return false;
}
