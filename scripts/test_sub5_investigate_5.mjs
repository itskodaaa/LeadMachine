import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const targets = [
    { id: 4212, name: 'RSG', url: 'https://rsgcompanies.com' },
    { id: 4213, name: 'FMC', url: 'https://fmcengineering.com' },
    { id: 4215, name: 'VIAS3D', url: 'https://vias3d.com' },
    { id: 4216, name: 'CAM', url: 'https://camintegrated.com' },
    { id: 4218, name: 'HTX', url: 'https://htx-industries.com' },
    { id: 4219, name: 'MANA', url: 'https://mana-ce.com' },
    { id: 4220, name: 'Vista Projects', url: 'https://vistaprojects.com' },
    { id: 4221, name: 'CS Mechanical', url: 'https://csmechanical.co' }
  ];

  for (const t of targets) {
    console.log(`\n=== Testing #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Title: ${await page.title()}`);
      console.log(`Current URL: ${page.url()}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|touch|quote|inquir/i.test(a.text) || /contact/i.test(a.href))
          .slice(0, 5);
      });
      console.log('Contact links found:', links);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            action: f.action,
            id: f.id,
            className: f.className,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tagName: el.tagName,
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required
            }))
          };
        });
      });
      console.log(`Forms found (${forms.length})`);

      // Check captchas
      const captcha = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        return { hasRecaptcha, hasTurnstile, hasHcaptcha };
      });
      console.log('Captcha check:', captcha);

    } catch (err) {
      console.error(`Error on #${t.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkLeads();
