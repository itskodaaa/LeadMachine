import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4120, name: 'Zeta Engineering LLC', url: 'https://zeta-engineering.us' },
  { id: 4121, name: 'BEI Engineers', url: 'https://bei-us.com' },
  { id: 4122, name: 'Sandlot Engineering, LLC', url: 'https://sandlotengineering.com' },
  { id: 4124, name: 'IDS Engineering Group, Inc.', url: 'https://idseg.com' },
  { id: 4125, name: 'Pioneer Engineering, LLC', url: 'https://pioneerengineer.com' },
  { id: 4127, name: 'S&B', url: 'https://sbec.com' },
  { id: 4128, name: 'Blackline Engineering', url: 'https://blackline-eng.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`[#${lead.id}] Checking ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      const res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`Status: ${res ? res.status() : 'null'} | Current URL: ${page.url()}`);

      // Check contact link
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.innerText.trim().toLowerCase() }))
          .filter(a => a.href.includes('contact') || a.text.includes('contact') || a.text.includes('get in touch') || a.text.includes('reach'));
      });
      console.log(`Contact links found:`, contactLinks.slice(0, 5));

      let targetUrl = page.url();
      if (contactLinks.length > 0 && !targetUrl.toLowerCase().includes('contact')) {
        const best = contactLinks[0].href;
        console.log(`Navigating to contact page: ${best}`);
        try {
          await page.goto(best, { waitUntil: 'domcontentloaded', timeout: 25000 });
        } catch (e) {
          console.log(`Error navigating to contact: ${e.message}`);
        }
      }

      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
            text: b.innerText || b.value,
            type: b.type
          }));
          return { index: i, id: f.id, action: f.action, inputs, buttons };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const emails = Array.from(document.body.innerText.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)).map(m => m[0]);
        const recaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');

        return {
          title: document.title,
          url: window.location.href,
          formsCount: forms.length,
          forms,
          iframes,
          emails: Array.from(new Set(emails)).slice(0, 5),
          recaptcha
        };
      });

      console.log(`Info:`, JSON.stringify(info, null, 2));

    } catch (err) {
      console.log(`Failed #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
