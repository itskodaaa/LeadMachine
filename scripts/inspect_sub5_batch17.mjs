import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4954, name: 'Helfrich Tool & Die', url: 'https://helfrichtool.com' },
  { id: 4955, name: 'Husky Industries', url: 'https://huskyindustries.com' },
  { id: 4957, name: 'Prima Die Co Inc', url: 'https://primasales.com' },
  { id: 4958, name: 'Jr Tool & Die', url: 'https://jrtoolanddie.com' },
  { id: 4959, name: 'Bandel Manufacturing., Inc.', url: 'https://bandel.com' },
  { id: 4960, name: 'Us Tool & Die Machine Shop - Orange County', url: 'https://ustooldie.com' },
  { id: 4961, name: 'L & L Tool & Die', url: 'https://lltool.com' },
  { id: 4962, name: 'Hollywood 3D Printing', url: 'https://hollywood3dprinting.com' },
  { id: 4963, name: 'Stellar Products Inc', url: 'https://stellarprod.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      console.log(`\n=== Checking #${lead.id} ${lead.name} (${lead.url}) ===`);
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => ({ status: () => e.message }));
      console.log('Status / Nav:', typeof resp?.status === 'function' ? resp.status() : resp);
      
      const currentUrl = page.url();
      const title = await page.title();
      console.log('Current URL:', currentUrl, '| Title:', title);

      // check forms and links
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id,
            isVisible: !!(i.offsetWidth || i.offsetHeight || i.getClientRects().length)
          }))
        }));

        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|about|reach|inquiry/i.test(a.text) || /contact|quote|inquiry/i.test(a.href))
          .slice(0, 10);

        const textSample = document.body ? document.body.innerText.substring(0, 300).replace(/\s+/g, ' ') : '';

        return { formsCount: forms.length, forms, links, textSample };
      });

      console.log(`Forms found: ${info.formsCount}`);
      if (info.formsCount > 0) {
        console.log('Forms detail:', JSON.stringify(info.forms, null, 2));
      }
      console.log('Relevant links:', info.links);
      console.log('Body snippet:', info.textSample);

    } catch (err) {
      console.log(`Error checking #${lead.id}: ${err.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspect().catch(console.error);
