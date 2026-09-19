import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkThree() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const targets = [
    { id: 4215, name: 'VIAS3D', url: 'https://vias3d.com/contact/' },
    { id: 4218, name: 'HTX', url: 'https://htx-industries.com/contact/' },
    { id: 4220, name: 'Vista Projects', url: 'https://www.vistaprojects.com/contact/' }
  ];

  for (const t of targets) {
    console.log(`\n=== Testing #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`Title: ${await page.title()}`);
      console.log(`URL: ${page.url()}`);

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => ({
          index: i,
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            text: (el.innerText || el.value || '').trim()
          }))
        }));
      });

      console.log(`Forms found: ${forms.length}`);
      forms.forEach(f => {
        console.log(`Form #${f.index} (id="${f.id}", action="${f.action}"):`);
        f.inputs.forEach(inp => {
          if (inp.type !== 'hidden') console.log(`  - [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" text="${inp.text}"`);
        });
      });

      const captcha = await page.evaluate(() => ({
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]'),
        turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]'),
        hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]')
      }));
      console.log('Captcha:', captcha);

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkThree();
