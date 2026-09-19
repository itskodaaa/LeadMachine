import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4258, name: 'M-Tech Precision Machining', url: 'https://mtechprecisionmachining.com' },
  { id: 4259, name: 'Arrow Science and Technology', url: 'https://arrowscitech.com' },
  { id: 4260, name: 'Allometrics Inc.', url: 'https://allometrics.com' },
  { id: 4261, name: 'Micro Precision Inc', url: 'https://microprecisionco.com' },
  { id: 4263, name: 'Odyssey Precision Fabricating', url: 'https://odysseyprecision.com' },
  { id: 4265, name: 'DAC Engineering', url: 'https://dacengineers.com' },
  { id: 4267, name: 'GR2 Engineering', url: 'https://gr2engineering.com' },
  { id: 4268, name: 'Zentech Inc.', url: 'https://zentech-usa.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================================`);
    console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Status: ${resp ? resp.status() : 'no resp'}, Title: ${await page.title()}`);
      console.log(`Final URL: ${page.url()}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(a => /contact|reach|quote|touch/i.test(a.innerText || '') || /contact|quote/i.test(a.href || ''))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 5);
      });
      console.log('Contact links:', contactLinks);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            name: el.name,
            type: el.type,
            placeholder: el.placeholder,
            id: el.id
          }));
          const action = f.getAttribute('action');
          return { index: i, action, inputsCount: inputs.length, inputs };
        });
      });
      console.log(`Forms found (${forms.length}):`, JSON.stringify(forms, null, 2));

      // Captchas?
      const captchas = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
        const hasHCaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { hasRecaptcha, hasHCaptcha, hasTurnstile };
      });
      console.log('Captchas:', captchas);

    } catch (err) {
      console.log(`Navigation error: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
