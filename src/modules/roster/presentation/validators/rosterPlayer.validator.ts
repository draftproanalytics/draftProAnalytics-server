// src/modules/roster/presentation/validators/rosterPlayer.validator.ts

import { body, param, ValidationChain } from 'express-validator'

export const createRosterPlayerValidation: ValidationChain[] = [
  body('teamId')
    .notEmpty()
    .withMessage('Team ID is required')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  body('playerId')
    .optional()
    .isString()
    .withMessage('Player ID must be a string'),

  body('playerName')
    .notEmpty()
    .withMessage('Player name is required')
    .isString()
    .withMessage('Player name must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Player name must be between 1 and 255 characters'),

  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isString()
    .withMessage('Position must be a string')
    .isIn(['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T', 'DE', 'DT', 'NT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS', 'K', 'P', 'LS'])
    .withMessage('Invalid position'),

  body('positionGroup')
    .notEmpty()
    .withMessage('Position group is required')
    .isString()
    .withMessage('Position group must be a string')
    .isIn(['OFF', 'DEF', 'ST'])
    .withMessage('Position group must be OFF, DEF, or ST'),

  body('depthChartOrder')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Depth chart order must be between 1 and 99'),

  body('age')
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 18, max: 50 })
    .withMessage('Age must be between 18 and 50'),

  body('yearsExperience')
    .notEmpty()
    .withMessage('Years of experience is required')
    .isInt({ min: 0, max: 25 })
    .withMessage('Years of experience must be between 0 and 25'),

  body('performanceGrade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Performance grade must be between 0 and 100'),

  body('isStarter')
    .optional()
    .isBoolean()
    .withMessage('isStarter must be a boolean'),

  body('contractYearsRemaining')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Contract years remaining must be between 0 and 10'),

  body('injuryStatus')
    .optional()
    .isString()
    .withMessage('Injury status must be a string')
    .isIn(['HEALTHY', 'QUESTIONABLE', 'DOUBTFUL', 'OUT', 'INJURED_RESERVE', 'PHYSICALLY_UNABLE_TO_PERFORM', 'NON_FOOTBALL_INJURY', 'SUSPENDED'])
    .withMessage('Invalid injury status'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
]

export const updateRosterPlayerValidation: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isString()
    .withMessage('ID must be a string'),

  body('playerName')
    .optional()
    .isString()
    .withMessage('Player name must be a string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Player name must be between 1 and 255 characters'),

  body('position')
    .optional()
    .isString()
    .withMessage('Position must be a string')
    .isIn(['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T', 'DE', 'DT', 'NT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS', 'K', 'P', 'LS'])
    .withMessage('Invalid position'),

  body('positionGroup')
    .optional()
    .isString()
    .withMessage('Position group must be a string')
    .isIn(['OFF', 'DEF', 'ST'])
    .withMessage('Position group must be OFF, DEF, or ST'),

  body('depthChartOrder')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Depth chart order must be between 1 and 99'),

  body('age')
    .optional()
    .isInt({ min: 18, max: 50 })
    .withMessage('Age must be between 18 and 50'),

  body('yearsExperience')
    .optional()
    .isInt({ min: 0, max: 25 })
    .withMessage('Years of experience must be between 0 and 25'),

  body('performanceGrade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Performance grade must be between 0 and 100'),

  body('isStarter')
    .optional()
    .isBoolean()
    .withMessage('isStarter must be a boolean'),

  body('contractYearsRemaining')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Contract years remaining must be between 0 and 10'),

  body('injuryStatus')
    .optional()
    .isString()
    .withMessage('Injury status must be a string')
    .isIn(['HEALTHY', 'QUESTIONABLE', 'DOUBTFUL', 'OUT', 'INJURED_RESERVE', 'PHYSICALLY_UNABLE_TO_PERFORM', 'NON_FOOTBALL_INJURY', 'SUSPENDED'])
    .withMessage('Invalid injury status'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
]

export const idParamValidation: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isString()
    .withMessage('ID must be a string'),
]

export const teamIdParamValidation: ValidationChain[] = [
  param('teamId')
    .notEmpty()
    .withMessage('Team ID is required')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),
]

export const positionGroupParamValidation: ValidationChain[] = [
  ...teamIdParamValidation,
  param('positionGroup')
    .notEmpty()
    .withMessage('Position group is required')
    .isIn(['OFF', 'DEF', 'ST'])
    .withMessage('Position group must be OFF, DEF, or ST'),
]