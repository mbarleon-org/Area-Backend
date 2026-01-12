import * as express from 'express';

import getUsersRouter from './get/getUsers';

import getUserRouter from './get/getUser';
import getUserImageRouter from './get/getUserImage'
import getUserTeamsRouter from './get/getUserTeams'
import getUserWorkflowsRouter from './get/getUserWorkflows'
import getUserCredentialsRouter from './get/getUserCredentials'

import putUserRouter from './put/putUser';
import putUserImageRouter from './put/putUserImage';
import postUserRouter from './post/postUser';
import deleteUserRouter from './delete/deleteUser';
import deleteUserImageRouter from './delete/deleteUserImage';

const ROUTERS = [
    getUsersRouter,

    getUserRouter,
    getUserImageRouter,
    getUserTeamsRouter,
    getUserWorkflowsRouter,
    getUserCredentialsRouter,

    putUserRouter,
    putUserImageRouter,
    postUserRouter,
    deleteUserRouter,
    deleteUserImageRouter,
];

const router = express.Router();

ROUTERS.forEach(route => {
    router.use("/users", route);
})

export default router;
