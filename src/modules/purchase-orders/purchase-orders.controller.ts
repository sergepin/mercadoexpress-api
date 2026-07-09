import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { RejectPurchaseOrderDto } from './dto/reject-purchase-order.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear orden de compra (manual o desde alerta con alertId opcional)',
  })
  @ApiCreatedResponse({ type: PurchaseOrder })
  create(@Body() dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de compra' })
  @ApiOkResponse({ type: [PurchaseOrder] })
  findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrdersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una orden de compra' })
  @ApiOkResponse({ type: PurchaseOrder })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprobar orden (PENDIENTE -> APROBADA)' })
  @ApiOkResponse({ type: PurchaseOrder })
  approve(@Param('id', ParseIntPipe) id: number): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rechazar orden (PENDIENTE -> RECHAZADA)' })
  @ApiOkResponse({ type: PurchaseOrder })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.reject(id, dto);
  }

  @Patch(':id/receive')
  @ApiOperation({ summary: 'Recibir orden (APROBADA -> RECIBIDA)' })
  @ApiOkResponse({ type: PurchaseOrder })
  receive(@Param('id', ParseIntPipe) id: number): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.receive(id);
  }
}
