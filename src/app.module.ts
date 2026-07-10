import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { ProductsModule } from './modules/products/products.module';
import { InventoryMovementsModule } from './modules/inventory-movements/inventory-movements.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildTypeOrmOptions(config),
        autoLoadEntities: true,
      }),
    }),
    EventEmitterModule.forRoot(),
    ProductsModule,
    InventoryMovementsModule,
    AlertsModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
