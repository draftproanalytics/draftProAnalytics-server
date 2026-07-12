// src/modules/draft-analysis/presentation/validators/AnalyzeTeamDraftPatternValidator.ts
import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export class AnalyzeTeamDraftPatternValidator {
  static validateAnalyzePattern() {
    return [
      body('teamId')
        .notEmpty()
        .withMessage('Team ID is required')
        .isString()
        .withMessage('Team ID must be a string'),
      
      body('startYear')
        .optional()
        .isInt({ min: 1990, max: new Date().getFullYear() })
        .withMessage('Start year must be between 1990 and current year'),
      
      body('endYear')
        .optional()
        .isInt({ min: 1990, max: new Date().getFullYear() })
        .withMessage('End year must be between 1990 and current year')
        .custom((value, { req }) => {
          if (req.body.startYear && value < req.body.startYear) {
            throw new Error('End year must be greater than or equal to start year');
          }
          return true;
        })
    ];
  }

  static validateGetPattern() {
    return [
      param('teamId')
        .notEmpty()
        .withMessage('Team ID is required')
        .isString()
        .withMessage('Team ID must be a string')
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