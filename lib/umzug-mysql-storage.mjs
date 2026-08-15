export class MySQLStorage {
  constructor ({ pool, tableName = 'schema_migrations' }) {
    this.pool = pool;
    this.tableName = tableName;
  }

  async ensureTable () {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        \`name\` VARCHAR(255) PRIMARY KEY,
        \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
  }

  async executed () {
    await this.ensureTable();
    const [rows] = await this.pool.query(
      `SELECT name FROM \`${this.tableName}\` ORDER BY name ASC`
    );
    return rows.map((r) => r.name);
  }

  async logMigration ({ name }) {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO \`${this.tableName}\` (name) VALUES (?)`,
      [name]
    );
  }

  async unlogMigration ({ name }) {
    await this.ensureTable();
    await this.pool.query(
      `DELETE FROM \`${this.tableName}\` WHERE name = ?`,
      [name]
    );
  }
}
