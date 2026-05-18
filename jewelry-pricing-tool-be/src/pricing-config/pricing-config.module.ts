import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PricingConfigController } from './pricing-config.controller'
import { PricingConfigService } from './pricing-config.service'
import { PricingConfig, PricingConfigSchema } from './pricing-config.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PricingConfig.name, schema: PricingConfigSchema },
    ]),
  ],
  controllers: [PricingConfigController],
  providers: [PricingConfigService],
  exports: [PricingConfigService],
})
export class PricingConfigModule {}
