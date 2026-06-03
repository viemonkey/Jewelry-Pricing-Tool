import multer from 'multer'
import { extname, join } from 'path'
import fs from 'fs'

// Ensure upload directories exist
const quotesUploadDir = join(process.cwd(), 'uploads', 'quotes')
const productionUploadDir = join(process.cwd(), 'uploads', 'production')

fs.mkdirSync(quotesUploadDir, { recursive: true })
fs.mkdirSync(productionUploadDir, { recursive: true })

const quotesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, quotesUploadDir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

const productionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productionUploadDir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

export const uploadQuotes = multer({ storage: quotesStorage }).array('images', 5)
export const uploadProduction = multer({ storage: productionStorage }).array('completedImages', 8)
