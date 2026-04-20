import { body, ValidationChain } from 'express-validator';

// Email validation
export const emailValidation: ValidationChain = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail()
  .trim();

// Password validation
export const passwordValidation: ValidationChain = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Name validation
export const nameValidation: ValidationChain = body('name')
  .optional()
  .isLength({ min: 1, max: 100 })
  .withMessage('Name must be between 1 and 100 characters')
  .trim();

// Login validation
export const loginValidation = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Register validation
export const registerValidation = [
  emailValidation,
  passwordValidation,
  nameValidation,
];

// Emotion validation
export const createEmotionValidation = [
  body('emotions')
    .isArray({ min: 1 })
    .withMessage('At least one emotion must be selected'),
  body('intensity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Intensity must be between 1 and 10'),
  body('bodySensations')
    .optional()
    .isString()
    .trim(),
  body('context')
    .optional()
    .isString()
    .trim(),
  body('accepted')
    .optional()
    .isBoolean(),
];

// Value validation
export const createValueValidation = [
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isString()
    .trim(),
  body('customValue')
    .optional()
    .isString()
    .trim(),
  body('importance')
    .isInt({ min: 1, max: 10 })
    .withMessage('Importance must be between 1 and 10'),
  body('alignment')
    .isInt({ min: 1, max: 10 })
    .withMessage('Alignment must be between 1 and 10'),
];

// Action validation
export const createActionValidation = [
  body('value')
    .notEmpty()
    .withMessage('Value is required')
    .isString()
    .trim(),
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isString()
    .trim(),
  body('microSteps')
    .optional()
    .isArray(),
];

// Boundary validation
export const createBoundaryValidation = [
  body('scenario')
    .notEmpty()
    .withMessage('Scenario is required')
    .isString()
    .trim(),
  body('boundaryType')
    .notEmpty()
    .withMessage('Boundary type is required')
    .isString()
    .isIn(['emotional', 'physical', 'time', 'mental', 'material'])
    .withMessage('Invalid boundary type'),
  body('response')
    .notEmpty()
    .withMessage('Response is required')
    .isString()
    .trim(),
  body('confidence')
    .isInt({ min: 1, max: 10 })
    .withMessage('Confidence must be between 1 and 10'),
  body('outcome')
    .optional()
    .isString()
    .trim(),
];

// Message validation
export const createMessageValidation = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message must not exceed 5000 characters'),
];
