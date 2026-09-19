import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 6143, name: 'Northwest Industrial Repair', contactUrl: 'https://nwindustrialrepair.com/contact-us/' },
  { id: 6144, name: 'LPD Engineering PLLC', contactUrl: 'https://lpdengineering.com/contact-us/' },
  { id: 6145, name: 'Einhorn Engineering, PLLC', contactUrl: 'https://einhornengineering.com/contact-us/' },
  { id: 6147, name: 'Exact Electric', contactUrl: 'https://exactelectric.com/contact/' },
  { id: 6148, name: 'Firstage Engineering', contactUrl: 'https://firstageengineering.com/contact/' },
  { id: 6149, name: 'Elmore', contactUrl: 'https://uselmore.com' },
  { id: 6150, name: 'Electric Company of Seattle', contactUrl: 'https://elcose.com' },
  { id: 6151, name: 'Fives Lund, LLC', contactUrl: 'https://fiveslund.com' },
  { id: 6154, name: 'VECA Electric & Technologies', contactUrl: 'https://www.veca.com/contact-us' },
  { id: 6155, name: 'Bowie Electric Service, Inc', contactUrl: 'https://bowie-electric.com/contact/' }
];

async function inspectContactPages() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================== Lead #${lead.id}: ${lead.name} ==================`);
    console.log(`Navigating to: ${lead.contactUrl}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
      await page.goto(lead.contactUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Final URL: ${page.url()}`);

      const pageInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type'),
            name: el.getAttribute('name'),
            id: el.getAttribute('id'),
            placeholder: el.getAttribute('placeholder'),
            required: el.required
          }));
          const action = f.getAttribute('action');
          const method = f.getAttribute('method');
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
          return { index: i, action, method, buttons, hasRecaptcha, inputCount: inputs.length, inputs };
        });

        const recaptchaGlobal = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], script[src*="recaptcha"]');

        return {
          mailtos,
          forms,
          recaptchaGlobal,
          bodySnippet: text.slice(0, 300).replace(/\s+/g, ' ')
        };
      });

      console.log(`Mailtos:`, pageInfo.mailtos);
      console.log(`Recaptcha global:`, pageInfo.recaptchaGlobal);
      console.log(`Forms found:`, pageInfo.forms.length);
      for (const form of pageInfo.forms) {
        console.log(` Form #${form.index}: action=${form.action} method=${form.method} buttons=${JSON.stringify(form.buttons)} recaptcha=${form.hasRecaptcha}`);
        console.log(`  Inputs:`, form.inputs.map(inp => `${inp.tag}[${inp.type || ''} name=${inp.name} id=${inp.id} req=${inp.required}]`).join(', '));
      }
    } catch (err) {
      console.log(`Error:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectContactPages();
