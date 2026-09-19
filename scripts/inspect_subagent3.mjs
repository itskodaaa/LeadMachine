import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4988, url: 'https://smseinc.com' },
  { id: 4990, url: 'https://hydroscience.com' },
  { id: 4991, url: 'https://leabraze.com' },
  { id: 4992, url: 'https://akhse.com' },
  { id: 4993, url: 'https://bkf.com' },
  { id: 4994, url: 'https://deckerengineers.com' },
  { id: 4995, url: 'https://hmhca.com' },
  { id: 4996, url: 'https://achieveng.com' },
  { id: 4997, url: 'https://4xengineering.com' },
  { id: 4999, url: 'https://baggengineers.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      console.log(`\n=== Checking #${lead.id} ${lead.url} ===`);
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      let currentUrl = page.url();

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => a.href.toLowerCase().includes('contact') || a.text.toLowerCase().includes('contact'));
      });

      let targetUrl = currentUrl;
      if (contactLinks.length > 0 && !currentUrl.toLowerCase().includes('contact')) {
        targetUrl = contactLinks[0].href;
        console.log(`Navigating to contact link: ${targetUrl}`);
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
          console.log(`Nav error to ${targetUrl}:`, e.message);
        }
      }

      // Check forms, iframes, inputs, captchas
      const pageInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
          return {
            index: i,
            id: f.id,
            action: f.action,
            inputCount: inputs.length,
            inputs: inputs.slice(0, 10),
            buttons
          };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], [class*="recaptcha"]')).map(c => c.outerHTML.slice(0, 100));

        // text mentions of contact
        const emailMatches = (document.body ? document.body.innerText : '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return {
          finalUrl: window.location.href,
          title: document.title,
          formCount: forms.length,
          forms,
          iframes: iframes.filter(s => s),
          captchas,
          emails: Array.from(new Set(emailMatches))
        };
      });

      console.log('Page Info:', JSON.stringify(pageInfo, null, 2));
    } catch (e) {
      console.log(`Error on #${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
