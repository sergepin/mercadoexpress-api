import { Module } from '@nestjs/common';
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
  imports: [ProductsModule, InventoryMovementsModule, AlertsModule, PurchaseOrdersModule],
  controllers: [AppController, ProductsController, PurchaseOrdersController],
  providers: [AppService, ProductsService, InventoryMovementsService, AlertsService, PurchaseService],
})
export class AppModule {}
