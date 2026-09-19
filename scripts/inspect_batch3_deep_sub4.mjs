import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 1432, name: 'Vitron Manufacturing', url: 'https://theatlasgroup.biz' },
  { id: 1440, name: 'Ayers Gear & Machine Inc', url: 'http://ayersgear.com' },
  { id: 1442, name: 'S & S Machine Shop', url: 'https://sandsmachineshop.com' },
  { id: 1449, name: 'Layke Inc', url: 'https://laykeinc.com' },
  { id: 1450, name: 'MGI Machining, LLC', url: 'https://mgimachining.com' },
  { id: 1451, name: 'Matrix Machine Inc.', url: 'https://matrixmachineinc.com' },
  { id: 1452, name: 'Midstate Machinery', url: 'https://midstatemach.com' },
  { id: 1453, name: 'Micropulse West', url: 'https://fathommfg.com' },
  { id: 1454, name: 'Phoenix Swissturn', url: 'https://phoenixswissturn.com' },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      const response = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`HTTP status: ${response ? response.status() : 'null'}, URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const info = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form'));
        const formDetails = forms.map((f, i) => {
          const action = f.getAttribute('action') || '';
          const method = f.getAttribute('method') || '';
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => {
            return {
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || '',
              name: el.getAttribute('name') || '',
              id: el.getAttribute('id') || '',
              placeholder: el.getAttribute('placeholder') || '',
              required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true'
            };
          });
          return { index: i, action, method, inputCount: inputs.length, inputs };
        });

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: (a.innerText || '').trim(),
          href: a.href
        })).filter(l => /contact|quote|about|reach|estimate/i.test(l.text) || /contact|quote/i.test(l.href));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(el => ({
          tag: el.tagName,
          src: el.getAttribute('src') || '',
          cls: el.className || '',
          sitekey: el.getAttribute('data-sitekey') || ''
        }));

        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return {
          textLength: bodyText.length,
          snippet: bodyText.slice(0, 300).replace(/\s+/g, ' '),
          emails: [...new Set(emails)],
          formCount: forms.length,
          formDetails,
          contactLinks: links.slice(0, 6),
          captchas
        };
      });

      console.log(`Text snippet: ${info.snippet}`);
      console.log(`Emails found: ${info.emails.join(', ')}`);
      console.log(`Forms found: ${info.formCount}`);
      if (info.formCount > 0) {
        console.log(`Forms info:`, JSON.stringify(info.formDetails, null, 2));
      }
      if (info.contactLinks.length > 0) {
        console.log(`Contact links:`, info.contactLinks);
      }
      if (info.captchas.length > 0) {
        console.log(`Captchas:`, info.captchas);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

main().catch(console.error);
