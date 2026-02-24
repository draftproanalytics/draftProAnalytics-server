// src/modules/roster/presentation/routes/rosterPlayer.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { RosterContainer } from '../../infrastructure/container/roster.container'
import { 
  createRosterPlayerValidation,
  updateRosterPlayerValidation,
  idParamValidation,
  teamIdParamValidation,
  positionGroupParamValidation
} from '../validators/rosterPlayer.validator'
import { validationMiddleware } from '@/shared/presentation/middleware/validation.middleware'

const router = Router()

// Get controller from DI container
const getController = () => RosterContainer.getInstance().rosterPlayerController

/**
 * @route   POST /api/roster-players
 * @desc    Create a new roster player
 * @access  Private
 */
router.post(
  '/',
  createRosterPlayerValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().create(req, res, next)
)

/**
 * @route   GET /api/roster-players
 * @desc    Get all roster players
 * @access  Private
 */
router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) => getController().getAll(req, res, next)
)

/**
 * @route   GET /api/roster-players/:id
 * @desc    Get roster player by ID
 * @access  Private
 */
router.get(
  '/:id',
  idParamValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().getById(req, res, next)
)

/**
 * @route   GET /api/roster-players/team/:teamId
 * @desc    Get all roster players for a team
 * @access  Private
 */
router.get(
  '/team/:teamId',
  teamIdParamValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().getByTeamId(req, res, next)
)

/**
 * @route   GET /api/roster-players/team/:teamId/starters
 * @desc    Get all starters for a team
 * @access  Private
 */
router.get(
  '/team/:teamId/starters',
  teamIdParamValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().getTeamStarters(req, res, next)
)

/**
 * @route   GET /api/roster-players/team/:teamId/position-group/:positionGroup
 * @desc    Get roster players by position group for a team
 * @access  Private
 */
router.get(
  '/team/:teamId/position-group/:positionGroup',
  positionGroupParamValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().getByPositionGroup(req, res, next)
)

/**
 * @route   PATCH /api/roster-players/:id
 * @desc    Update roster player
 * @access  Private
 */
router.patch(
  '/:id',
  updateRosterPlayerValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().update(req, res, next)
)

/**
 * @route   DELETE /api/roster-players/:id
 * @desc    Delete roster player
 * @access  Private
 */
router.delete(
  '/:id',
  idParamValidation,
  validationMiddleware,
  (req: Request, res: Response, next: NextFunction) => getController().delete(req, res, next)
)

export default router