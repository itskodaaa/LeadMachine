import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4061, company: 'Coulomb Engineering Inc.', url: 'https://coulombengineeringinc.com' },
  { id: 4062, company: 'WB ENGINEERING', url: 'https://wb-3d.com' },
  { id: 4063, company: 'Gables Engineering Inc', url: 'https://gableseng.com' },
  { id: 4064, company: "Let's prototype", url: 'https://letsprototype.com' },
  { id: 4065, company: 'Apex Engineering', url: 'https://thestructurals.com' },
  { id: 4066, company: 'Elite Power Up', url: 'https://elitepowerup.com' },
  { id: 4068, company: 'Fraga Engineers', url: 'https://fragaeng.com' },
  { id: 4069, company: 'CEC Engineering Inc', url: 'https://cecenginc.com' },
  { id: 4070, company: '3FM CONSULTING', url: 'https://3fmengineering.com' },
  { id: 4071, company: 'GEM360 LLC', url: 'https://gem360llc.com' }
];

async function inspectLead(browser, lead) {
  console.log(`\n==================================================`);
  console.log(`[Lead #${lead.id}] ${lead.company} - ${lead.url}`);
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    let loaded = false;
    for (const testUrl of [lead.url, lead.url.replace('https://', 'https://www.'), lead.url.replace('https://', 'http://')]) {
      try {
        console.log(`Navigating to ${testUrl}...`);
        await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (e) {
        console.log(`Failed ${testUrl}: ${e.message}`);
      }
    }

    if (!loaded) {
      console.log(`❌ All URLs failed for #${lead.id}`);
      return;
    }

    console.log(`Final URL: ${page.url()} | Title: ${await page.title()}`);

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|inquir|quote|touch|reach|estimate/i.test(a.text) || /contact|inquir|quote/i.test(a.href));
    });
    console.log(`Links found:`, JSON.stringify(links.slice(0, 5), null, 2));

    const pageForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        idx: i,
        action: f.action,
        method: f.method,
        id: f.id,
        class: f.className,
        fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          text: el.innerText || el.value
        }))
      }));
    });
    console.log(`Forms found (${pageForms.length}):`, JSON.stringify(pageForms, null, 2));

  } catch (err) {
    console.log(`Error inspecting #${lead.id}: ${err.message}`);
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    await inspectLead(browser, lead);
  }

  await browser.close();
}

run();
