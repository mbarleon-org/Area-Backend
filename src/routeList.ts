import runnerRouter from './routes/runner/runner';
import moduleRouter from './routes/modules/modules';
import healthzRouter from './routes/healthz/healthz';
import workflowRouter from './routes/workflows/workflows';

const routes: any[] = [
    healthzRouter,
    workflowRouter,
    runnerRouter,
    moduleRouter
];

export default routes;
