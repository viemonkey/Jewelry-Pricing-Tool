import multer from 'multer'
import { extname, join } from 'path'
import fs from 'fs'

// Ensure upload directories exist
const quotesUploadDir = join(process.cwd(), 'uploads', 'quotes')

fs.mkdirSync(quotesUploadDir, { recursive: true })

const quotesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, quotesUploadDir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

export const uploadQuotes = multer({ storage: quotesStorage }).array('images', 5)
