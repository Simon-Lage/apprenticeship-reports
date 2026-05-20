declare module 'better-sqlite3-multiple-ciphers' {
  type Statement = {
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => unknown;
  };

  class Database {
    constructor(path: string);

    exec(sql: string): void;

    pragma(sql: string): unknown;

    prepare(sql: string): Statement;

    close(): void;
  }

  export = Database;
}
