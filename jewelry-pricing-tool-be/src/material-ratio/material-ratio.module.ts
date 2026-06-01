import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MaterialRatio, MaterialRatioSchema } from './material-ratio.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: MaterialRatio.name, schema: MaterialRatioSchema }])],
  exports: [MongooseModule],
})
export class MaterialRatioModule {}
