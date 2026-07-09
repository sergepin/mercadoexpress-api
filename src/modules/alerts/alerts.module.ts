import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsListener } from './alerts.listener';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alert])],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsListener],
  exports: [AlertsService],
})
export class AlertsModule {}
