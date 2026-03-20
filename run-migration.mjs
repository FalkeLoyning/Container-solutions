import pg from "pg";
import { readFileSync } from "fs";

const client = new pg.Client({
  connectionString: process.argv[2],
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to database");

const sql = readFileSync("supabase-migration.sql", "utf-8");
try {
  await client.query(sql);
  console.log("Migration completed successfully!");
} catch (err) {
  console.error("Migration error:", err.message);
  // Try statement by statement
  console.log("\nRetrying statement by statement...\n");
  
  const statements = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !inDollarBlock) {
      continue;
    }
    if (trimmed.includes("$$")) {
      const count = (trimmed.match(/\$\$/g) || []).length;
      if (count % 2 === 1) inDollarBlock = !inDollarBlock;
    }
    current += line + "\n";
    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt && stmt !== ";") statements.push(stmt);
      current = "";
    }
  }

  let ok = 0, fail = 0;
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      ok++;
    } catch (e) {
      fail++;
      const preview = stmt.substring(0, 80).replace(/\n/g, " ");
      console.error(`  FAIL: ${preview}...`);
      console.error(`        ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok} OK, ${fail} failed`);
}

await client.end();
