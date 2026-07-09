import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un producto' })
  @ApiCreatedResponse({ type: Product })
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros opcionales' })
  @ApiOkResponse({ type: [Product] })
  findAll(@Query() filters: FilterProductsDto): Promise<Product[]> {
    return this.productsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un producto por id' })
  @ApiOkResponse({ type: Product })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Ajustar inventario de un producto' })
  @ApiOkResponse({ type: Product })
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ): Promise<Product> {
    return this.productsService.adjustStock(id, dto);
  }
}
