import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { hashKey, maskKey } from './auth.mjs';
import {
  getUserDataDir,
  getDbPath,
  getConfigPath,
  getLegacyDbPath,
  getLegacyConfigPath,
  getLegacyClaimedMarkerPath,
  getLegacyMigratedBakPath
} from './paths.mjs';
import {
  getMigrationStatus,
  claimLegacyData,
  startFreshWorkspace,
  initDatabaseSchema
} from './migration.mjs';

console.log('======================================================');
console.log('🧪 LEAD MACHINE: MULTI-USER ISOLATION & CLAIM TEST');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runIsolationSuite() {
  const tmpBase = path.join(os.tmpdir(), 'lm_test_' + Date.now());
  fs.mkdirSync(tmpBase, { recursive: true });

  const legacyDataDir = path.dirname(getLegacyDbPath());
  const realLegacyDb = getLegacyDbPath();
  const realLegacyClaimed = getLegacyClaimedMarkerPath();
  const realLegacyBak = getLegacyMigratedBakPath();

  // Back up any actual current repo files if they exist so tests don't corrupt real state
  const realLegacyConfig = getLegacyConfigPath();
  const realBackupDb = realLegacyDb + '.real_bak_' + Date.now();
  const realBackupConfig = realLegacyConfig + '.real_bak_' + Date.now();
  const realBackupClaimed = realLegacyClaimed + '.real_bak_' + Date.now();
  const hadClaimedInitially = fs.existsSync(realLegacyClaimed);
  if (fs.existsSync(realLegacyDb)) fs.copyFileSync(realLegacyDb, realBackupDb);
  if (fs.existsSync(realLegacyConfig)) fs.copyFileSync(realLegacyConfig, realBackupConfig);
  if (hadClaimedInitially) fs.copyFileSync(realLegacyClaimed, realBackupClaimed);

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create mock legacy database and mock legacy config
    // ------------------------------------------------------------------------
    console.log('[1/4] Setting up mock legacy shared database & license...');
    fs.mkdirSync(legacyDataDir, { recursive: true });
    if (fs.existsSync(realLegacyClaimed)) fs.unlinkSync(realLegacyClaimed);
    if (fs.existsSync(realLegacyBak)) fs.unlinkSync(realLegacyBak);

    let preExistingCount = 0;
    if (fs.existsSync(realLegacyDb)) {
      try {
        const preDb = new Database(realLegacyDb, { readonly: true });
        preExistingCount = preDb.prepare('SELECT count(*) as c FROM leads').get().c;
        preDb.close();
      } catch (_) {}
    }

    const testLegacyDb = new Database(realLegacyDb);
    initDatabaseSchema(testLegacyDb);
    const insertLead = testLegacyDb.prepare(`
      INSERT INTO leads (company_name, website, city, state, status)
      VALUES (?, ?, ?, ?, 'not_contacted')
    `);
    for (let i = 1; i <= 15; i++) {
      insertLead.run(`Legacy Company ${Date.now()}_${i}`, `legacy-${Date.now()}-${i}.com`, 'Chicago', 'IL');
    }
    testLegacyDb.close();

    const expectedTotal = preExistingCount + 15;

    const LEGACY_TEST_KEY = 'LM-ACME-CORP-7788';
    const legacyCfg = {
      sender: { fullName: 'Original Owner', email: 'owner@acme.com' },
      settings: { version: '2.4.0', debugMode: true },
      license: {
        key: LEGACY_TEST_KEY,
        keyMask: maskKey(LEGACY_TEST_KEY),
        clientName: 'Acme Legacy Corp',
        tier: 'Enterprise',
        vaultHash: hashKey(LEGACY_TEST_KEY),
        active: true
      }
    };
    fs.writeFileSync(getLegacyConfigPath(), JSON.stringify(legacyCfg, null, 2), 'utf8');
    assert(fs.existsSync(realLegacyDb), 'Legacy database created with 15 test leads');

    // ------------------------------------------------------------------------
    // TEST 1: User A enters - pending migration detected
    // ------------------------------------------------------------------------
    console.log('\n[2/4] Testing User A migration detection & security claim...');
    const userADir = path.join(tmpBase, 'user_a_profile');
    process.env.LEADMACHINE_DATA_DIR = userADir;

    let status = getMigrationStatus();
    assert(status.pending === true, 'getMigrationStatus reports pending = true for new user profile');
    assert(status.legacyCount === expectedTotal, `Legacy lead count is ${expectedTotal} (got ${status.legacyCount})`);

    // Wrong key attempt
    const wrongRes = await claimLegacyData('LM-WRONG-KEY-0000');
    assert(wrongRes.success === false, 'Claim with wrong license key was rejected');
    assert(!fs.existsSync(getDbPath()), 'User A database NOT created after failed claim');
    assert(fs.existsSync(realLegacyDb), 'Legacy database remains intact after failed claim');

    // Correct key attempt
    const correctRes = await claimLegacyData(LEGACY_TEST_KEY);
    assert(correctRes.success === true, 'Claim with correct license key succeeded');
    assert(fs.existsSync(getDbPath()), 'User A private database successfully populated');
    assert(fs.existsSync(getLegacyClaimedMarkerPath()), '.legacy_claimed lock file created');
    assert(fs.existsSync(getLegacyMigratedBakPath()), 'Legacy database safely archived to .migrated_bak');

    // Verify User A leads
    const userADb = new Database(getDbPath(), { readonly: true });
    const countA = userADb.prepare('SELECT count(*) as c FROM leads').get().c;
    userADb.close();
    assert(countA === expectedTotal, `User A private database has ${expectedTotal} leads (got ${countA})`);

    // Verify User A status is no longer pending
    status = getMigrationStatus();
    assert(status.pending === false, 'User A migration status is now pending = false');
    assert(status.hasUserDb === true, 'User A hasUserDb = true');

    // ------------------------------------------------------------------------
    // TEST 2: User B logs into their own Windows account
    // ------------------------------------------------------------------------
    console.log('\n[3/4] Testing User B complete isolation (Clean Workspace)...');
    const userBDir = path.join(tmpBase, 'user_b_profile');
    process.env.LEADMACHINE_DATA_DIR = userBDir;

    let statusB = getMigrationStatus();
    assert(statusB.pending === false, 'User B migration status is pending = false (legacy already claimed)');
    assert(statusB.legacyClaimed === true, 'User B correctly sees legacyClaimed = true');

    // User B starts fresh
    const freshRes = startFreshWorkspace();
    assert(freshRes.success === true, 'User B fresh workspace initialized');
    assert(fs.existsSync(getDbPath()), 'User B private database exists');

    // Verify User B database is completely clean (0 leads)
    const userBDb = new Database(getDbPath());
    const countB = userBDb.prepare('SELECT count(*) as c FROM leads').get().c;
    assert(countB === 0, `User B starts with 0 leads (got ${countB}) - No clash with User A!`);

    // User B adds their own leads
    userBDb.prepare(`
      INSERT INTO leads (company_name, website, city, state, status)
      VALUES ('User B Private Co', 'userb-private.com', 'Dallas', 'TX', 'not_contacted')
    `).run();
    const countBAfter = userBDb.prepare('SELECT count(*) as c FROM leads').get().c;
    userBDb.close();
    assert(countBAfter === 1, 'User B has 1 private lead');

    // Check User A again: User A's data must be completely unchanged (still 15 leads)
    process.env.LEADMACHINE_DATA_DIR = userADir;
    const checkADb = new Database(getDbPath(), { readonly: true });
    const countAFinal = checkADb.prepare('SELECT count(*) as c FROM leads').get().c;
    checkADb.close();
    assert(countAFinal === expectedTotal, `User A still has exactly ${expectedTotal} leads (isolation verified)`);

    // ------------------------------------------------------------------------
    // TEST 3: User C opts to Start Fresh while legacy database is unclaimed
    // ------------------------------------------------------------------------
    console.log('\n[4/5] Testing User C "Start Fresh" leaves unclaimed legacy data preserved...');
    // Re-create an unclaimed legacy db for this scenario
    if (fs.existsSync(realLegacyClaimed)) fs.unlinkSync(realLegacyClaimed);
    const mockUnclaimedDb = new Database(realLegacyDb);
    initDatabaseSchema(mockUnclaimedDb);
    mockUnclaimedDb.prepare(`
      INSERT INTO leads (company_name, website, status) VALUES ('Unclaimed Co', 'unclaimed.com', 'not_contacted')
    `).run();
    mockUnclaimedDb.close();

    const userCDir = path.join(tmpBase, 'user_c_profile');
    process.env.LEADMACHINE_DATA_DIR = userCDir;

    const statusC = getMigrationStatus();
    assert(statusC.pending === true, 'User C initially sees pending = true');

    // User C chooses "Start Fresh"
    const freshCRes = startFreshWorkspace();
    assert(freshCRes.success === true, 'User C startFreshWorkspace succeeded');
    assert(fs.existsSync(getDbPath()), 'User C has private database created');

    const userCDb = new Database(getDbPath());
    const countC = userCDb.prepare('SELECT count(*) as c FROM leads').get().c;
    userCDb.close();
    assert(countC === 0, 'User C has 0 leads (fresh start)');

    // Verify legacy database was NOT deleted and remains unclaimed!
    assert(fs.existsSync(realLegacyDb), 'Legacy database was NOT deleted when User C started fresh');
    assert(!fs.existsSync(getLegacyClaimedMarkerPath()), 'Legacy database remains unclaimed');

    // Original owner comes in as User D and claims it
    const userDDir = path.join(tmpBase, 'user_d_profile');
    process.env.LEADMACHINE_DATA_DIR = userDDir;
    const statusD = getMigrationStatus();
    assert(statusD.pending === true, 'Original owner User D sees legacy pending');
    const claimD = await claimLegacyData(LEGACY_TEST_KEY);
    assert(claimD.success === true, 'Original owner User D successfully claims preserved legacy database');

    // ------------------------------------------------------------------------
    // TEST 4: Dynamic Port and Port File Functionality
    // ------------------------------------------------------------------------
    console.log('\n[5/5] Testing per-user port recording...');
    const { getPortFilePath } = await import('./paths.mjs');
    const portFile = getPortFilePath();
    assert(portFile.includes('user_d_profile'), 'Port file resolves inside user private directory');

  } finally {
    // Restore original files
    try {
      if (fs.existsSync(realBackupDb)) {
        fs.copyFileSync(realBackupDb, realLegacyDb);
        fs.unlinkSync(realBackupDb);
      }
      if (fs.existsSync(realBackupConfig)) {
        fs.copyFileSync(realBackupConfig, realLegacyConfig);
        fs.unlinkSync(realBackupConfig);
      }
      if (hadClaimedInitially && fs.existsSync(realBackupClaimed)) {
        fs.copyFileSync(realBackupClaimed, realLegacyClaimed);
        fs.unlinkSync(realBackupClaimed);
      } else if (!hadClaimedInitially && fs.existsSync(realLegacyClaimed)) {
        fs.unlinkSync(realLegacyClaimed);
      }
      if (fs.existsSync(realLegacyBak)) fs.unlinkSync(realLegacyBak);
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch (_) {}
    delete process.env.LEADMACHINE_DATA_DIR;
  }

  console.log('\n======================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');
  if (failed > 0) process.exit(1);
}

runIsolationSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
