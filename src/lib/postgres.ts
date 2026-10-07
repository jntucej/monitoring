import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * PostgreSQL Connection Pool for Self-Hosted Architecture.
 * Provides singleton pool lifecycle, parameterized query helpers,
 * transaction execution with contextual auth (app.current_user_id),
 * and query builder compatibility.
 */

let poolInstance: Pool | null = null;

export function getPostgresPool(): Pool {
  if (typeof window !== "undefined") {
    throw new Error("PostgreSQL pool cannot be accessed from client-side code");
  }

  if (!poolInstance) {
    const pg = eval('require')("pg");
    const PgPool = pg.Pool || pg.default?.Pool;
    const connectionString =
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER || "postgres"}:${encodeURIComponent(
        process.env.POSTGRES_PASSWORD || "postgres"
      )}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${
        process.env.POSTGRES_DB || "gate_monitor"
      }`;

    const instance = new PgPool({
      connectionString,
      max: parseInt(process.env.PG_MAX_POOL_SIZE || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        process.env.PG_SSL === "true"
          ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined,
    }) as Pool;

    instance.on("error", (err: any) => {
      console.error("[PostgreSQL Pool Error]", err);
    });

    poolInstance = instance;
  }

  return poolInstance!;
}

/**
 * Execute a parameterized query with automatic client management.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === "true") {
      console.log(`[SQL Query] (${duration}ms) ${text} -- params:`, params);
    }
    return result;
  } catch (err: any) {
    console.error(`[SQL Error] Query: ${text} | Params:`, params, "| Error:", err.message);
    throw err;
  }
}

/**
 * Execute a unit of work within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * Optionally sets app.current_user_id for audit logs and trigger compatibility.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options?: { currentUserId?: string }
): Promise<T> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (options?.currentUserId) {
      await client.query("SET LOCAL app.current_user_id = $1", [options.currentUserId]);
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[PostgreSQL Rollback Error]", rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fluent Query Builder interface providing compatibility for incremental
 * migration away from Supabase PostgREST without breaking API routes.
 */
export interface FilterCondition {
  column: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "IS" | "NOT_IS";
  value: any;
  rawClause?: string;
}

export class PostgresQueryBuilder<T = any> {
  private tableName: string;
  private selectColumns: string = "*";
  private rawColumns: string = "*";
  private embeddedRelations: string[] = [];
  private filters: FilterCondition[] = [];
  private orClauses: string[] = [];
  private orderClause?: string;
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private countMode: boolean = false;
  private headOnly: boolean = false;
  private pendingMutation?: { type: "insert" | "update" | "delete" | "upsert"; data?: any; options?: any };

  constructor(table: string) {
    this.tableName = table;
  }

  select(columns: string = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    this.rawColumns = columns;
    if (options?.count) {
      this.countMode = true;
    }
    if (options?.head) {
      this.headOnly = true;
    }

    const relationMatches = columns.match(/([a-zA-Z0-9_]+)\s*\(\*\)/g);
    if (relationMatches) {
      this.embeddedRelations = relationMatches.map(m => m.replace(/\s*\(\*\)/, "").trim());
    }

    let clean = columns
      .replace(/[a-zA-Z0-9_]+:[a-zA-Z0-9_!]+\s*\([^)]*\)/g, "")
      .replace(/[a-zA-Z0-9_]+\s*\([^)]*\)/g, "")
      .replace(/,\s*,/g, ",")
      .replace(/^,\s*|\s*,$/g, "")
      .trim();

    this.selectColumns = clean.length > 0 ? clean : "*";
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: "=", value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: "!=", value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, op: ">", value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, op: ">=", value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, op: "<", value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, op: "<=", value });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, op: "LIKE", value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, op: "ILIKE", value: pattern });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, op: "IN", value: values });
    return this;
  }

  is(column: string, value: null | boolean) {
    this.filters.push({ column, op: "IS", value });
    return this;
  }

  not(column: string, op: string, value: any) {
    if (op === "is" && value === null) {
      this.filters.push({ column, op: "NOT_IS", value: null });
    } else if (op === "eq") {
      this.filters.push({ column, op: "!=", value });
    } else if (op === "in") {
      const formatted = Array.isArray(value) ? value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(", ") : "NULL";
      this.filters.push({ column, op: "=" as any, value: null, rawClause: `${column} NOT IN (${formatted})` });
    } else {
      this.filters.push({ column, op: "!=", value });
    }
    return this;
  }

  or(filterString: string) {
    this.orClauses.push(filterString);
    return this;
  }

  filter(column: string, op: string, value: any) {
    switch (op) {
      case "eq": return this.eq(column, value);
      case "neq": return this.neq(column, value);
      case "gt": return this.gt(column, value);
      case "gte": return this.gte(column, value);
      case "lt": return this.lt(column, value);
      case "lte": return this.lte(column, value);
      case "like": return this.like(column, value);
      case "ilike": return this.ilike(column, value);
      case "in": return this.in(column, Array.isArray(value) ? value : [value]);
      case "is": return this.is(column, value);
      default: return this.eq(column, value);
    }
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? "DESC" : "ASC";
    this.orderClause = `ORDER BY ${column} ${dir}`;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this.execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this.execute();
  }

  private buildWhereClause(params: any[]): string {
    if (this.filters.length === 0) return "";
    const clauses = this.filters.map((f) => {
      if (f.op === "IN") {
        if (!Array.isArray(f.value) || f.value.length === 0) {
          return "1=0";
        }
        const placeholders = f.value.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `${f.column} IN (${placeholders.join(", ")})`;
      }
      if (f.op === "IS") {
        return `${f.column} IS ${f.value === null ? "NULL" : f.value ? "TRUE" : "FALSE"}`;
      }
      params.push(f.value);
      return `${f.column} ${f.op} $${params.length}`;
    });
    return `WHERE ${clauses.join(" AND ")}`;
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const params: any[] = [];
      const where = this.buildWhereClause(params);
      let sql = `SELECT ${this.selectColumns} FROM ${this.tableName} ${where}`;
      if (this.orderClause) sql += ` ${this.orderClause}`;
      if (this.limitCount !== undefined) sql += ` LIMIT ${this.limitCount}`;
      if (this.offsetCount !== undefined) sql += ` OFFSET ${this.offsetCount}`;

      const res = await query(sql, params);

      if (this.isSingle) {
        if (res.rows.length === 0) {
          return { data: null, error: { message: "Row not found", code: "PGRST116" } };
        }
        return { data: res.rows[0], error: null };
      }

      if (this.isMaybeSingle) {
        return { data: res.rows[0] || null, error: null };
      }

      return { data: res.rows, error: null, count: res.rowCount ?? undefined };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async upsert(rows: Record<string, any> | Record<string, any>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    const list = Array.isArray(rows) ? rows : [rows];
    if (list.length === 0) return { data: [], error: null };
    const keys = Object.keys(list[0]);
    const params: any[] = [];
    const valueTuples = list.map((row) => {
      const tuple = keys.map((k) => {
        params.push(row[k]);
        return `$${params.length}`;
      });
      return `(${tuple.join(", ")})`;
    });
    const conflictCol = options?.onConflict || "id";
    let sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES ${valueTuples.join(", ")}`;
    if (options?.ignoreDuplicates) {
      sql += ` ON CONFLICT (${conflictCol}) DO NOTHING`;
    } else {
      const updateSet = keys.filter(k => k !== conflictCol).map(k => `${k} = EXCLUDED.${k}`).join(", ");
      sql += updateSet.length > 0 ? ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}` : ` ON CONFLICT (${conflictCol}) DO NOTHING`;
    }
    sql += " RETURNING *";
    try {
      const res = await query(sql, params);
      const data = Array.isArray(rows) ? res.rows : res.rows[0];
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  async insert(rows: Record<string, any> | Record<string, any>[]) {
    const list = Array.isArray(rows) ? rows : [rows];
    if (list.length === 0) return { data: [], error: null };

    const keys = Object.keys(list[0]);
    const params: any[] = [];
    const valueTuples = list.map((row) => {
      const tuple = keys.map((k) => {
        params.push(row[k]);
        return `$${params.length}`;
      });
      return `(${tuple.join(", ")})`;
    });

    const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES ${valueTuples.join(", ")} RETURNING *`;
    try {
      const res = await query(sql, params);
      const data = Array.isArray(rows) ? res.rows : res.rows[0];
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  async update(values: Record<string, any>) {
    const params: any[] = [];
    const setClauses = Object.keys(values).map((k) => {
      params.push(values[k]);
      return `${k} = $${params.length}`;
    });

    const where = this.buildWhereClause(params);
    const sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")} ${where} RETURNING *`;
    try {
      const res = await query(sql, params);
      return { data: res.rows, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  async delete() {
    const params: any[] = [];
    const where = this.buildWhereClause(params);
    const sql = `DELETE FROM ${this.tableName} ${where} RETURNING *`;
    try {
      const res = await query(sql, params);
      return { data: res.rows, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }
}

/**
 * Self-Hosted DB client providing fluent query interface and direct pool access.
 */
export const db = {
  from: <T = any>(table: string) => new PostgresQueryBuilder<T>(table),
  query,
  withTransaction,
  getPool: getPostgresPool,
};

export default db;
