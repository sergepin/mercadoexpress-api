import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUnaccentExtension1740000000002
  implements MigrationInterface
{
  name = 'EnableUnaccentExtension1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
