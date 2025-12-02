import authRouter from './routes/auth/auth';
import runnerRouter from './routes/runner/runner';
import moduleRouter from './routes/modules/modules';
import healthzRouter from './routes/healthz/healthz';
import usersGetRouter from './routes/users/usersRouter';
import workflowRouter from './routes/workflows/workflows';


const routes: any[] = [
    healthzRouter,
    workflowRouter,
    runnerRouter,
    moduleRouter,
    authRouter,
    usersGetRouter
];

export default routes;
