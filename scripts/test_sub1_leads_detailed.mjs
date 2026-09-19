import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3493, name: 'American Precision Engineering', url: 'https://apeamerican.com' },
  { id: 3494, name: 'Advanced Productivity Engineering', url: 'https://ap-engineer.com' },
  { id: 3495, name: 'Austin Precision Machining and Manufacturing', url: 'https://austinprecisionmachining.com' },
  { id: 3497, name: 'Four Points Platinum Machining', url: 'https://fourpointsplatinum.com' },
  { id: 3498, name: 'TenX Precision LLC', url: 'https://tenxp.com' },
  { id: 3499, name: 'Deep Blue Precision', url: 'https://deepblueprecision.com' },
  { id: 3500, name: 'Exploration Instruments LLC', url: 'https://expins.com' },
  { id: 3501, name: 'Precision Networking', url: 'https://precisionnetworking.yolasite.com' },
  { id: 3502, name: 'Precise Machining Company', url: 'https://precisemachiningco.com' },
  { id: 3503, name: 'Hendrix Consulting Engineers', url: 'https://hcengineer.com' },
];

async function checkSite(lead) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log(`\n========================================`);
  console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);

  try {
    const res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Status: ${res ? res.status() : 'null'}, Current URL: ${page.url()}`);

    // Check for contact links
    const contactLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|quote|inquiry|touch/i.test(a.text) || /contact|quote/i.test(a.href))
        .slice(0, 5);
    });
    console.log('Contact links:', contactLinks);

    // Check for forms on current page
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }));
        return {
          formIndex: i,
          action: f.action,
          method: f.method,
          inputs
        };
      });
    });
    console.log('Forms on home:', JSON.stringify(formInfo, null, 2));

  } catch (err) {
    console.log(`Error loading ${lead.url}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const lead of leads) {
    await checkSite(lead);
  }
}

main();
