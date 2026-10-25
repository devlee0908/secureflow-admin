import { SqliteDatabaseAdapter } from './sqliteAdapter.js';
import { PostgresDatabaseAdapter } from './postgresAdapter.js';

/**
 * SecureFlow Unified Database Manager & Repository Facade
 * Dynamically switches between high-performance local SQLite (WAL Mode)
 * and Enterprise Multi-AZ PostgreSQL Cluster based on environment or configuration.
 */

class DatabaseManager {
  constructor() {
    this.sqliteAdapter = new SqliteDatabaseAdapter();
    this.postgresAdapter = new PostgresDatabaseAdapter();

    // Default engine: Postgres if configured via env, otherwise SQLite WAL
    const requestedEngine = process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
    this.activeEngine = requestedEngine === 'postgres' ? 'postgres' : 'sqlite';
  }

  getAdapter() {
    return this.activeEngine === 'postgres' ? this.postgresAdapter : this.sqliteAdapter;
  }

  setEngine(engineType) {
    if (engineType === 'postgres') {
      this.activeEngine = 'postgres';
    } else {
      this.activeEngine = 'sqlite';
    }
    return this.getEngineInfo();
  }

  getEngineInfo() {
    return this.getAdapter().getEngineInfo();
  }
}

export const dbManager = new DatabaseManager();

// Create dynamic proxy for dbService so calls automatically route to the active adapter
export const dbService = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === 'getEngineInfo') {
        return () => dbManager.getEngineInfo();
      }
      if (prop === 'switchEngine') {
        return (type) => dbManager.setEngine(type);
      }
      const adapter = dbManager.getAdapter();
      const value = adapter[prop];
      if (typeof value === 'function') {
        return value.bind(adapter);
      }
      return value;
    },
  }
);
