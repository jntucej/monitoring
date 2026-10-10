import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * PostgreSQL Connection Pool for Self-Hosted Architecture.
 */
let poolInstance: Pool | null = null;
let pgModule: any = null;

async function getPgModule() {
  if (!pgModule) {
    pgModule = await import("pg");
  }
  return pgModule;
}

export async function getPostgresPool(): Promise<Pool> {
  if (typeof window !== "undefined") {
    throw new Error("PostgreSQL pool cannot be accessed from client-side code");
  }

  if (!poolInstance) {
    const pg = await getPgModule();
    const PgPool = pg.Pool || pg.default?.Pool;
    const connectionString =
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER || "postgres"}:${encodeURIComponent(
        process.env.POSTGRES_PASSWORD || "postgres"
      )}@${process.env.POSTGRES_HOST || "127.0.0.1"}:${process.env.POSTGRES_PORT || "5432"}/${
        process.env.POSTGRES_DB || "gate_monitor"
      }`;

    const instance = new PgPool({
      connectionString,
      max: parseInt(process.env.PG_MAX_POOL_SIZE || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 30000,
      ssl:
        process.env.PG_SSL === "true"
          ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined,
    }) as Pool;

    instance.on("error", (err: any, client: any) => {
      console.error("[PostgreSQL Pool Error]", {
        err,
        client: client ? "idle" : "unknown",
      });
    });

    poolInstance = instance;
  }

  return poolInstance!;
}

/**
 * Execute a parameterized query using a fast pool connection (no audit context).
 */
export async function poolQuery<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = await getPostgresPool();
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    console.error(`[SQL Error] Query: ${text} | Params:`, params, "| Error:", err.message);
    throw err;
  }
}

/**
 * Execute a parameterized query with established user context for RLS.
 * Manages its own connection to ensure GUC isolation.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = [],
  options?: { currentUserId?: string }
): Promise<QueryResult<T>> {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    if (options?.currentUserId) {
      await client.query("SELECT set_config('app.current_user_id', $1, false)", [options.currentUserId]);
    }
    return await client.query<T>(text, params);
  } catch (err: any) {
    console.error(`[SQL Error] Query: ${text} | Params:`, params, "| Error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a unit of work within a database transaction.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options?: { currentUserId?: string }
): Promise<T> {
  const pool = await getPostgresPool();
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

interface EmbeddedRelation {
  alias: string;
  targetTable: string;
  fields: string[];
  inner?: boolean;
  nested?: EmbeddedRelation[];
}

export class PostgresQueryBuilder<T = any> {
  private static fkCache = new Map<string, any[]>();
  
  private static async loadForeignKeys(table: string): Promise<any[]> {
    if (this.fkCache.has(table)) return this.fkCache.get(table)!;
    
    // Using global query function (assumed accessible in scope)
    const { rows } = await query(`
      SELECT kcu.column_name AS from_column, ccu.table_name AS to_table, ccu.column_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `, [table]);
    this.fkCache.set(table, rows);
    return rows;
  }

  private tableName: string;
  private selectColumns: string = "*";
  private rawColumns: string = "*";
  private embeddedRelations: EmbeddedRelation[] = [];
  private filters: FilterCondition[] = [];
  private orClauses: Array<{ filter: string; foreignTable?: string }> = [];
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

    this.embeddedRelations = this.parseSelectRelations(columns);

    let clean = columns
      .replace(/[a-zA-Z0-9_]+:[a-zA-Z0-9_!]+\([^)]*(?:\([^)]*\))*[^)]*\)/g, "")
      .replace(/[a-zA-Z0-9_!]+\([^)]*(?:\([^)]*\))*[^)]*\)/g, "")
      .replace(/,\s*,+/g, ",")
      .trim()
      .replace(/^,+|,+$/g, "")
      .trim();

    this.selectColumns = clean.length > 0 ? clean : "*";
    return this;
  }

  private parseSelectRelations(cols: string): EmbeddedRelation[] {
    const relations: EmbeddedRelation[] = [];
    let depth = 0;
    let currentRelStart = -1;
    let header = "";
    
    for (let i = 0; i < cols.length; i++) {
      const char = cols[i];
      if (char === '(') {
        if (depth === 0) {
          const prefix = cols.slice(0, i);
          const lastComma = prefix.lastIndexOf(',');
          header = prefix.slice(lastComma + 1).trim();
          currentRelStart = i + 1;
        }
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0 && currentRelStart !== -1) {
          const innerContent = cols.slice(currentRelStart, i);
          let alias = "";
          let targetTable = header;
          let isInner = false;
          
          if (header.includes(':')) {
            const parts = header.split(':');
            alias = parts[0].trim();
            targetTable = parts[1].trim();
          }
          if (targetTable.includes('!')) {
            const parts = targetTable.split('!');
            targetTable = parts[0].trim();
            if (parts.some(p => p.toLowerCase() === 'inner')) {
              isInner = true;
            }
          }
          if (!alias) {
            alias = targetTable;
          }

          const nested = this.parseSelectRelations(innerContent);
          const cleanSub = innerContent
            .replace(/[a-zA-Z0-9_]+:[a-zA-Z0-9_!]+\([^)]*\)/g, "")
            .replace(/[a-zA-Z0-9_!]+\([^)]*\)/g, "")
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          relations.push({
            alias,
            targetTable,
            fields: cleanSub.length > 0 ? cleanSub : ["*"],
            inner: isInner,
            nested,
          });

          currentRelStart = -1;
          header = "";
        }
      }
    }

    return relations;
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

  or(filterString: string, options?: { foreignTable?: string }) {
    this.orClauses.push({ filter: filterString, foreignTable: options?.foreignTable });
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
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  private parsePostgrestOrClause(clauseStr: string, params: any[], foreignTable?: string): string[] {
    const tokens = clauseStr.split(/,(?![^()]*\))/).map((t) => t.trim()).filter(Boolean);
    const sqlParts: string[] = [];
    const prefix = foreignTable ? `${foreignTable}.` : "";
    for (const token of tokens) {
      const match = token.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.(.*)$/);
      if (match) {
        const [, col, op, val] = match;
        let cleanVal: any = val;
        if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) cleanVal = cleanVal.slice(1, -1);
        else if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) cleanVal = cleanVal.slice(1, -1);
        const colRef = `${prefix}${col}`;
        switch (op.toLowerCase()) {
          case "eq": params.push(cleanVal); sqlParts.push(`${colRef} = $${params.length}`); break;
          case "neq": params.push(cleanVal); sqlParts.push(`${colRef} != $${params.length}`); break;
          case "ilike": params.push(cleanVal); sqlParts.push(`${colRef} ILIKE $${params.length}`); break;
          case "like": params.push(cleanVal); sqlParts.push(`${colRef} LIKE $${params.length}`); break;
          case "gt": params.push(cleanVal); sqlParts.push(`${colRef} > $${params.length}`); break;
          case "gte": params.push(cleanVal); sqlParts.push(`${colRef} >= $${params.length}`); break;
          case "lt": params.push(cleanVal); sqlParts.push(`${colRef} < $${params.length}`); break;
          case "lte": params.push(cleanVal); sqlParts.push(`${colRef} <= $${params.length}`); break;
          case "is": if (cleanVal === "null") sqlParts.push(`${colRef} IS NULL`); else if (cleanVal === "true") sqlParts.push(`${colRef} IS TRUE`); else if (cleanVal === "false") sqlParts.push(`${colRef} IS FALSE`); break;
          default: params.push(cleanVal); sqlParts.push(`${colRef} = $${params.length}`); break;
        }
      } else if (/^[a-zA-Z0-9_.]+\s*(=|!=|>|<|>=|<=|ILIKE|LIKE|IS)\s*.+$/i.test(token)) {
        const parts = token.match(/^([a-zA-Z0-9_.]+)\s*(=|!=|>|<|>=|<=|ILIKE|LIKE|IS)\s*(.+)$/i);
        if (parts) {
          const [, colRef, op, val] = parts;
          let cleanVal: any = val.trim();
          if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) cleanVal = cleanVal.slice(1, -1);
          else if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) cleanVal = cleanVal.slice(1, -1);
          if (op.toUpperCase() === "IS") {
            if (cleanVal === "null") sqlParts.push(`${colRef} IS NULL`);
            else if (cleanVal === "true") sqlParts.push(`${colRef} IS TRUE`);
            else if (cleanVal === "false") sqlParts.push(`${colRef} IS FALSE`);
            else { params.push(cleanVal); sqlParts.push(`${colRef} IS $${params.length}`); }
          } else {
            params.push(cleanVal);
            sqlParts.push(`${colRef} ${op.toUpperCase()} $${params.length}`);
          }
        }
      }
    }
    return sqlParts;
  }

  private static FK_MAP: Record<string, Record<string, string>> = {
    movement_logs: {
      users: "user_id",
      gates: "gate_id",
    },
    gate_passes: {
      users: "user_id",
    },
    visitor_logs: {
      users: "user_id",      // visitor
      host: "host_user_id",  // host (alias)
    },
    sessions: {
      users: "user_id",
    },
    student_details: { users: "user_id" },
    employee_details: { users: "user_id" },
  };

  private buildWhereClause(params: any[]): string {
    if (this.filters.length === 0 && this.orClauses.length === 0) return "";
    const whereParts: string[] = [];
    for (const f of this.filters) {
      if (f.rawClause) { whereParts.push(f.rawClause); continue; }

      // Detect "foreignTable.column" filters and rewrite as subquery
      if (f.column.includes(".")) {
        const [ft, col] = f.column.split(".");
        const fk = PostgresQueryBuilder.FK_MAP[this.tableName]?.[ft];
        if (!fk) {
          // Fallback: treat as raw and hope the join exists
          params.push(f.value);
          whereParts.push(`${f.column} ${f.op} $${params.length}`);
          continue;
        }
        params.push(f.value);
        const placeholder = `$${params.length}`;
        whereParts.push(
          `${this.tableName}.${fk} IN (SELECT id FROM ${ft} WHERE ${col} ${f.op} ${placeholder})`
        );
        continue;
      }

      if (f.op === "IN") {
        if (!Array.isArray(f.value) || f.value.length === 0) {
          whereParts.push("1=0");
        } else {
          const placeholders = f.value.map((v) => { params.push(v); return `$${params.length}`; });
          whereParts.push(`${f.column} IN (${placeholders.join(", ")})`);
        }
        continue;
      }
      if (f.op === "IS") {
        whereParts.push(`${f.column} IS ${f.value === null ? "NULL" : f.value ? "TRUE" : "FALSE"}`);
        continue;
      }
      if (f.op === "NOT_IS") {
        whereParts.push(`${f.column} IS NOT ${f.value === null ? "NULL" : f.value ? "TRUE" : "FALSE"}`);
        continue;
      }
      params.push(f.value);
      whereParts.push(`${f.column} ${f.op} $${params.length}`);
    }
    if (this.orClauses.length > 0) {
      for (const orObj of this.orClauses) {
        if (orObj.foreignTable) {
          const parsed = this.parsePostgrestOrClause(orObj.filter, params, orObj.foreignTable);
          if (parsed.length > 0) {
            const fk = PostgresQueryBuilder.FK_MAP[this.tableName]?.[orObj.foreignTable];
            if (fk) {
              whereParts.push(
                `${this.tableName}.${fk} IN (SELECT id FROM ${orObj.foreignTable} WHERE ${parsed.join(" OR ")})`
              );
            }
          }
        } else {
          const parsed = this.parsePostgrestOrClause(orObj.filter, params);
          if (parsed.length > 0) whereParts.push(`(${parsed.join(" OR ")})`);
        }
      }
    }
    return whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  }

  private buildSelectClause(): string {
    let baseCols = this.selectColumns;
    if (baseCols === "*" && this.embeddedRelations.length > 0) baseCols = `${this.tableName}.*`;
    if (this.embeddedRelations.length === 0) return baseCols;
    
    const buildRelationSubquery = (rel: EmbeddedRelation, parentTable: string): string => {
      const { alias, targetTable, fields, nested } = rel;
      let joinCondition = "";
      if (parentTable === "movement_logs" && targetTable === "users") joinCondition = `users.id = ${parentTable}.user_id`;
      else if (parentTable === "movement_logs" && targetTable === "gates") joinCondition = `gates.id = ${parentTable}.gate_id`;
      else if (parentTable === "gate_passes" && targetTable === "users") joinCondition = `users.id = ${parentTable}.user_id`;
      else if (parentTable === "student_details" && targetTable === "users") joinCondition = `users.id = ${parentTable}.user_id`;
      else if (parentTable === "users" && targetTable === "student_details") joinCondition = `student_details.user_id = ${parentTable}.id`;
      else if (parentTable === "users" && targetTable === "employee_details") joinCondition = `employee_details.user_id = ${parentTable}.id`;
      else joinCondition = `${targetTable}.id = ${parentTable}.${targetTable.replace(/s$/, "")}_id`;

      const selectColsList = fields.includes("*") ? `${targetTable}.*` : fields.map((f) => `${targetTable}."${f}"`).join(", ");
      
      const nestedSubqueries: string[] = [];
      if (nested && nested.length > 0) {
        for (const n of nested) {
          nestedSubqueries.push(buildRelationSubquery(n, targetTable));
        }
      }
      
      const allSelected = nestedSubqueries.length > 0 ? `${selectColsList}, ${nestedSubqueries.join(", ")}` : selectColsList;
      return `(SELECT row_to_json(rel_sub) FROM (SELECT ${allSelected} FROM ${targetTable} WHERE ${joinCondition} LIMIT 1) rel_sub) AS "${alias}"`;
    };

    const relationSubqueries: string[] = [];
    for (const rel of this.embeddedRelations) {
      relationSubqueries.push(buildRelationSubquery(rel, this.tableName));
    }
    const cleanBase = baseCols.replace(/,+$/, "").trim();
    return cleanBase;
  }

  insert(rows: Record<string, any> | Record<string, any>[]) {
    this.pendingMutation = { type: "insert", data: rows };
    return this;
  }

  update(values: Record<string, any>) {
    this.pendingMutation = { type: "update", data: values };
    return this;
  }

  delete() {
    this.pendingMutation = { type: "delete" };
    return this;
  }

  upsert(rows: Record<string, any> | Record<string, any>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.pendingMutation = { type: "upsert", data: rows, options };
    return this;
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      if (this.pendingMutation?.type === "insert") {
        const raw = this.pendingMutation.data;
        const list = Array.isArray(raw) ? raw : [raw];
        if (list.length === 0) return { data: [], error: null };
        const keys = Object.keys(list[0]);
        const params: any[] = [];
        const valueTuples = list.map((row) => {
          const tuple = keys.map((k) => { params.push(row[k]); return `$${params.length}`; });
          return `(${tuple.join(", ")})`;
        });
        const returningCols = this.selectColumns === "*" ? "*" : this.selectColumns;
        const sql = `INSERT INTO ${this.tableName} (${keys.map((k) => `"${k}"`).join(", ")}) VALUES ${valueTuples.join(", ")} RETURNING ${returningCols}`;
        const res = await query(sql, params);
        if (this.isSingle || this.isMaybeSingle || !Array.isArray(raw)) {
          const singleRow = res.rows[0] || null;
          if (this.isSingle && !singleRow) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          return { data: singleRow, error: null };
        }
        return { data: res.rows, error: null };
      }
      if (this.pendingMutation?.type === "update") {
        const values = this.pendingMutation.data || {};
        const keys = Object.keys(values);
        if (keys.length === 0) return { data: [], error: null };
        const params: any[] = [];
        const setClauses = keys.map((k) => { params.push(values[k]); return `"${k}" = $${params.length}`; });
        const where = this.buildWhereClause(params);
        const returningCols = this.selectColumns === "*" ? "*" : this.selectColumns;
        const sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")} ${where} RETURNING ${returningCols}`;
        const res = await query(sql, params);
        if (this.isSingle || this.isMaybeSingle) {
          const singleRow = res.rows[0] || null;
          if (this.isSingle && !singleRow) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          return { data: singleRow, error: null };
        }
        return { data: res.rows, error: null };
      }
      if (this.pendingMutation?.type === "delete") {
        const params: any[] = [];
        const where = this.buildWhereClause(params);
        const returningCols = this.selectColumns === "*" ? "*" : this.selectColumns;
        const sql = `DELETE FROM ${this.tableName} ${where} RETURNING ${returningCols}`;
        const res = await query(sql, params);
        if (this.isSingle || this.isMaybeSingle) return { data: res.rows[0] || null, error: null };
        return { data: res.rows, error: null };
      }
      if (this.pendingMutation?.type === "upsert") {
        const raw = this.pendingMutation.data;
        const list = Array.isArray(raw) ? raw : [raw];
        if (list.length === 0) return { data: [], error: null };
        const keys = Object.keys(list[0]);
        const params: any[] = [];
        const valueTuples = list.map((row) => {
          const tuple = keys.map((k) => { params.push(row[k]); return `$${params.length}`; });
          return `(${tuple.join(", ")})`;
        });
        const conflictCol = this.pendingMutation.options?.onConflict || "id";
        const returningCols = this.selectColumns === "*" ? "*" : this.selectColumns;
        let sql = `INSERT INTO ${this.tableName} (${keys.map((k) => `"${k}"`).join(", ")}) VALUES ${valueTuples.join(", ")}`;
        if (this.pendingMutation.options?.ignoreDuplicates) {
          sql += ` ON CONFLICT (${conflictCol}) DO NOTHING`;
        } else {
          const updateSet = keys.filter((k) => k !== conflictCol).map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");
          sql += updateSet.length > 0 ? ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}` : ` ON CONFLICT (${conflictCol}) DO NOTHING`;
        }
        sql += ` RETURNING ${returningCols}`;
        const res = await query(sql, params);
        if (this.isSingle || this.isMaybeSingle || !Array.isArray(raw)) {
          const singleRow = res.rows[0] || null;
          if (this.isSingle && !singleRow) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          return { data: singleRow, error: null };
        }
        return { data: res.rows, error: null };
      }

      const params: any[] = [];
      const where = this.buildWhereClause(params);
      if (this.countMode && this.headOnly) {
        const countSql = `SELECT COUNT(*)::int as count FROM ${this.tableName} ${where}`;
        const countRes = await query(countSql, params);
        return { data: null, count: countRes.rows[0]?.count ?? 0, error: null };
      }
      const selectCols = this.buildSelectClause();
      let sql = `SELECT ${selectCols} FROM ${this.tableName} ${where}`;
      if (this.orderClause) sql += ` ${this.orderClause}`;
      if (this.limitCount !== undefined) sql += ` LIMIT ${this.limitCount}`;
      if (this.offsetCount !== undefined) sql += ` OFFSET ${this.offsetCount}`;
      const res = await query(sql, params);
      if (this.isSingle) {
        if (res.rows.length === 0) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
        return { data: res.rows[0], error: null };
      }
      if (this.isMaybeSingle) return { data: res.rows[0] || null, error: null };
      let totalCount: number | undefined = undefined;
      if (this.countMode) {
        const countSql = `SELECT COUNT(*)::int as count FROM ${this.tableName} ${where}`;
        const countRes = await query(countSql, params.slice(0, where ? params.length : 0));
        totalCount = countRes.rows[0]?.count ?? res.rowCount ?? 0;
      }
      return { data: res.rows, error: null, count: totalCount ?? res.rowCount ?? undefined };
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

}

export const authAdmin = {
  async createUser(attributes: { email: string; password?: string; user_metadata?: Record<string, any> | null; app_metadata?: Record<string, any> | null; email_confirm?: boolean; phone?: string; role?: string; [key: string]: unknown; }) {
    const safeAttributes = {
      ...attributes,
      user_metadata: attributes.user_metadata ?? {},
      app_metadata: attributes.app_metadata ?? {},
    };
    const crypto = await import("crypto");
    const bcrypt = await import("bcryptjs");
    const id = crypto.randomUUID();
    const email = safeAttributes.email.toLowerCase().trim();
    const name = safeAttributes.user_metadata?.name || safeAttributes.user_metadata?.full_name || email.split("@")[0];
    const role = safeAttributes.role || safeAttributes.user_metadata?.role || "student";
    const passwordHash = safeAttributes.password ? await bcrypt.hash(safeAttributes.password, 10) : null;
    const uniqueId = safeAttributes.user_metadata?.unique_id || email.split("@")[0].toUpperCase();
    const handle = (uniqueId || name || `user_${id.replace(/-/g, "").slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9_]/g, "_");
    try {
      const res = await query(
        `INSERT INTO users (id, unique_id, handle, email, name, role, status, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, NOW())
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           handle = COALESCE(users.handle, EXCLUDED.handle),
           password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
         RETURNING id, unique_id, handle, email, name, role, status, created_at`,
        [id, uniqueId, handle, email, name, role, passwordHash]
      );
      const user = res.rows[0] || { id, email, name, role, handle, unique_id: uniqueId };
      return { data: { user: { id: user.id, email: user.email, user_metadata: { ...safeAttributes.user_metadata, name: user.name, role: user.role, handle: user.handle } } }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
  },
  async deleteUser(userId: string) {
    try { await query("UPDATE users SET deleted_at = NOW() WHERE id = $1", [userId]); return { data: null, error: null }; } catch (err: any) { return { data: null, error: { message: err.message, code: err.code } }; }
  },
  async updateUserById(userId: string, attributes: { password?: string; email?: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any>; }) {
    try {
      const updates: string[] = [];
      const params: any[] = [userId];
      if (attributes.password) { const bcrypt = await import("bcryptjs"); const hash = await bcrypt.hash(attributes.password, 10); params.push(hash); updates.push(`password_hash = $${params.length}`); }
      if (attributes.email) { params.push(attributes.email.toLowerCase().trim()); updates.push(`email = $${params.length}`); }
      if (attributes.user_metadata?.name) { params.push(attributes.user_metadata.name); updates.push(`name = $${params.length}`); }
      if (updates.length > 0) {
        updates.push("updated_at = NOW()");
        const res = await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $1 RETURNING id, unique_id, email, name, role, status`, params);
        return { data: { user: res.rows[0] || { id: userId } }, error: null };
      }
      return { data: { user: { id: userId } }, error: null };
    } catch (err: any) { return { data: null, error: { message: err.message, code: err.code } }; }
  },
  async inviteUserByEmail(email: string, options?: { data?: Record<string, any> }) { return this.createUser({ email, user_metadata: options?.data }); },
  async listUsers() { try { const res = await query("SELECT id, unique_id, email, name, role, status, created_at FROM users"); return { data: { users: res.rows }, error: null }; } catch (err: any) { return { data: { users: [] }, error: { message: err.message, code: err.code } }; } },
  async getUserById(userId: string) { try { const res = await query("SELECT id, unique_id, email, name, role, status, created_at FROM users WHERE id = $1 LIMIT 1", [userId]); if (res.rows.length === 0) return { data: null, error: { message: "User not found", code: "NOT_FOUND" } }; return { data: { user: res.rows[0] }, error: null }; } catch (err: any) { return { data: null, error: { message: err.message, code: err.code } }; } },
  async signOut(userIdOrToken: string) {
    try {
      await query(`UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = $1 OR user_id::text = $1 OR id::text = $1`, [userIdOrToken]);
      await query("UPDATE users SET session_version = session_version + 1 WHERE id::text = $1", [userIdOrToken]);
      return { error: null };
    } catch (err: any) { return { error: { message: err.message } }; }
  },
};

const ALLOWED_RPC_FUNCTIONS = new Set([
  "resolve_login_identifier",
  "can_user_authenticate",
  "invalidate_all_user_sessions",
  "get_current_occupancy",
  "verify_pin",
  "validate_gate_pass",
  "process_gate_scan"
]);

/**
 * Self-Hosted DB client providing fluent query interface and direct pool access.
 */
export const db = {
  from: <T = any>(table: string) => new PostgresQueryBuilder<T>(table),
  query,
  withTransaction,
  getPool: getPostgresPool,
  rpc: async (fnName: string, args: Record<string, any> = {}) => {
    try {
      if (fnName === "resolve_login_identifier") {
        const loginId = args.p_login_id || args.login_id || args.identifier || "";
        const res = await query(`SELECT email FROM users WHERE LOWER(email) = LOWER($1) OR UPPER(unique_id) = UPPER($1) OR LOWER(login_identifier) = LOWER($1) OR LOWER(handle) = LOWER($1) LIMIT 1`, [loginId.trim()]);
        return { data: res.rows[0]?.email || null, error: null };
      }
      if (fnName === "can_user_authenticate") {
        const userId = args.p_user_id || args.user_id || args.userId || "";
        const res = await query("SELECT status FROM users WHERE id::text = $1 LIMIT 1", [userId]);
        return { data: res.rows[0]?.status === "ACTIVE", error: null };
      }
      if (fnName === "invalidate_all_user_sessions") {
        const userId = args.p_user_id || args.user_id || args.userId || "";
        await query("UPDATE users SET session_version = session_version + 1, handle = gen_random_uuid()::text WHERE id::text = $1", [userId]);
        return { data: true, error: null };
      }
      if (fnName === "process_gate_scan") {
        const res = await query(
          `SELECT * FROM process_gate_scan(
             $1::uuid, $2::uuid, $3::varchar, $4::varchar,
             $5::uuid, $6::varchar, $7::uuid, $8::varchar,
             $9::timestamptz, $10::boolean, $11::int
           )`,
          [
            args.p_scan_id, args.p_user_id, args.p_direction, args.p_reason,
            args.p_gate_id, args.p_gate_name, args.p_operator_id, args.p_operator_name,
            args.p_timestamp, args.p_is_manual, args.p_dup_window_minutes ?? 5,
          ]
        );
        return { data: res.rows, error: null };
      }
      if (!ALLOWED_RPC_FUNCTIONS.has(fnName)) {
        return { data: null, error: { message: `Function ${fnName} is not permitted for RPC execution`, code: "FORBIDDEN_RPC" } };
      }
      const keys = Object.keys(args);
      const params = keys.map((k) => args[k]);
      const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `SELECT * FROM ${fnName}(${placeholders})`;
      const res = await query(sql, params);
      return { data: res.rows.length === 1 ? res.rows[0][fnName] ?? res.rows[0] : res.rows, error: null };
    } catch (err: any) { return { data: null, error: { message: err.message, code: err.code } }; }
  },
  auth: {
    admin: authAdmin,
    getUser: async (token?: string) => {
      if (!token) return { data: { user: null }, error: { message: "No token provided" } };
      try {
        const { verifyAccessToken } = await import("./auth-token");
        const payload = await verifyAccessToken(token);
        if (!payload?.sub) return { data: { user: null }, error: { message: "Invalid token" } };
        const res = await query("SELECT id, unique_id, email, name, role, status FROM users WHERE id = $1 LIMIT 1", [payload.sub]);
        return { data: { user: res.rows[0] || null }, error: null };
      } catch (err: any) { return { data: { user: null }, error: { message: err.message } }; }
    },
    signOut: async () => ({ error: null }),
  },
};

export default db;
