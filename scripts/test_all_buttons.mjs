import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TAB_ID = '1693928005';
const ARTIFACTS_DIR = '/Users/macbookair/.gemini/antigravity/brain/917e48c8-b862-4c45-8dd8-d864984075f0';

function cdp(method, params = {}) {
  const res = execFileSync('open-browser-use', [
    'cdp',
    '--tab-id', TAB_ID,
    '--method', method,
    '--params', JSON.stringify(params)
  ], { encoding: 'utf8' });
  return JSON.parse(res);
}

function evalInPage(expression) {
  const res = cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return res?.result?.result?.value;
}

function takeScreenshot(filename) {
  const snap = cdp('Page.captureScreenshot', {});
  const filePath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(snap.result.data, 'base64'));
  console.log(`[SCREENSHOT] Saved: ${filename}`);
  return filePath;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAllTests() {
  console.log('=== STARTING AUTOMATED BROWSER TEST SEQUENCE ===');

  // --- 1. Outreach Tab ---
  console.log('\n[1/5] Testing Outreach View & Controls...');
  evalInPage(`document.querySelector('.nav-tab[data-tab="tab-outreach"]')?.click();`);
  await sleep(600);

  // Test 25 Leads preset
  evalInPage(`document.querySelector('.preset-pill[data-qty="25"]')?.click();`);
  await sleep(300);
  console.log('-> Preset 25 Leads: customLeadQty =', evalInPage(`document.getElementById('customLeadQty')?.value`));

  // Test 50 Leads preset
  evalInPage(`document.querySelector('.preset-pill[data-qty="50"]')?.click();`);
  await sleep(300);
  console.log('-> Preset 50 Leads: customLeadQty =', evalInPage(`document.getElementById('customLeadQty')?.value`));

  // Test Deficit Detection (25,000 leads requested)
  evalInPage(`
    const qty = document.getElementById('customLeadQty');
    if (qty) {
      qty.value = 25000;
      qty.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await sleep(400);

  const deficitBannerText = evalInPage(`document.getElementById('autoHuntDesc')?.innerText`);
  const hasDeficitClass = evalInPage(`document.getElementById('autoHuntBanner')?.classList.contains('has-deficit')`);
  console.log('-> Deficit detected correctly?', hasDeficitClass);
  console.log('-> Deficit message:', deficitBannerText);
  takeScreenshot('test_01_outreach_deficit.png');

  // Set category and reset to 10 leads
  evalInPage(`
    const cat = document.getElementById('campaignCategory');
    if (cat) {
      cat.value = 'Precision CNC Machining';
      cat.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('.preset-pill[data-qty="10"]')?.click();
  `);
  await sleep(400);
  takeScreenshot('test_01_outreach_ready.png');

  // --- 2. Lead Hunter Tab ---
  console.log('\n[2/5] Testing Lead Hunter View...');
  evalInPage(`document.querySelector('.nav-tab[data-tab="tab-hunter"]')?.click();`);
  await sleep(800);

  evalInPage(`
    const q = document.getElementById('hunterQuery');
    if (q) q.value = 'Roofing Contractors';
    const s = document.getElementById('hunterState');
    if (s) s.value = 'Florida';
    const lim = document.getElementById('hunterLimit');
    if (lim) lim.value = 15;
  `);
  await sleep(400);
  takeScreenshot('test_02_lead_hunter.png');

  // --- 3. Leads CRM Tab ---
  console.log('\n[3/5] Testing Leads CRM View...');
  evalInPage(`document.querySelector('.nav-tab[data-tab="tab-leads"]')?.click();`);
  await sleep(800);

  evalInPage(`
    const search = document.getElementById('leadSearchInput');
    if (search) {
      search.value = 'Steel';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await sleep(500);
  const rows = evalInPage(`document.querySelectorAll('#leadsTableBody tr').length`);
  console.log('-> Filtered rows for "Steel":', rows);
  takeScreenshot('test_03_leads_search.png');

  evalInPage(`
    const search = document.getElementById('leadSearchInput');
    if (search) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  await sleep(400);

  // --- 4. Corporate Profile Tab ---
  console.log('\n[4/5] Testing Corporate Profile View...');
  evalInPage(`document.querySelector('.nav-tab[data-tab="tab-profile"]')?.click();`);
  await sleep(800);

  evalInPage(`
    const jt = document.getElementById('pJobTitle');
    if (jt) {
      jt.value = 'VP of Corporate Development';
      jt.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.getElementById('saveProfileBtn')?.click();
  `);
  await sleep(800);
  const saveToast = evalInPage(`document.getElementById('profileSaveMsg')?.innerText`);
  console.log('-> Profile Save status:', saveToast);
  takeScreenshot('test_04_profile_saved.png');

  // --- 5. Settings Tab ---
  console.log('\n[5/5] Testing Settings & Updates View...');
  evalInPage(`document.querySelector('.nav-tab[data-tab="tab-settings"]')?.click();`);
  await sleep(800);

  console.log('-> Clicking "Check for Updates"...');
  evalInPage(`document.getElementById('checkUpdateBtn')?.click();`);
  await sleep(2500);

  const statusPill = evalInPage(`document.getElementById('updateStatusPill')?.innerText`);
  const updateMsg = evalInPage(`document.getElementById('updateFeedback')?.innerText`);
  console.log('-> Status Pill:', statusPill);
  console.log('-> Update Feedback:', updateMsg);

  const isOffline = updateMsg && updateMsg.toLowerCase().includes('offline mode: operating with local build');
  if (isOffline) {
    console.error('FAILED: False offline detected!');
  } else {
    console.log('-> SUCCESS: No false offline message detected!');
  }

  // Adjust settings controls
  evalInPage(`
    const slider = document.getElementById('workerSlider');
    if (slider) {
      slider.value = 10;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const sb = document.getElementById('sandboxToggle');
    if (sb) sb.checked = true;
  `);
  await sleep(400);
  takeScreenshot('test_05_settings_verified.png');

  console.log('\n=== ALL BROWSER AUTOMATION TESTS COMPLETE ===');
}

runAllTests().catch(err => {
  console.error('Error running automated tests:', err);
  process.exit(1);
});
