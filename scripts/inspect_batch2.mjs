import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 3208, url: 'https://blackeagleeng.com' },
  { id: 3209, url: 'https://visserprecision.com' },
  { id: 3210, url: 'https://japrecision-machinin.com' },
  { id: 3211, url: 'https://rjsarcflash.com' },
  { id: 3212, url: 'https://precisionec-llc.com' },
  { id: 3213, url: 'https://precisecast.com' },
  { id: 3214, url: 'https://precisionoee.com' },
  { id: 3215, url: 'https://flpengineering.com' },
  { id: 3216, url: 'https://mullereng.com' },
  { id: 3217, url: 'https://frontierprecision.com' }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of leads) {
    try {
      const p = await browser.newPage();
      await p.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const title = await p.title();
      const contactLinks = await p.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact/i.test(a.href) || /contact|quote|get in touch/i.test(a.text));
      });
      
      let targetUrl = item.url;
      if (contactLinks.length > 0) {
        targetUrl = contactLinks[0].href;
        await p.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      }

      const formInfo = await p.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          action: f.action,
          method: f.method,
          classes: f.className,
          hasCaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .h-captcha, .cf-turnstile') || !!document.querySelector('iframe[src*="recaptcha"]'),
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));
      });

      console.log(`\n=== #${item.id} (${targetUrl}) ===`);
      console.log('Title:', title);
      console.log('Forms found:', formInfo.length);
      if (formInfo.length > 0) {
        console.log('Form 0 details:', JSON.stringify(formInfo[0], null, 2));
      } else {
        const bodySnippet = await p.evaluate(() => document.body.innerText.slice(0, 300));
        console.log('No form. Body snippet:', bodySnippet.replace(/\s+/g, ' '));
      }
      await p.close();
    } catch (e) {
      console.log(`\n=== #${item.id} ERROR ===:`, e.message);
    }
  }

  await browser.close();
}

inspectAll();
