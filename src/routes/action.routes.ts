import { Router } from 'express';
import * as actionController from '../controllers/action.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { handleValidationErrors, asyncHandler } from '../middleware/error.middleware';
import { createActionValidation } from '../utils/validators';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  createActionValidation,
  handleValidationErrors,
  asyncHandler(actionController.createAction)
);

router.get(
  '/',
  asyncHandler(actionController.getActions)
);

router.get(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(actionController.getActionById)
);

router.put(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(actionController.updateAction)
);

router.delete(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(actionController.deleteAction)
);

export default router;
