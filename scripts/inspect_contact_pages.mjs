import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testSpecific() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testPages = [
    { id: 3893, name: 'J&R Precision Drilling', url: 'https://jrpdrilling.com/contact/' },
    { id: 3894, name: 'BTL Engineering Services', url: 'http://btleng.com' },
    { id: 3895, name: 'Custom Manufacturing & Engineering', url: 'https://custom-mfg-eng.com' },
    { id: 3897, name: 'Parker SMT LLC', url: 'https://parkersmt.com/contacts/' },
    { id: 3899, name: 'Electrical Engineering Ent', url: 'https://www.electricalengineeringenterprises.com/contact-us/' },
    { id: 3901, name: 'Rocha Controls', url: 'https://www.rochacontrols.com/contact' },
    { id: 3902, name: 'Keller', url: 'https://www.keller-na.com/contact-us/offices' },
    { id: 3904, name: 'Sirius Steel Services Inc', url: 'http://siriussteelservices.com' },
    { id: 3905, name: 'TMG Manufacturing', url: 'https://tmgmfg.com/contact-us' },
  ];

  for (const item of testPages) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${item.id}: ${item.name} (${item.url})`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      const resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Status: ${resp ? resp.status() : 'none'}, URL: ${page.url()}`);
      
      await new Promise(r => setTimeout(r, 2000));

      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, fIdx) => {
          return {
            formIdx: fIdx,
            id: f.id,
            className: f.className,
            action: f.action,
            fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              ariaLabel: el.getAttribute('aria-label'),
              required: el.required
            }))
          };
        });

        // check if recaptcha / hcaptcha / turnstile / captcha
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const textCaptcha = Array.from(document.querySelectorAll('label, span, p')).map(e => e.innerText).filter(t => /captcha|robot|\d+\s*[\+\-\*]\s*\d+/i.test(t)).slice(0, 5);

        return {
          forms,
          hasRecaptcha,
          hasTurnstile,
          hasHcaptcha,
          textCaptcha,
          title: document.title,
          bodySnippet: document.body ? document.body.innerText.slice(0, 300).replace(/\s+/g, ' ') : ''
        };
      });

      console.log(`Title: ${details.title}`);
      console.log(`CAPTCHA: re=${details.hasRecaptcha}, turn=${details.hasTurnstile}, h=${details.hasHcaptcha}, text=${JSON.stringify(details.textCaptcha)}`);
      console.log(`Forms found (${details.forms.length}):`);
      for (const f of details.forms) {
        console.log(`Form #${f.formIdx} (id="${f.id}", action="${f.action}"):`);
        for (const field of f.fields) {
          console.log(`  [${field.tag}:${field.type}] name="${field.name}" id="${field.id}" placeholder="${field.placeholder}" req=${field.required}`);
        }
      }

    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

testSpecific();
