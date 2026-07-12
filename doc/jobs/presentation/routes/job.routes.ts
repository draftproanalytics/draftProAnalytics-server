import { Router } from 'express';
import { JobController } from '../controllers/JobController';

export const buildJobRouter = (controller: JobController): Router => {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.get('/:id/logs', controller.logs);
  router.get('/:id/steps', controller.steps);
  router.post('/:id/run', controller.run);
  router.post('/:id/cancel', controller.cancel);

  return router;
};
