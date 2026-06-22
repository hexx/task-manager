export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
};

export type D1PreparedStatement = {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T>(colName?: string): Promise<T>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
};

export type D1Result = {
  success: boolean;
  meta: { changes: number };
};
