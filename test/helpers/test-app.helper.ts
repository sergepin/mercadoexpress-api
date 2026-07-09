import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/common/configure-app';
import { loadTestEnv } from './env.helper';

export async function createE2eApp(): Promise<INestApplication<App>> {
  loadTestEnv();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app, { enableSwagger: false });
  await app.init();

  return app;
}
