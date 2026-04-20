import { Router } from 'express';
import * as boundaryController from '../controllers/boundary.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { handleValidationErrors, asyncHandler } from '../middleware/error.middleware';
import { createBoundaryValidation } from '../utils/validators';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  createBoundaryValidation,
  handleValidationErrors,
  asyncHandler(boundaryController.createBoundary)
);

router.get(
  '/',
  asyncHandler(boundaryController.getBoundaries)
);

router.get(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(boundaryController.getBoundaryById)
);

router.put(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(boundaryController.updateBoundary)
);

router.delete(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(boundaryController.deleteBoundary)
);

export default router;
