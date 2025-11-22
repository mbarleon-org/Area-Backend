import runnerRouter from './routes/runner/runner';
import healthzRouter from './routes/healthz/healthz';
import workflowRouter from './routes/workflows/workflows';

const routes: any[] = [
    healthzRouter,
    workflowRouter,
    runnerRouter
];

export default routes;
