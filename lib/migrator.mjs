import fs from 'node:fs/promises';
import path from 'node:path';
import { Umzug } from 'umzug';
import { pool } from './db.mjs';
import { MySQLStorage } from './umzug-mysql-storage.mjs';
import logger from './logger.js';

export const migrator = new Umzug({
  migrations: {
    glob: ['migrations/*.up.sql', { cwd: process.cwd() }],
    resolve: ({ name, path: upPath }) => {
      const migrationName = name.replace(/\.up\.sql$/, '');
      const downPath = upPath.replace(/\.up\.sql$/, '.down.sql');

      return {
        name: migrationName,
        up: async () => {
          const sql = await fs.readFile(upPath, 'utf-8');
          await pool.query(sql);
        },
        down: async () => {
          try {
            await fs.access(downPath);
            const sql = await fs.readFile(downPath, 'utf-8');
            await pool.query(sql);
          } catch (err) {
            if (err.code === 'ENOENT') {
              throw new Error(
                `Can not rollback because '${path.basename(downPath)}' doesn't exist.`
              );
            }
            throw err;
          }
        }
      };
    }
  },
  storage: new MySQLStorage({ pool, tableName: 'schema_migrations' }),
  logger
});
