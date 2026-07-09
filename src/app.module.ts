import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { ProductsController } from './modules/products.controller';
import { ProductsService } from './modules/products.service';
import { InventoryMovementsModule } from './modules/inventory-movements/inventory-movements.module';
import { InventoryMovementsService } from './modules/inventory-movements.service';
import { PurchaseService } from './orders/modules/purchase.service';
import { PurchaseOrdersController } from './modules/purchase-orders.controller';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { AlertsService } from './modules/alerts.service';
import { AlertsModule } from './modules/alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    EventEmitterModule.forRoot(),
    ProductsModule,
    InventoryMovementsModule,
    AlertsModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController, ProductsController, PurchaseOrdersController],
  providers: [AppService, ProductsService, InventoryMovementsService, AlertsService, PurchaseService],
})
export class AppModule {}
