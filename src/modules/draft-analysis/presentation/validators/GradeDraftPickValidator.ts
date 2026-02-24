// src/modules/draft-analysis/presentation/validators/GradeDraftPickValidator.ts
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export class GradeDraftPickValidator {
  static validateGradePick() {
    return [
      body('teamId')
        .notEmpty()
        .withMessage('Team ID is required')
        .isString()
        .withMessage('Team ID must be a string'),
      
      body('round')
        .notEmpty()
        .withMessage('Round is required')
        .isInt({ min: 1, max: 7 })
        .withMessage('Round must be between 1 and 7'),
      
      body('pick')
        .notEmpty()
        .withMessage('Pick is required')
        .isInt({ min: 1, max: 32 })
        .withMessage('Pick must be between 1 and 32'),
      
      body('position')
        .notEmpty()
        .withMessage('Position is required')
        .isString()
        .withMessage('Position must be a string')
        .isIn(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'ST'])
        .withMessage('Position must be a valid position group'),
      
      body('consensusRank')
        .notEmpty()
        .withMessage('Consensus rank is required')
        .isInt({ min: 1, max: 300 })
        .withMessage('Consensus rank must be between 1 and 300'),
      
      body('year')
        .optional()
        .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
        .withMessage('Year must be between 1990 and next year')
    ];
  }

  static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array()
      });
      return; // ADD THIS
    }
    
    next();
  }
}