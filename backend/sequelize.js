import { Sequelize } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';

const sequelize = new Sequelize({
  dialect: PostgresDialect,
  database: 'auth',
  user: 'postgres',
  password: 'Mirka_cr7',
  host: 'localhost',
  port: 5432
});

export default sequelize;
