import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderAlertAndRejection1740000000001
  implements MigrationInterface
{
  name = 'AddPurchaseOrderAlertAndRejection1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      ADD COLUMN "alert_id" integer,
      ADD COLUMN "rejection_reason" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      ADD CONSTRAINT "FK_purchase_orders_alert"
      FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_purchase_orders_alert"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchase_orders"
      DROP COLUMN "alert_id",
      DROP COLUMN "rejection_reason"
    `);
  }
}
