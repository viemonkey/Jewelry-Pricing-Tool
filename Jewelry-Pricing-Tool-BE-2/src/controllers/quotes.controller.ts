import { Request, Response, NextFunction } from 'express'
import { quotesService } from '../services/quotes.service'
import { QuoteStatus } from '../models/Quote'

export class QuotesController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as QuoteStatus | undefined
      const quotes = await quotesService.findAll(status)
      res.json(quotes)
    } catch (error) {
      next(error)
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await quotesService.getStats()
      res.json(stats)
    } catch (error) {
      next(error)
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.findOne(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined
      const imageUrls = (files || []).map((f) => `/uploads/quotes/${f.filename}`)
      const quote = await quotesService.create(req.body, imageUrls)
      res.status(201).json(quote)
    } catch (error) {
      next(error)
    }
  }

  async updatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.updatePrice(req.params.id, req.body)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async startQuoting(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.startQuoting(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async rejectQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body
      const quote = await quotesService.rejectQuote(req.params.id, reason)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async updateInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined
      const newImageUrls = (files || []).map((f) => `/uploads/quotes/${f.filename}`)
      
      const body = { ...req.body }
      let keepImages: string[] = []
      if (body.keepImages) {
        try {
          keepImages = JSON.parse(body.keepImages)
        } catch {
          keepImages = []
        }
      }
      delete body.keepImages

      const images = [...keepImages, ...newImageUrls]
      const updatedQuote = await quotesService.updateInfo(req.params.id, {
        ...body,
        ...(images.length > 0 ? { images } : {}),
      })
      res.json(updatedQuote)
    } catch (error) {
      next(error)
    }
  }

  async resubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.resubmit(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async completeQuoting(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.completeQuoting(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async sentToCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.sentToCustomer(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.confirm(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await quotesService.cancel(req.params.id)
      res.json(quote)
    } catch (error) {
      next(error)
    }
  }
}

export const quotesController = new QuotesController()
