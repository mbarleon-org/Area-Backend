import * as express from 'express';

import getUserRouter from './get/getUser';
import getUserImageRouter from './get/getUserImage'
import getUserTeamsRouter from './get/getUserTeams'
import getUserWorkflowsRouter from './get/getUserWorkflows'
import getUserCredentialsRouter from './get/getUserCredentials'

const ROUTERS = [
    getUserRouter,
    getUserImageRouter,
    getUserTeamsRouter,
    getUserWorkflowsRouter,
    getUserCredentialsRouter,
];

const router = express.Router();

ROUTERS.forEach(route => {
    router.use("/users", route);
})

export default router;
