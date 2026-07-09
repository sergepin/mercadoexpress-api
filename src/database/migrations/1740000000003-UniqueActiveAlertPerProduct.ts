import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueActiveAlertPerProduct1740000000003
  implements MigrationInterface
{
  name = 'UniqueActiveAlertPerProduct1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alerts_one_active_per_product"
      ON "alerts" ("product_id")
      WHERE "status" = 'ACTIVA'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_alerts_one_active_per_product"
    `);
  }
}
