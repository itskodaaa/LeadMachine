export function applyPerformancePragmas(db) {
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 10000');
    db.pragma('cache_size = -2000'); // ~2MB RAM cache limit, preventing memory starvation on 4GB systems
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 33554432'); // 32MB memory-mapped file I/O for direct read speed
  } catch (_) {}
}

/**
 * Ensures leads table has failure_reason and debug_screenshot columns,
 * removes restrictive status CHECK constraints for granular failure tracking,
 * and builds performance indexes for rapid queries on low-spec hardware.
 */
export function migrateDatabase(db) {
  try {
    applyPerformancePragmas(db);

    const cols = db.prepare('PRAGMA table_info(leads)').all();
    if (!cols || cols.length === 0) return;

    const colNames = new Set(cols.map(c => c.name));
    const tableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'").get();
    const hasOldCheck = tableDef && tableDef.sql && tableDef.sql.includes("CHECK(status IN ('not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed'))");

    if (hasOldCheck) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE leads_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT NOT NULL,
          website TEXT NOT NULL UNIQUE,
          city TEXT,
          state TEXT,
          phone TEXT,
          email TEXT,
          contact_person TEXT,
          status TEXT DEFAULT 'not_contacted',
          notes TEXT,
          failure_reason TEXT,
          debug_screenshot TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO leads_migrated (id, company_name, website, city, state, phone, email, contact_person, status, notes, created_at, updated_at)
        SELECT id, company_name, website, city, state, phone, email, contact_person, status, notes, created_at, updated_at
        FROM leads;

        DROP TABLE leads;
        ALTER TABLE leads_migrated RENAME TO leads;

        COMMIT;
      `);
      db.pragma('foreign_keys = ON');
    } else {
      if (!colNames.has('failure_reason')) {
        try { db.exec('ALTER TABLE leads ADD COLUMN failure_reason TEXT;'); } catch (_) {}
      }
      if (!colNames.has('debug_screenshot')) {
        try { db.exec('ALTER TABLE leads ADD COLUMN debug_screenshot TEXT;'); } catch (_) {}
      }
    }

    // Ensure high-performance seeking indexes exist for 4GB low-spec machines
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
        CREATE INDEX IF NOT EXISTS idx_leads_website ON leads(website);
        CREATE INDEX IF NOT EXISTS idx_leads_website_nocase ON leads(website COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_leads_company_nocase ON leads(company_name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_leads_id_desc ON leads(id DESC);
      `);
    } catch (_) {}
  } catch (err) {
    console.error('[DB Migration Error]', err.message);
  }
}

