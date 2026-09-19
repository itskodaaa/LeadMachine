import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSubPages() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const targets = [
    { id: 4212, name: 'RSG', url: 'https://rsgcompanies.com/contact-us-rsg/' },
    { id: 4213, name: 'FMC', url: 'https://www.fmcengineering.com/contact-us/' },
    { id: 4216, name: 'CAM', url: 'https://www.camintegrated.com/contact' },
    { id: 4218, name: 'HTX', url: 'https://htx-industries.com/contact/' },
    { id: 4219, name: 'MANA', url: 'https://mana-ce.com/contact.html' },
    { id: 4221, name: 'CS Mechanical', url: 'https://www.csmechanical.co/contact' }
  ];

  for (const t of targets) {
    console.log(`\n=== Checking #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 25000 });
      console.log(`Title: ${await page.title()}`);

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            id: f.id,
            action: f.action,
            className: f.className,
            inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName,
              type: el.type || '',
              name: el.name || '',
              id: el.id || '',
              placeholder: el.placeholder || '',
              text: (el.innerText || el.value || '').trim()
            }))
          };
        });
      });

      console.log(`Forms found: ${forms.length}`);
      forms.forEach(f => {
        console.log(`Form #${f.index} (id="${f.id}", action="${f.action}"):`);
        f.inputs.forEach(inp => {
          if (inp.type !== 'hidden') console.log(`  - [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" text="${inp.text}"`);
        });
      });

      const captcha = await page.evaluate(() => {
        return {
          recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]')
        };
      });
      console.log('Captcha:', captcha);

    } catch (err) {
      console.error(`Error on #${t.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkSubPages();
