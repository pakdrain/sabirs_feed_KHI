import pg from "pg";
import { config } from "dotenv";

config();

const { Pool } = pg;

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

const localPool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "SFK",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",

  // ✅ FIX: Local pool timeouts
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const livePool = new Pool({
  host: process.env.LIVE_PGHOST || "84.16.235.111",
  port: Number(process.env.LIVE_PGPORT || 5432),
  database: process.env.LIVE_PGDATABASE || "SFK_WB",
  user: process.env.LIVE_PGUSER || "postgres",
  password: process.env.LIVE_PGPASSWORD || "",

  // ✅ FIX: Live pool timeouts (remote server ke liye zaroori)
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  statement_timeout: 120000, // 2 minutes per query
  query_timeout: 130000,
  max: 10,
});

localPool.on("error", (error) => {
  console.error("❌ Local PostgreSQL pool error:", error.message);
});

livePool.on("error", (error) => {
  console.error("❌ Live PostgreSQL pool error:", error.message);
});

// ============================================================
// SYNC CONFIGURATION
// ============================================================

const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 500;                // Process 500 rows per batch

// Safety overlap for timestamp-based updates.
const UPDATE_OVERLAP_MINUTES = 10;

// Missing-ID reconciliation:
// 12 cycles x 30 minutes = 6 hours.
const MISSING_ID_CHECK_EVERY = 12;

// ✅ FIX: Watchdog — agar sync 15 min se zyada le, force reset
const SYNC_WATCHDOG_MS = 15 * 60 * 1000;

// ============================================================
// TABLES
// ============================================================

const TABLES = [
  "wb_weighbridge",
  "wb_weighbridge_items_purchase",
  "gl_freight",
  "gl_freight_items",
  "gl_vouchers",
  "gl_voucher_accounts",
];

// ============================================================
// PRIMARY KEYS
// ============================================================

const PRIMARY_KEYS: Record<string, string> = {
  wb_weighbridge: "wb_id",
  wb_weighbridge_items_purchase: "wb_item_p_id",
  gl_freight: "freight_id",
  gl_freight_items: "freight_item_id",
  gl_vouchers: "voucher_id",
  gl_voucher_accounts: "voucher_account_id",
};

// ============================================================
// SYNC DATE COLUMNS
// ============================================================

const SYNC_DATE_COLUMNS: Record<string, string> = {
  wb_weighbridge: "last_updated_date",
  wb_weighbridge_items_purchase: "last_updated_date",
  gl_freight: "last_update_date",
  gl_freight_items: "last_update_date",
  gl_vouchers: "last_update_date",
  gl_voucher_accounts: "last_update_date",
};

// ============================================================
// SYNC STATE
// ============================================================

let syncCycle = 0;
let syncRunning = false;

// ============================================================
// HELPERS
// ============================================================

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

// ============================================================
// CHECK TABLE EXISTS
// ============================================================

async function tableExists(pool: pg.Pool, tableName: string) {
  const result = await pool.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS exists
    `,
    [tableName]
  );

  return result.rows[0]?.exists === true;
}

// ============================================================
// GET TABLE COLUMNS
// ============================================================

async function getColumns(pool: pg.Pool, tableName: string) {
  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
    `,
    [tableName]
  );

  return result.rows.map((row) => row.column_name);
}

// ============================================================
// GET LIVE LAST UPDATED DATE
// ============================================================

async function getLiveLastUpdatedDate(
  tableName: string,
  dateColumn: string
) {
  const result = await livePool.query(
    `
    SELECT MAX(${quoteIdentifier(dateColumn)}) AS last_date
    FROM ${quoteIdentifier(tableName)}
    `
  );

  return result.rows[0]?.last_date || null;
}

// ============================================================
// GET CHANGED LOCAL ROWS
// ============================================================

async function getChangedLocalRows(
  tableName: string,
  columns: string[],
  dateColumn: string
) {
  const quotedColumns = columns.map(quoteIdentifier).join(", ");

  const liveLastUpdatedDate = await getLiveLastUpdatedDate(
    tableName,
    dateColumn
  );

  let query: string;
  let values: unknown[] = [];

  if (liveLastUpdatedDate) {
    const overlapDate = new Date(
      new Date(liveLastUpdatedDate).getTime() -
        UPDATE_OVERLAP_MINUTES * 60 * 1000
    );

    query = `
      SELECT ${quotedColumns}
      FROM ${quoteIdentifier(tableName)}
      WHERE
        ${quoteIdentifier(dateColumn)} >= $1
        OR ${quoteIdentifier(dateColumn)} IS NULL
      ORDER BY
        ${quoteIdentifier(dateColumn)} ASC NULLS FIRST
    `;

    values = [overlapDate];
  } else {
    query = `
      SELECT ${quotedColumns}
      FROM ${quoteIdentifier(tableName)}
      ORDER BY
        ${quoteIdentifier(dateColumn)} ASC NULLS FIRST
    `;
  }

  const result = await localPool.query(query, values);

  return result.rows;
}

// ============================================================
// GET LOCAL PRIMARY KEYS
// ============================================================

async function getLocalPrimaryKeys(
  tableName: string,
  primaryKey: string
) {
  const result = await localPool.query(
    `
    SELECT ${quoteIdentifier(primaryKey)} AS id
    FROM ${quoteIdentifier(tableName)}
    WHERE ${quoteIdentifier(primaryKey)} IS NOT NULL
    ORDER BY ${quoteIdentifier(primaryKey)} ASC
    `
  );

  return result.rows.map((row) => String(row.id));
}

// ============================================================
// GET LIVE PRIMARY KEYS
// ============================================================

async function getLivePrimaryKeys(
  tableName: string,
  primaryKey: string
) {
  const result = await livePool.query(
    `
    SELECT ${quoteIdentifier(primaryKey)} AS id
    FROM ${quoteIdentifier(tableName)}
    WHERE ${quoteIdentifier(primaryKey)} IS NOT NULL
    ORDER BY ${quoteIdentifier(primaryKey)} ASC
    `
  );

  return result.rows.map((row) => String(row.id));
}

// ============================================================
// GET LOCAL ROWS BY PRIMARY KEYS
// ============================================================

async function getLocalRowsByPrimaryKeys(
  tableName: string,
  primaryKey: string,
  columns: string[],
  ids: string[]
) {
  if (ids.length === 0) return [];

  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");

  const result = await localPool.query(
    `
    SELECT ${quotedColumns}
    FROM ${quoteIdentifier(tableName)}
    WHERE ${quoteIdentifier(primaryKey)}
      IN (${placeholders})
    ORDER BY
      ${quoteIdentifier(primaryKey)} ASC
    `,
    ids
  );

  return result.rows;
}

// ============================================================
// UPSERT BATCH
// ✅ FIX: Single client + transaction
// ============================================================

async function upsertBatch(
  tableName: string,
  primaryKey: string,
  columns: string[],
  rows: any[]
) {
  if (rows.length === 0) return;

  if (columns.length === 0) {
    throw new Error(`${tableName}: No columns available for upsert`);
  }

  if (!columns.includes(primaryKey)) {
    throw new Error(`${tableName}: Primary key ${primaryKey} is missing`);
  }

  const quotedColumns = columns.map(quoteIdentifier).join(", ");

  const updateColumns = columns.filter(
    (column) => column !== primaryKey
  );

  if (updateColumns.length === 0) {
    throw new Error(`${tableName}: No columns available for update`);
  }

  const updateClause = updateColumns
    .map(
      (column) =>
        `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`
    )
    .join(", ");

  const values: unknown[] = [];
  const groups: string[] = [];

  for (const row of rows) {
    const placeholders = columns.map((column) => {
      values.push(row[column]);
      return `$${values.length}`;
    });

    groups.push(`(${placeholders.join(", ")})`);
  }

  const expectedParameters = rows.length * columns.length;

  if (values.length !== expectedParameters) {
    throw new Error(
      `${tableName}: Parameter mismatch. Expected ${expectedParameters}, got ${values.length}`
    );
  }

  // PostgreSQL extended-query protocol supports up to 65,535 parameters.
  if (values.length > 60000) {
    throw new Error(
      `${tableName}: Batch has too many parameters (${values.length}). Reduce BATCH_SIZE.`
    );
  }

  const query = `
    INSERT INTO ${quoteIdentifier(tableName)}
      (${quotedColumns})
    VALUES ${groups.join(", ")}
    ON CONFLICT (${quoteIdentifier(primaryKey)})
    DO UPDATE SET ${updateClause}
  `;

  const client = await livePool.connect();

  try {
    await client.query("BEGIN");

    await client.query({
      text: query,
      values,
    });

    await client.query("COMMIT");
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }

    console.error(
      `❌ ${tableName} upsert diagnostics:`,
      JSON.stringify({
        rowCount: rows.length,
        columnCount: columns.length,
        valueCount: values.length,
        firstPrimaryKey: rows[0]?.[primaryKey],
        error: error?.message,
      })
    );

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// NORMAL TIMESTAMP-BASED SYNC
// ============================================================

async function syncChangedRows(
  tableName: string,
  primaryKey: string,
  columns: string[],
  dateColumn: string
) {
  const changedRows = await getChangedLocalRows(
    tableName,
    columns,
    dateColumn
  );

  if (changedRows.length === 0) {
    console.log(`ℹ️ ${tableName}: No new or updated records`);
    return 0;
  }

  console.log(
    `📦 ${tableName}: ${changedRows.length} new/updated records found`
  );

  let processed = 0;

  for (
    let start = 0;
    start < changedRows.length;
    start += BATCH_SIZE
  ) {
    const batch = changedRows.slice(start, start + BATCH_SIZE);

    await upsertBatch(tableName, primaryKey, columns, batch);

    processed += batch.length;

    console.log(
      `   ↳ ${tableName}: ${processed}/${changedRows.length} processed`
    );
  }

  console.log(`✅ ${tableName}: ${processed} records synced`);

  return processed;
}

// ============================================================
// MISSING PRIMARY KEY RECONCILIATION
// ============================================================

async function reconcileMissingRecords(
  tableName: string,
  primaryKey: string,
  columns: string[]
) {
  console.log(
    `🔍 ${tableName}: Checking for records missing in Live...`
  );

  const [localIds, liveIds] = await Promise.all([
    getLocalPrimaryKeys(tableName, primaryKey),
    getLivePrimaryKeys(tableName, primaryKey),
  ]);

  console.log(`   Local ${tableName} records: ${localIds.length}`);
  console.log(`   Live ${tableName} records: ${liveIds.length}`);

  const liveIdSet = new Set(liveIds);

  const missingIds = localIds.filter(
    (id) => !liveIdSet.has(id)
  );

  if (missingIds.length === 0) {
    console.log(`✅ ${tableName}: No missing records in Live`);
    return 0;
  }

  console.log(
    `⚠️ ${tableName}: ${missingIds.length} records are missing in Live`
  );

  let processed = 0;

  for (
    let start = 0;
    start < missingIds.length;
    start += BATCH_SIZE
  ) {
    const batchIds = missingIds.slice(start, start + BATCH_SIZE);

    const rows = await getLocalRowsByPrimaryKeys(
      tableName,
      primaryKey,
      columns,
      batchIds
    );

    if (rows.length > 0) {
      await upsertBatch(tableName, primaryKey, columns, rows);
      processed += rows.length;
    }

    console.log(
      `   ↳ ${tableName}: ${processed}/${missingIds.length} missing records restored`
    );
  }

  console.log(
    `✅ ${tableName}: ${processed} missing records synced to Live`
  );

  return processed;
}

// ============================================================
// VALIDATE TABLE
// ============================================================

async function validateTable(tableName: string) {
  const primaryKey = PRIMARY_KEYS[tableName];
  const dateColumn = SYNC_DATE_COLUMNS[tableName];

  if (!primaryKey) {
    throw new Error(`Primary key missing for table: ${tableName}`);
  }

  if (!dateColumn) {
    throw new Error(`Sync date column missing for table: ${tableName}`);
  }

  const localExists = await tableExists(localPool, tableName);
  if (!localExists) {
    throw new Error(`Local table not found: ${tableName}`);
  }

  const liveExists = await tableExists(livePool, tableName);
  if (!liveExists) {
    throw new Error(`Live table not found: ${tableName}`);
  }

  const localColumns = await getColumns(localPool, tableName);
  const liveColumns = await getColumns(livePool, tableName);

  const columns = localColumns.filter((column) =>
    liveColumns.includes(column)
  );

  if (!columns.includes(primaryKey)) {
    throw new Error(
      `Primary key ${primaryKey} not found in ${tableName}`
    );
  }

  if (!columns.includes(dateColumn)) {
    throw new Error(
      `Date column ${dateColumn} not found in ${tableName}`
    );
  }

  return { primaryKey, dateColumn, columns };
}

// ============================================================
// SYNC SINGLE TABLE
// ============================================================

async function syncTable(
  tableName: string,
  performMissingCheck: boolean
) {
  const { primaryKey, dateColumn, columns } = await validateTable(
    tableName
  );

  console.log("");
  console.log(`🔄 Starting sync: ${tableName}`);
  console.log(`🔑 Primary Key: ${primaryKey}`);
  console.log(`🕒 Date Column: ${dateColumn}`);

  await syncChangedRows(
    tableName,
    primaryKey,
    columns,
    dateColumn
  );

  if (performMissingCheck) {
    await reconcileMissingRecords(
      tableName,
      primaryKey,
      columns
    );
  }
}

// ============================================================
// FBR COPY — INSERT ONLY, RECORDS OLDER THAN 10 DAYS
// This is separate from the existing LOCAL → LIVE sync.
// It copies records dated before the last-10-days cutoff into the LIVE FBR tables.
// ============================================================

const FBR_LOOKBACK_DAYS = 10;

async function insertFbrRows(
  targetTable: string,
  columns: string[],
  rows: any[],
  conflictKey?: string
): Promise<number> {
  if (rows.length === 0 || columns.length === 0) return 0;

  let insertedCount = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const values: any[] = [];
    const groups: string[] = [];

    for (const row of batch) {
      const placeholders = columns.map((column) => {
        values.push(row[column]);
        return `$${values.length}`;
      });
      groups.push(`(${placeholders.join(", ")})`);
    }

    const columnList = columns.map((column) => `"${column}"`).join(", ");
    const conflictClause = conflictKey === "*"
      ? " ON CONFLICT DO NOTHING"
      : conflictKey
        ? ` ON CONFLICT ("${conflictKey}") DO NOTHING`
        : "";

    const query = `
      INSERT INTO "${targetTable}" (${columnList})
      VALUES ${groups.join(", ")}
      ${conflictClause}
      RETURNING 1
    `;

    const insertResult = await livePool.query({ text: query, values });
    insertedCount += insertResult.rowCount || 0;
  }

  return insertedCount;
}

async function getExistingWbIds(
  tableName: string,
  wbIds: (number | string)[]
): Promise<Set<string>> {
  const existing = new Set<string>();

  for (let offset = 0; offset < wbIds.length; offset += BATCH_SIZE) {
    const batchIds = wbIds.slice(offset, offset + BATCH_SIZE);
    if (batchIds.length === 0) continue;

    const result = await livePool.query(
      `SELECT DISTINCT wb_id FROM "${tableName}" WHERE wb_id = ANY($1::bigint[])`,
      [batchIds]
    );

    for (const row of result.rows) {
      if (row.wb_id !== null && row.wb_id !== undefined) {
        existing.add(String(row.wb_id));
      }
    }
  }

  return existing;
}

async function syncFbrTables(): Promise<void> {
  console.log("\n====================================================");
  console.log("🧾 FBR COPY STARTED — ALL RECORDS OLDER THAN 10 DAYS, INSERT ONLY");
  console.log("====================================================");

  const sourceMaster = "wb_weighbridge";
  const targetMaster = "wb_weighbridge_fbr";
  const sourceDetail = "wb_weighbridge_items_purchase";
  const targetDetail = "wb_weighbridge_items_purchase_fbr";

  // Verify that all four tables exist before copying.
  for (const [client, tableName, databaseLabel] of [
    [localPool, sourceMaster, "LOCAL"],
    [localPool, sourceDetail, "LOCAL"],
    [livePool, targetMaster, "LIVE"],
    [livePool, targetDetail, "LIVE"],
  ] as [any, string, string][]) {
    if (!(await tableExists(client, tableName))) {
      console.error(`❌ ${databaseLabel} FBR source/target table not found: ${tableName}`);
      return;
    }
  }

  const localMasterColumns = await getColumns(localPool, sourceMaster);
  const liveMasterColumns = await getColumns(livePool, targetMaster);
  const masterColumns = localMasterColumns.filter((column) =>
    liveMasterColumns.includes(column)
  );

  if (!masterColumns.includes("wb_id")) {
    console.error("❌ FBR master copy requires wb_id in both master tables.");
    return;
  }

  // Select only records whose creation_date is more than 10 calendar days old.
  const masterColumnList = masterColumns.map((column) => `"${column}"`).join(", ");
  const recentMasterResult = await localPool.query(
    `SELECT ${masterColumnList}
       FROM "${sourceMaster}"
      WHERE creation_date::date < NOW()::date - $1::integer
      ORDER BY wb_id`,
    [FBR_LOOKBACK_DAYS]
  );

  const recentMasters = recentMasterResult.rows;
  if (recentMasters.length === 0) {
    console.log("ℹ️ No local master records found older than 10 days.");
    return;
  }

  const recentWbIds = [
    ...new Set(recentMasters
      .map((row: any) => row.wb_id)
      .filter((id: any) => id !== null && id !== undefined)
      .map((id: any) => String(id))),
  ];

  const existingMasterIds = await getExistingWbIds(targetMaster, recentWbIds);
  const mastersToInsert = recentMasters.filter(
    (row: any) => !existingMasterIds.has(String(row.wb_id))
  );

  const masterInserted = await insertFbrRows(
    targetMaster,
    masterColumns,
    mastersToInsert,
    "wb_id"
  );

  console.log(
    `✅ FBR master: ${masterInserted} new record(s) inserted from records older than 10 days; existing records left unchanged.`
  );

  // Detail rows are joined to their master and use the same creation_date cutoff.
  // Copy only when the LIVE FBR detail table has no rows for that wb_id. The detail PK
  // is generated by the destination table, while wb_id preserves the relation.
  const localDetailColumns = await getColumns(localPool, sourceDetail);
  const liveDetailColumns = await getColumns(livePool, targetDetail);
  const detailColumns = localDetailColumns.filter(
    (column) =>
      liveDetailColumns.includes(column) &&
      column !== "wb_item_p_id"
  );

  if (!detailColumns.includes("wb_id")) {
    console.error("❌ FBR detail copy requires wb_id in both detail tables.");
    return;
  }

  const existingDetailWbIds = await getExistingWbIds(targetDetail, recentWbIds);
  const wbIdsWithoutDetails = recentWbIds.filter(
    (wbId) => !existingDetailWbIds.has(String(wbId))
  );

  let detailRows: any[] = [];
  for (let offset = 0; offset < wbIdsWithoutDetails.length; offset += BATCH_SIZE) {
    const wbIdBatch = wbIdsWithoutDetails.slice(offset, offset + BATCH_SIZE);
    const detailColumnList = detailColumns
      .map((column) => `wwip."${column}"`)
      .join(", ");

    const detailResult = await localPool.query(
      `SELECT ${detailColumnList}
         FROM "${sourceDetail}" wwip
         INNER JOIN "${sourceMaster}" wb ON wb.wb_id = wwip.wb_id
        WHERE wwip.wb_id = ANY($1::bigint[])
          AND wb.creation_date::date < NOW()::date - $2::integer
        ORDER BY wwip.wb_id, wwip.wb_item_p_id`,
      [wbIdBatch, FBR_LOOKBACK_DAYS]
    );

    detailRows.push(...detailResult.rows);
  }

  const detailInserted = await insertFbrRows(targetDetail, detailColumns, detailRows, "*");
  console.log(
    `✅ FBR detail: ${detailInserted} new record(s) inserted; wb_id relation preserved.`
  );
  console.log("🎯 FBR copy completed. Existing FBR entries were not updated.");
}


// ============================================================
// MAIN LOCAL → LIVE SYNC
// ============================================================

export async function syncLocalToLive() {
  if (syncRunning) {
    console.log(
      "⚠️ Previous sync is still running. Skipping this cycle."
    );
    return;
  }

  syncRunning = true;

  // ✅ FIX: Watchdog — agar sync stuck ho jaye to force reset
  const watchdog = setTimeout(() => {
    console.error(
      "🚨 SYNC WATCHDOG: Sync stuck for 15 minutes! Forcing reset."
    );
    syncRunning = false;
  }, SYNC_WATCHDOG_MS);

  console.log("");
  console.log("====================================================");
  console.log("🔄 LOCAL → LIVE DATABASE SYNC");
  console.log("====================================================");
  console.log(
    `⏱️ Sync interval: ${SYNC_INTERVAL / 60000} minutes`
  );
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(
    `🔁 Update overlap: ${UPDATE_OVERLAP_MINUTES} minutes`
  );
  console.log("📍 Source: LOCAL PostgreSQL");
  console.log("📍 Destination: LIVE PostgreSQL");
  console.log(
    `📍 Live Database: ${
      process.env.LIVE_PGDATABASE || "SFK_WB"
    }`
  );
  console.log("📋 Tables:");
  console.log("   - wb_weighbridge");
  console.log("   - wb_weighbridge_items_purchase");
  console.log("   - gl_freight");
  console.log("   - gl_freight_items");
  console.log("   - gl_vouchers");
  console.log("   - gl_voucher_accounts");
  console.log("   FBR INSERT-ONLY COPY (creation_date older than 10 days):");
  console.log("   - wb_weighbridge → wb_weighbridge_fbr");
  console.log("   - wb_weighbridge_items_purchase → wb_weighbridge_items_purchase_fbr");
  console.log("====================================================");

  try {
    await localPool.query("SELECT 1");
    console.log("✅ Local PostgreSQL connected");

    await livePool.query("SELECT 1");
    console.log("✅ Live PostgreSQL connected");

    const shouldCheckMissing =
      syncCycle === 0 ||
      syncCycle % MISSING_ID_CHECK_EVERY === 0;

    if (shouldCheckMissing) {
      console.log(
        "🔎 Missing-record reconciliation: ENABLED"
      );
    } else {
      console.log(
        "🔎 Missing-record reconciliation: SKIPPED"
      );
    }

    for (const tableName of TABLES) {
      try {
        await syncTable(tableName, shouldCheckMissing);
      } catch (error: any) {
        console.error(
          `❌ ${tableName} sync failed:`,
          error?.message || error
        );
      }
    }

    // Run the separate FBR insert-only copy without changing normal sync behavior.
    try {
      await syncFbrTables();
    } catch (error: any) {
      console.error("❌ FBR copy failed:", error?.message || error);
    }

    syncCycle++;

    console.log("");
    console.log(`📊 Sync cycle completed: ${syncCycle}`);
    console.log("====================================================");
    console.log("✅ LOCAL → LIVE SYNC COMPLETED");
    console.log("====================================================");
  } catch (error: any) {
    console.error(
      "❌ Database sync failed:",
      error?.message || error
    );
    console.log("====================================================");
  } finally {
    clearTimeout(watchdog); // ✅ FIX: Watchdog clear
    syncRunning = false;
  }
}

// ============================================================
// START DATABASE SYNC SCHEDULER
// ✅ FIX: Recursive setTimeout (overlap impossible)
// ============================================================

export function startDatabaseSync() {
  console.log("");
  console.log("====================================================");
  console.log("🚀 DATABASE AUTO-SYNC ENABLED");
  console.log("====================================================");
  console.log("📍 Direction: LOCAL → LIVE");
  console.log("📋 Tables:");
  console.log("   1. wb_weighbridge");
  console.log("   2. wb_weighbridge_items_purchase");
  console.log("   3. gl_freight");
  console.log("   4. gl_freight_items");
  console.log("   5. gl_vouchers");
  console.log("   6. gl_voucher_accounts");
  console.log("   FBR insert-only copy (creation_date older than 10 days):");
  console.log("      wb_weighbridge → wb_weighbridge_fbr");
  console.log("      wb_weighbridge_items_purchase → wb_weighbridge_items_purchase_fbr");
  console.log(
    `⏱️ Interval: ${SYNC_INTERVAL / 60000} minutes`
  );
  console.log(
    `🔁 Update overlap: ${UPDATE_OVERLAP_MINUTES} minutes`
  );
  console.log(
    `🔍 Missing-ID check: every ${
      MISSING_ID_CHECK_EVERY * 30
    } minutes`
  );
  console.log("🔑 wb_weighbridge PK: wb_id");
  console.log(
    "🔑 wb_weighbridge_items_purchase PK: wb_item_p_id"
  );
  console.log("🔑 gl_freight PK: freight_id");
  console.log("🔑 gl_freight_items PK: freight_item_id");
  console.log("🔑 gl_vouchers PK: voucher_id");
  console.log(
    "🔑 gl_voucher_accounts PK: voucher_account_id"
  );
  console.log("⚠️ Local database will NOT be modified");
  console.log("⚠️ Live tables will NOT be truncated");
  console.log("====================================================");

  // ✅ FIX: Recursive scheduler
  const scheduleNext = () => {
    setTimeout(async () => {
      try {
        await syncLocalToLive();
      } catch (error: any) {
        console.error(
          "❌ Scheduled database sync failed:",
          error?.message || error
        );
      } finally {
        scheduleNext(); // ← Har haal mein next schedule
      }
    }, SYNC_INTERVAL);
  };

  // First sync — turant chalao
  (async () => {
    try {
      await syncLocalToLive();
    } catch (error: any) {
      console.error(
        "❌ Initial database sync failed:",
        error?.message || error
      );
    } finally {
      scheduleNext();
    }
  })();
}

// ============================================================
// CLOSE DATABASE POOLS
// ============================================================

export async function closeSyncPools() {
  try {
    await localPool.end();
    console.log("✅ Local sync pool closed");
  } catch (error) {
    console.error("❌ Error closing local sync pool:", error);
  }

  try {
    await livePool.end();
    console.log("✅ Live sync pool closed");
  } catch (error) {
    console.error("❌ Error closing live sync pool:", error);
  }
}