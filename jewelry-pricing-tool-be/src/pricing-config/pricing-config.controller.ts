import { Controller, Get, Put, Body } from '@nestjs/common'
import { PricingConfigService } from './pricing-config.service'

@Controller('pricing-config')
export class PricingConfigController {
  constructor(private readonly service: PricingConfigService) {}

  @Get()
  get() {
    return this.service.get()
  }

  @Put()
  update(@Body() body: any) {
    return this.service.update(body)
  }
}
