// src/shared/presentation/middleware/validation.middleware.ts

import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'

export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
      })),
    })
    return
  }
  
  next()
}

