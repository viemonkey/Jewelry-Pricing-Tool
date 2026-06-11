import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { clearSessionCookie, setSessionCookie } from '../utils/sessionToken'

class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.register(req.body)
      res.status(201).json({ user })
    } catch (err) {
      next(err)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body, req)
      setSessionCookie(res, result.token, result.expiresAt)
      res.json({ user: result.user })
    } catch (err) {
      next(err)
    }
  }

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getCurrentUser(req)
      if (!user) return res.status(401).json({ message: 'Chưa đăng nhập.' })
      res.json({ user })
    } catch (err) {
      next(err)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req)
      clearSessionCookie(res)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  }
}

export const authController = new AuthController()
