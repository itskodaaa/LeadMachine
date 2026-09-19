import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const leads = db.prepare('SELECT id, company_name, website, status, notes FROM leads WHERE id IN (3631, 3632, 3634, 3635, 3636, 3637, 3638, 3639, 3640)').all();

console.log(JSON.stringify(leads, null, 2));

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME_BIN,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

for (const lead of leads) {
  console.log(`\n========================================`);
  console.log(`Checking #${lead.id}: ${lead.company_name} (${lead.website})`);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  let url = lead.website;
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`Status: ${res?.status()}, Final URL: ${page.url()}`);
    
    // Check contact links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|reach|touch|connect|about/i.test(a.text) || /contact/i.test(a.href))
        .slice(0, 10);
    });
    console.log(`Contact Links found:`, links);

    // Check forms on current page
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        index: i,
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        }))
      }));
    });
    console.log(`Forms on landing page:`, JSON.stringify(forms, null, 2));

  } catch (err) {
    console.log(`Error navigating to ${url}: ${err.message}`);
    // Try http if https failed
    if (url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      console.log(`Trying HTTP fallback: ${httpUrl}`);
      try {
        const res = await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        console.log(`HTTP Status: ${res?.status()}, Final URL: ${page.url()}`);
      } catch (err2) {
        console.log(`HTTP fallback failed: ${err2.message}`);
      }
    }
  } finally {
    await page.close();
  }
}

await browser.close();
