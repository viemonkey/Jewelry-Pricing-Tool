import { Request, Response, NextFunction } from 'express'
import { productionService } from '../services/production.service'
import { ProductionStatus } from '../models/Production'

export class ProductionController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as ProductionStatus | undefined
      const orders = await productionService.findAll(status)
      res.json(orders)
    } catch (error) {
      next(error)
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await productionService.findOne(req.params.id)
      res.json(order)
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { quoteId, deadline, assignedTo } = req.body
      const order = await productionService.create(quoteId, deadline, assignedTo)
      res.status(201).json(order)
    } catch (error) {
      next(error)
    }
  }

  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { progressStatus, progressNotes, assignedTo, deadline } = req.body
      const order = await productionService.updateProgress(
        req.params.id,
        progressStatus as ProductionStatus,
        progressNotes,
        assignedTo,
        deadline
      )
      res.json(order)
    } catch (error) {
      next(error)
    }
  }

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined
      const imageUrls = (files || []).map((f) => `/uploads/production/${f.filename}`)
      const order = await productionService.complete(req.params.id, imageUrls)
      res.json(order)
    } catch (error) {
      next(error)
    }
  }
}

export const productionController = new ProductionController()
