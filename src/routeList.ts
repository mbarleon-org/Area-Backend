import authRouter from './routes/auth/auth';
import docsRouter from './routes/docs/docs';
import teamRouter from './routes/teams/teams';
import runnerRouter from './routes/runner/runner';
import moduleRouter from './routes/modules/modules';
import healthzRouter from './routes/healthz/healthz';
import usersGetRouter from './routes/users/usersRouter';
import workflowRouter from './routes/workflows/workflows';
import credentialRouter from './routes/credentials/credentials';


const routes: any[] = [
    healthzRouter,
    workflowRouter,
    runnerRouter,
    moduleRouter,
    authRouter,
    usersGetRouter,
    docsRouter,
    credentialRouter,
    teamRouter
];

export default routes;
