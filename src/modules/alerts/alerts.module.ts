import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert])],
  exports: [TypeOrmModule],
})
export class AlertsModule {}
