import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import dns from 'dns'
dns.setServers(['8.8.8.8'])
dotenv.config()

import { GoldPrice } from './models/GoldPrice'
import { MaterialRatio } from './models/MaterialRatio'
import { StonePrice } from './models/StonePrice'
import { PricingConfig } from './models/PricingConfig'
import { User } from './models/User'
import { hashPassword } from './utils/password'

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Jewelry-Pricing-Tool'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB for seeding:', uri)

  // 0. Users
  const defaultUsers = [
    {
      username: 'sale',
      fullName: 'Nguyễn Văn Sale',
      email: 'sale@jewelry.local',
      role: 'sale' as const,
      password: process.env.SEED_SALE_PASSWORD || 'sale123456',
    },
    {
      username: 'adminvcb',
      fullName: 'Báo giá viên',
      email: 'order@jewelry.local',
      role: 'order' as const,
      password: process.env.SEED_ORDER_PASSWORD || 'adminvcb',
    },
  ]

  for (const item of defaultUsers) {
    await User.updateOne(
      { username: item.username },
      {
        $set: {
          fullName: item.fullName,
          username: item.username,
          email: item.email,
          role: item.role,
          status: 'active',
          passwordHash: await hashPassword(item.password),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      },
      { upsert: true }
    )
    console.log(`  ✅ User ${item.username} seeded/updated`)
  }

  // 1. Gold Price
  const goldCount = await GoldPrice.countDocuments()
  if (goldCount === 0) {
    await GoldPrice.create({
      pricePerChi: 8_700_000,
      pricePerGram: 435_000,
      effectiveDate: new Date(),
      source: 'manual',
    })
    console.log('  ✅ GoldPrice seeded')
  } else {
    console.log('  ⏭  GoldPrice already exists, skipping')
  }

  // 2. Material Ratio
  const matCount = await MaterialRatio.countDocuments()
  if (matCount === 0) {
    await MaterialRatio.insertMany([
      { material: 'GOLD_10K', labelVi: 'Vàng 10K', ratio: 0.417, unit: 'chi' },
      { material: 'GOLD_14K', labelVi: 'Vàng 14K', ratio: 0.585, unit: 'chi' },
      { material: 'GOLD_18K', labelVi: 'Vàng 18K', ratio: 0.750, unit: 'chi' },
      { material: 'GOLD_24K', labelVi: 'Vàng 24K', ratio: 1.000, unit: 'chi' },
      { material: 'GOLD_610', labelVi: 'Vàng 610', ratio: 0.610, unit: 'chi' },
      {
        material: 'SILVER',
        labelVi: 'Bạc 925',
        ratio: 0.925,
        unit: 'gram',
        isSpecialRule: true,
        specialRuleNote: 'Sản phẩm bạc: áp dụng silverMultiplier trong PricingConfig',
      },
      {
        material: 'PLATINUM',
        labelVi: 'Bạch kim',
        ratio: 1,
        unit: 'chi',
        isSpecialRule: true,
        specialRuleNote: 'Bạch kim: manager nhập giá theo chỉ đã gồm tiền công, giá vốn = trọng lượng * giá bạch kim + tiền đá',
      },
    ])
    console.log('  ✅ MaterialRatio seeded (7 materials)')
  } else {
    console.log('  ⏭  MaterialRatio already exists, skipping')
  }

  // 3. Stone Price
  const stoneCount = await StonePrice.countDocuments()
  if (stoneCount === 0) {
    await StonePrice.insertMany([
      {
        stoneType: 'LAB_DIAMOND',
        labelVi: 'Kim cương Lab',
        spec: { size: '0.3ct', color: 'F', clarity: 'VS1', cut: 'Excellent' },
        pricePerUnit: 5_000_000,
        effectiveDate: new Date(),
      },
      {
        stoneType: 'NATURAL_DIAMOND',
        labelVi: 'Kim cương thiên nhiên',
        spec: { size: '0.3ct', color: 'G', clarity: 'VS2', cut: 'Very Good' },
        pricePerUnit: 12_000_000,
        effectiveDate: new Date(),
      },
      {
        stoneType: 'COLORED_STONE',
        labelVi: 'Đá màu (Ruby)',
        spec: { size: '3mm', color: 'Red' },
        pricePerUnit: 800_000,
        effectiveDate: new Date(),
      },
      {
        stoneType: 'CZ',
        labelVi: 'Đá CZ',
        spec: { size: '2mm' },
        pricePerUnit: 50_000,
        effectiveDate: new Date(),
      },
      {
        stoneType: 'MOISSANITE',
        labelVi: 'Đá Moissanite',
        spec: { size: '0.5ct', color: 'D', clarity: 'VVS1' },
        pricePerUnit: 2_500_000,
        effectiveDate: new Date(),
      },
    ])
    console.log('  ✅ StonePrice seeded (5 types)')
  } else {
    console.log('  ⏭  StonePrice already exists, skipping')
  }

  // 4. Pricing Config
  await PricingConfig.deleteMany({}) // Clear old config to force correct rates to seed
  await PricingConfig.create({
    goldRatios: [
      { key: 'GOLD_10K', standard: 0.417, applied: 0.47, label: 'Vàng 10K' },
      { key: 'GOLD_14K', standard: 0.583, applied: 0.64, label: 'Vàng 14K' },
      { key: 'GOLD_18K', standard: 0.75, applied: 0.80, label: 'Vàng 18K' },
      { key: 'GOLD_24K', standard: 0.9999, applied: 1.05, label: 'Vàng 24K' },
      { key: 'GOLD_610', standard: 0.61, applied: 0.66, label: 'Vàng 610' },
    ],
    profitMargins: [
      { maxCost: 10_000_000, divisor: 0.65, margin: '35%' },
      { maxCost: 50_000_000, divisor: 0.70, margin: '30%' },
      { maxCost: 999_999_999_999, divisor: 0.75, margin: '25%' },
    ],
    silverMultiplier: 3,
    goldPrice24K: 8_700_000,
  })
  console.log('  ✅ PricingConfig seeded')

  await mongoose.disconnect()
  console.log('\n🎉 Seed completed!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
