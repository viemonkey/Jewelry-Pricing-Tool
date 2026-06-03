import mongoose, { Schema, Document } from 'mongoose'

export interface IQuotationHistory extends Document {
  quote: mongoose.Types.ObjectId
  fromStatus?: string
  toStatus: string
  changedBy?: string
  note: string | null
  changedAt: Date
}

const QuotationHistorySchema = new Schema<IQuotationHistory>(
  {
    quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    changedBy: { type: String },
    note: { type: String, default: null },
    changedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false, collection: 'quotation_histories' }
)

QuotationHistorySchema.index({ quote: 1, changedAt: -1 })

export const QuotationHistory = mongoose.model<IQuotationHistory>('QuotationHistory', QuotationHistorySchema)
