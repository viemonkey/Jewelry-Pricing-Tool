/**
 * VCB Jewelry – Seed Script
 * Chạy: npx ts-node -r tsconfig-paths/register src/seed/seed.ts
 * Hoặc: node dist/seed/seed.js
 *
 * Chèn dữ liệu mẫu ban đầu:
 *  - GoldPrice      (giá vàng 24K hôm nay)
 *  - MaterialRatio  (tỉ lệ theo tuổi vàng)
 *  - StonePrice     (bảng giá đá)
 *  - PricingConfig  (hệ số lợi nhuận – đã tồn tại trong project)
 */
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
dotenv.config()

// ── Inline schemas (tránh circular import khi chạy standalone) ──

const GoldPriceSchema = new mongoose.Schema({
  pricePerChi: Number, pricePerGram: Number,
  effectiveDate: Date, source: { type: String, default: 'manual' },
}, { timestamps: true, collection: 'gold_prices' })

const MaterialRatioSchema = new mongoose.Schema({
  material: String, labelVi: String, ratio: Number,
  unit: { type: String, default: 'chi' },
  isSpecialRule: { type: Boolean, default: false },
  specialRuleNote: { type: String, default: null },
}, { timestamps: true, collection: 'material_ratios' })

const StonePriceSchema = new mongoose.Schema({
  stoneType: String, labelVi: String, spec: Object,
  pricePerUnit: Number, unit: { type: String, default: 'viên' },
  effectiveDate: Date,
}, { timestamps: true, collection: 'stone_prices' })

const PricingConfigSchema = new mongoose.Schema({
  goldRatios: [Object], profitMargins: [Object],
  silverMultiplier: { type: Number, default: 3 },
  goldPrice24K: { type: Number, default: 9000000 },
}, { timestamps: true, collection: 'pricing_config' })

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Jewelry-Pricing-Tool'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB:', uri)

  const GoldPriceModel     = mongoose.model('GoldPrice',     GoldPriceSchema)
  const MaterialRatioModel = mongoose.model('MaterialRatio', MaterialRatioSchema)
  const StonePriceModel    = mongoose.model('StonePrice',    StonePriceSchema)
  const PricingConfigModel = mongoose.model('PricingConfig', PricingConfigSchema)

  // ── 1. Gold Price ──────────────────────────────────────────
  const goldCount = await GoldPriceModel.countDocuments()
  if (goldCount === 0) {
    await GoldPriceModel.create({
      pricePerChi:   8_700_000,
      pricePerGram:    435_000,
      effectiveDate: new Date(),
      source: 'manual',
    })
    console.log('  ✅ GoldPrice seeded')
  } else {
    console.log('  ⏭  GoldPrice already exists, skipping')
  }

  // ── 2. Material Ratio ──────────────────────────────────────
  const matCount = await MaterialRatioModel.countDocuments()
  if (matCount === 0) {
    await MaterialRatioModel.insertMany([
      { material: 'GOLD_10K',   labelVi: 'Vàng 10K',  ratio: 0.417, unit: 'chi'  },
      { material: 'GOLD_14K',   labelVi: 'Vàng 14K',  ratio: 0.585, unit: 'chi'  },
      { material: 'GOLD_18K',   labelVi: 'Vàng 18K',  ratio: 0.750, unit: 'chi'  },
      { material: 'GOLD_24K',   labelVi: 'Vàng 24K',  ratio: 1.000, unit: 'chi'  },
      { material: 'GOLD_610',   labelVi: 'Vàng 610',  ratio: 0.610, unit: 'chi'  },
      {
        material: 'SILVER',     labelVi: 'Bạc 925',   ratio: 0.925, unit: 'gram',
        isSpecialRule: true,
        specialRuleNote: 'Sản phẩm bạc: áp dụng silverMultiplier trong PricingConfig',
      },
    ])
    console.log('  ✅ MaterialRatio seeded (6 materials)')
  } else {
    console.log('  ⏭  MaterialRatio already exists, skipping')
  }

  // ── 3. Stone Price ─────────────────────────────────────────
  const stoneCount = await StonePriceModel.countDocuments()
  if (stoneCount === 0) {
    await StonePriceModel.insertMany([
      {
        stoneType: 'LAB_DIAMOND',     labelVi: 'Kim cương Lab',
        spec: { size: '0.3ct', color: 'F', clarity: 'VS1', cut: 'Excellent' },
        pricePerUnit: 5_000_000, effectiveDate: new Date(),
      },
      {
        stoneType: 'NATURAL_DIAMOND', labelVi: 'Kim cương thiên nhiên',
        spec: { size: '0.3ct', color: 'G', clarity: 'VS2', cut: 'Very Good' },
        pricePerUnit: 12_000_000, effectiveDate: new Date(),
      },
      {
        stoneType: 'COLORED_STONE',   labelVi: 'Đá màu (Ruby)',
        spec: { size: '3mm', color: 'Red' },
        pricePerUnit: 800_000, effectiveDate: new Date(),
      },
      {
        stoneType: 'CZ',              labelVi: 'Đá CZ',
        spec: { size: '2mm' },
        pricePerUnit: 50_000, effectiveDate: new Date(),
      },
      {
        stoneType: 'MOISSANITE',      labelVi: 'Đá Moissanite',
        spec: { size: '0.5ct', color: 'D', clarity: 'VVS1' },
        pricePerUnit: 2_500_000, effectiveDate: new Date(),
      },
    ])
    console.log('  ✅ StonePrice seeded (5 types)')
  } else {
    console.log('  ⏭  StonePrice already exists, skipping')
  }

  // ── 4. PricingConfig (đã có trong project, chỉ seed nếu chưa có) ──
  const cfgCount = await PricingConfigModel.countDocuments()
  if (cfgCount === 0) {
    await PricingConfigModel.create({
      goldRatios: [
        { key: 'GOLD_10K', standard: 10, applied: 10, label: 'Vàng 10K' },
        { key: 'GOLD_14K', standard: 14, applied: 14, label: 'Vàng 14K' },
        { key: 'GOLD_18K', standard: 18, applied: 18, label: 'Vàng 18K' },
        { key: 'GOLD_24K', standard: 24, applied: 24, label: 'Vàng 24K' },
        { key: 'GOLD_610', standard: 14, applied: 14, label: 'Vàng 610' },
      ],
      profitMargins: [
        { maxCost: 5_000_000,   divisor: 0.65, margin: '35%' },
        { maxCost: 10_000_000,  divisor: 0.68, margin: '32%' },
        { maxCost: 20_000_000,  divisor: 0.70, margin: '30%' },
        { maxCost: 50_000_000,  divisor: 0.72, margin: '28%' },
        { maxCost: 999_999_999, divisor: 0.75, margin: '25%' },
      ],
      silverMultiplier: 3,
      goldPrice24K: 8_700_000,
    })
    console.log('  ✅ PricingConfig seeded')
  } else {
    console.log('  ⏭  PricingConfig already exists, skipping')
  }

  await mongoose.disconnect()
  console.log('\n🎉 Seed completed!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
