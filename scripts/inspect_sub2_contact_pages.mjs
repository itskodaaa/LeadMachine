import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4180, name: 'Langford Engineering Inc.', url: 'https://www.langfordeng.com/' },
  { id: 4181, name: 'Pinnacle Engineering Inc', url: 'https://www.pinnacleengr.com/Contact/' },
  { id: 4182, name: 'RSK Engineering', url: 'https://rskengineering.com/contact-us/' },
  { id: 4183, name: 'Paramount Engineering LLC', url: 'https://pellctx.com/contact-pe/' },
  { id: 4184, name: 'Cobb, Fendley & Associates, Inc.', url: 'https://www.cobbfendley.com/contact-us/' },
  { id: 4185, name: 'KEA Structural Engineers, LLC', url: 'https://keastructural.com/contact/' },
  { id: 4186, name: 'EZpermitsTX', url: 'https://ezpermitstx.com/' },
  { id: 4187, name: 'BMG STRUCTURAL ENGINEERS', url: 'https://bmgstructural.com/?page_id=6' },
  { id: 4188, name: 'AW Mechanical Services', url: 'https://awmechanicalservices.com/contact/' },
  { id: 4189, name: 'Hass Co LLC', url: 'https://www.hassco.com/contact' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n========================================\n[${t.id}] ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(e => console.log(`goto err: ${e.message}`));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            value: el.value || '',
            text: el.innerText ? el.innerText.trim() : '',
            required: el.required || false,
            visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
          }));
          return {
            index: i,
            id: f.id,
            action: f.action,
            className: f.className,
            inputs
          };
        });

        const textContent = document.body.innerText;
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const phones = Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href);

        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]'),
          math: /captcha|security question|\d+\s*[\+\-\*]\s*\d+/i.test(textContent)
        };

        return { forms, emails, phones, captchas, bodySnippet: textContent.slice(0, 500) };
      });

      console.log(`Emails:`, info.emails);
      console.log(`Phones:`, info.phones);
      console.log(`Captchas:`, info.captchas);
      console.log(`Forms count:`, info.forms.length);
      for (const form of info.forms) {
        console.log(`Form #${form.index} (id="${form.id}", action="${form.action}"):`);
        for (const input of form.inputs) {
          if (input.visible || input.type === 'submit') {
            console.log(`   [${input.tag}] type="${input.type}" name="${input.name}" id="${input.id}" placeholder="${input.placeholder}" text="${input.text}" required=${input.required}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error processing ${t.id}: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
