import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MovementType } from '../src/modules/inventory-movements/entities/movement.entity';
import { resetDatabase } from './helpers/database.helper';
import { createE2eApp } from './helpers/test-app.helper';
import { waitFor } from './helpers/wait-for.helper';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
      });
  });
});

describe('Products & inventory (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products devuelve los 6 productos del seed', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);

    expect(response.body).toHaveLength(6);
    expect(response.body.map((p: { sku: string }) => p.sku)).toContain('BEB001');
  });

  it('GET /products?category=lacteos filtra sin importar acentos (RF-06)', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .query({ category: 'lacteos' })
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(
      response.body.every(
        (p: { category: { name: string } }) => p.category.name === 'Lácteos',
      ),
    ).toBe(true);
  });

  it('GET /products?withActiveAlert=true devuelve productos bajo mínimo del seed', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .query({ withActiveAlert: true })
      .expect(200);

    const skus = response.body.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('BEB002');
    expect(skus).toContain('LAC002');
    expect(response.body).toHaveLength(2);
  });

  it('POST /products crea un producto válido', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .send({
        sku: 'BEB003',
        name: 'Gaseosa 2L',
        categoryId: 1,
        price: 2500,
        stock: 100,
        minStock: 30,
        supplier: 'Distribuidora Andina',
      })
      .expect(201);

    expect(response.body.sku).toBe('BEB003');
    expect(response.body.stock).toBe(100);
  });

  it('POST /products rechaza SKU duplicado con 409', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({
        sku: 'BEB001',
        name: 'Duplicado',
        categoryId: 1,
        price: 1000,
        stock: 10,
        minStock: 5,
        supplier: 'Test',
      })
      .expect(409);
  });

  it('PATCH /products/:id/stock rechaza salida que deja stock negativo (RN-01)', async () => {
    const response = await request(app.getHttpServer())
      .patch('/products/1/stock')
      .send({
        type: MovementType.SALIDA,
        quantity: 999,
        reason: 'Venta excesiva',
      })
      .expect(400);

    expect(response.body.message[0]).toContain('Stock insuficiente');
  });

  it('PATCH /products/:id/stock aplica entrada y actualiza stock', async () => {
    const before = await request(app.getHttpServer()).get('/products/1').expect(200);

    await request(app.getHttpServer())
      .patch('/products/1/stock')
      .send({
        type: MovementType.ENTRADA,
        quantity: 10,
        reason: 'Reposición e2e',
      })
      .expect(200);

    const after = await request(app.getHttpServer()).get('/products/1').expect(200);
    expect(after.body.stock).toBe(before.body.stock + 10);
  });
});

describe('Alerts (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /alerts?status=ACTIVA devuelve las 2 alertas del seed', async () => {
    const response = await request(app.getHttpServer())
      .get('/alerts')
      .query({ status: 'ACTIVA' })
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it('bajar stock crea alerta y subirla la resuelve (RN-03/05)', async () => {
    // BEB001: stock 150, minStock 50 — bajar a 50 debe crear alerta
    await request(app.getHttpServer())
      .patch('/products/1/stock')
      .send({
        type: MovementType.SALIDA,
        quantity: 100,
        reason: 'Venta e2e alerta',
      })
      .expect(200);

    await waitFor(async () => {
      const alerts = await request(app.getHttpServer())
        .get('/alerts')
        .query({ status: 'ACTIVA' });
      return alerts.body.some(
        (alert: { productId: number }) => alert.productId === 1,
      );
    });

    await request(app.getHttpServer())
      .patch('/products/1/stock')
      .send({
        type: MovementType.ENTRADA,
        quantity: 10,
        reason: 'Reposición e2e resuelve alerta',
      })
      .expect(200);

    await waitFor(async () => {
      const alerts = await request(app.getHttpServer())
        .get('/alerts')
        .query({ status: 'RESUELTA' });
      return alerts.body.some(
        (alert: { productId: number }) => alert.productId === 1,
      );
    });
  });
});

describe('Purchase orders (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /purchase-orders rechaza cantidad menor a minStock * 2 (RN-02)', async () => {
    await request(app.getHttpServer())
      .post('/purchase-orders')
      .send({ productId: 2, quantity: 50 })
      .expect(400);
  });

  it('flujo completo: crear → aprobar → recibir incrementa stock y resuelve alerta (RN-07/09)', async () => {
    const alertsBefore = await request(app.getHttpServer())
      .get('/alerts')
      .query({ status: 'ACTIVA' })
      .expect(200);

    const alertForProduct2 = alertsBefore.body.find(
      (alert: { productId: number }) => alert.productId === 2,
    );
    expect(alertForProduct2).toBeDefined();

    const productBefore = await request(app.getHttpServer())
      .get('/products/2')
      .expect(200);
    expect(productBefore.body.stock).toBe(30);

    const created = await request(app.getHttpServer())
      .post('/purchase-orders')
      .send({
        productId: 2,
        quantity: 80,
        alertId: alertForProduct2.id,
      })
      .expect(201);

    expect(created.body.status).toBe('PENDIENTE');

    await request(app.getHttpServer())
      .patch(`/purchase-orders/${created.body.id}/approve`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/purchase-orders/${created.body.id}/receive`)
      .expect(200);

    const productAfter = await request(app.getHttpServer())
      .get('/products/2')
      .expect(200);
    expect(productAfter.body.stock).toBe(110);

    await waitFor(async () => {
      const activeAlerts = await request(app.getHttpServer())
        .get('/alerts')
        .query({ status: 'ACTIVA' });
      return !activeAlerts.body.some(
        (alert: { productId: number }) => alert.productId === 2,
      );
    });
  });

  it('PATCH approve rechaza transición inválida desde RECIBIDA (RN-07)', async () => {
    const orders = await request(app.getHttpServer())
      .get('/purchase-orders')
      .expect(200);

    const receivedOrder = orders.body.find(
      (order: { status: string }) => order.status === 'RECIBIDA',
    );
    expect(receivedOrder).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/purchase-orders/${receivedOrder.id}/approve`)
      .expect(400);
  });
});
