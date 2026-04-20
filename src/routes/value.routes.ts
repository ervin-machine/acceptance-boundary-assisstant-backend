import { Router } from 'express';
import * as valueController from '../controllers/value.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { handleValidationErrors, asyncHandler } from '../middleware/error.middleware';
import { createValueValidation } from '../utils/validators';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  createValueValidation,
  handleValidationErrors,
  asyncHandler(valueController.createValue)
);

router.get(
  '/',
  asyncHandler(valueController.getValues)
);

router.get(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(valueController.getValueById)
);

router.put(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(valueController.updateValue)
);

router.delete(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(valueController.deleteValue)
);

export default router;
