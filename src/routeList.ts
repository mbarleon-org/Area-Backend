import runnerRouter from './routes/runner/runner';
import moduleRouter from './routes/modules/modules';
import healthzRouter from './routes/healthz/healthz';
import workflowRouter from './routes/workflows/workflows';
import authRoutes from './routes/auth/auth';


const routes: any[] = [
    healthzRouter,
    workflowRouter,
    runnerRouter,
    moduleRouter,
    authRoutes
];

export default routes;
