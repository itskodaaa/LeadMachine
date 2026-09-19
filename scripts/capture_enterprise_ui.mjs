import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const artifactDir = '/Users/macbookair/.gemini/antigravity/brain/917e48c8-b862-4c45-8dd8-d864984075f0';

async function capture() {
  const chromePath = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
    ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    : (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://192.168.64.3:3333...');
  await page.goto('http://192.168.64.3:3333', { waitUntil: 'networkidle2', timeout: 30000 });

  // 1. Command Deck
  await page.screenshot({ path: path.join(artifactDir, 'enterprise_tab_outreach.png') });
  console.log('Saved enterprise_tab_outreach.png');

  // 2. Lead Hunter Tab
  const hunterTab = await page.$('button[data-tab="tab-hunter"]');
  if (hunterTab) {
    await hunterTab.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'enterprise_tab_hunter.png') });
    console.log('Saved enterprise_tab_hunter.png');
  }

  // 3. Leads Database & CRM Tab
  const leadsTab = await page.$('button[data-tab="tab-leads"]');
  if (leadsTab) {
    await leadsTab.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'enterprise_tab_leads.png') });
    console.log('Saved enterprise_tab_leads.png');
  }

  // 4. Corporate Profile Tab
  const profileTab = await page.$('button[data-tab="tab-profile"]');
  if (profileTab) {
    await profileTab.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'enterprise_tab_profile.png') });
    console.log('Saved enterprise_tab_profile.png');
  }

  // 5. System Settings Tab
  const settingsTab = await page.$('button[data-tab="tab-settings"]');
  if (settingsTab) {
    await settingsTab.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(artifactDir, 'enterprise_tab_settings.png') });
    console.log('Saved enterprise_tab_settings.png');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
