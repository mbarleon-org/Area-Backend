import * as express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/user';
import { hasPerms, PERMISSIONS } from '../../../services/permissions';
import { getUserById, getUserByEmail, getUserByUsername, updateUserById } from '../../../services/userStore';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

type UpdateableFields = {
    username?: string;
    email?: string;
    permissions?: number;
    profilePicture?: string | null;
};

async function applyUserUpdate(targetId: string, body: UpdateableFields, canEditPermissions: boolean, res: express.Response) {
    try {
        const { username, email, permissions, profilePicture } = body ?? {};
        const providedFields = [
            typeof username !== 'undefined',
            typeof email !== 'undefined',
            typeof permissions !== 'undefined',
            typeof profilePicture !== 'undefined',
        ].some(Boolean);

        if (!providedFields) {
            return res.status(400).json({ error: 'No fields provided' });
        }

        const user = await getUserById(targetId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canEditPermissions && typeof permissions !== 'undefined') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const updates: any = {};

        if (typeof email !== 'undefined') {
            if (typeof email !== 'string' || email.trim().length === 0) {
                return res.status(400).json({ error: 'Invalid email' });
            }
            if (email !== user.email) {
                const existingByEmail = await getUserByEmail(email);
                if (existingByEmail && String(existingByEmail.id) !== String(user.id)) {
                    return res.status(409).json({ error: 'Email already in use' });
                }
            }
            updates.email = email;
        }

        if (typeof username !== 'undefined') {
            if (typeof username !== 'string' || username.trim().length === 0) {
                return res.status(400).json({ error: 'Invalid username' });
            }
            if (username !== user.username) {
                const existingByUsername = await getUserByUsername(username);
                if (existingByUsername && String(existingByUsername.id) !== String(user.id)) {
                    return res.status(409).json({ error: 'Username already in use' });
                }
            }
            updates.username = username;
        }

        if (typeof permissions !== 'undefined') {
            if (typeof permissions !== 'number' || !Number.isInteger(permissions)) {
                return res.status(400).json({ error: 'Invalid permissions' });
            }
            updates.permissions = permissions;
        }

        if (typeof profilePicture !== 'undefined') {
            if (profilePicture === null) {
                updates.profilePicture = null;
            } else if (typeof profilePicture === 'string') {
                const payload = profilePicture.includes('base64,')
                    ? profilePicture.split('base64,').pop()
                    : profilePicture;
                try {
                    updates.profilePicture = Buffer.from(payload ?? '', 'base64');
                } catch (err) {
                    return res.status(400).json({ error: 'Invalid profile picture payload' });
                }
            } else {
                return res.status(400).json({ error: 'Invalid profile picture payload' });
            }
        }

        const updated = await updateUserById(targetId, updates);
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            id: updated.id,
            email: updated.email,
            username: updated.username,
            isAdmin: hasPerms(updated.permissions, PERMISSIONS.ADMIN),
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.put('/me', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const actor = await getUserById(actorId);
        if (!actor) {
            return res.status(404).json({ error: 'User not found' });
        }

        return applyUserUpdate(actorId, req.body, hasPerms(actor.permissions, PERMISSIONS.ADMIN), res);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:id', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = normalizeParam(req.params?.id);
    if (!id) {
        return res.status(400).json({ error: 'Missing ID' });
    }
    return applyUserUpdate(id, req.body, true, res);
});

export default router;
