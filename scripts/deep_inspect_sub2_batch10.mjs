/**
 * Deep inspection for Sub-Agent 2 Batch 10 unconfirmed/no-form leads
 * Leads: 5153, 5154, 5156, 5157, 5158, 5159, 5160, 5161, 5162
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const TARGETS = [
  { id: 5153, company: 'Eligius Manufacturing & Construction', url: 'https://eligiusmfg.com' },
  { id: 5154, company: 'Dorantes Welding', url: 'https://doranteswelding.com' },
  { id: 5156, company: 'W. A. Call Manufacturing Company Inc.', url: 'https://wacallmfg.com' },
  { id: 5157, company: '7 Metals Manufacturing', url: 'https://7metalsmanufacturing.com' },
  { id: 5158, company: 'Acosta Sheet Metal Manufacturing', url: 'https://acostamfg.com' },
  { id: 5159, company: 'FSP Fine Steel Products', url: 'https://finesteelproducts.com' },
  { id: 5160, company: 'Coast Metal Cutting', url: 'https://coastmetal.com' },
  { id: 5161, company: 'Ryland Custom Welding Inc.', url: 'https://rylandcustomwelding.com' },
  { id: 5162, company: 'ExcelFab, Inc.', url: 'https://excelfab.net' },
];

async function inspect(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n=== #${target.id} ${target.company} ===`);
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Find all contact links
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const keywords = ['contact', 'get-in-touch', 'inquire', 'quote', 'estimate', 'reach', 'connect'];
      const results = [];
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        const text = (a.innerText || '').toLowerCase().trim();
        if (keywords.some(k => text.includes(k) || href.toLowerCase().includes(k))) {
          results.push({ href: a.href, text });
        }
      }
      return results.slice(0, 10);
    });

    console.log(`  Contact links: ${JSON.stringify(links)}`);

    // Check for forms on home page
    const homeForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        inputs: f.querySelectorAll('input, textarea').length,
        html: f.outerHTML.substring(0, 300)
      }));
    });
    console.log(`  Home page forms: ${JSON.stringify(homeForms)}`);

    // Check mailto/email presence
    const emailInfo = await page.evaluate(() => {
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
      return mailtoLinks.map(a => a.getAttribute('href'));
    });
    console.log(`  Mailto links: ${JSON.stringify(emailInfo)}`);

    // Navigate to contact page if available
    if (links.length > 0) {
      const contactLink = links.find(l => 
        !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && 
        (l.text.includes('contact') || l.href.toLowerCase().includes('contact'))
      ) || links[0];
      
      if (contactLink && !contactLink.href.startsWith('mailto:') && !contactLink.href.startsWith('tel:')) {
        console.log(`  → Navigating to: ${contactLink.href}`);
        await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        const contactForms = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map(f => ({
            action: f.action,
            inputs: f.querySelectorAll('input, textarea').length,
            inputNames: Array.from(f.querySelectorAll('input, textarea')).map(i => i.name || i.id || i.type),
            hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'),
            html: f.outerHTML.substring(0, 500)
          }));
        });
        console.log(`  Contact page forms: ${JSON.stringify(contactForms, null, 2)}`);

        const contactEmailLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.getAttribute('href'));
        });
        console.log(`  Contact page mailto: ${JSON.stringify(contactEmailLinks)}`);

        const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 800) || '');
        console.log(`  Contact page text snippet: ${bodyText.substring(0, 400)}`);
      }
    }

  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }

  try { await page.close(); } catch (_) {}
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const t of TARGETS) {
    await inspect(browser, t);
  }

  try { await browser.close(); } catch (_) {}
  console.log('\n✅ Deep inspection complete.');
}

run();
