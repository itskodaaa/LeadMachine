import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4418, name: 'E Escher Inc', url: 'https://eescherinc.com' },
  { id: 4419, name: 'Evergreen Engineering Inc.', url: 'https://evergreenengineering.com' },
  { id: 4420, name: 'Miller Mechanical Contractors & Engineers, LLC', url: 'https://mmce.us' },
  { id: 4422, name: 'Phillips Gradick Engineering', url: 'https://pgeng.net' },
  { id: 4423, name: 'Criterium-Raby Engineers', url: 'https://criterium-raby.com' },
  { id: 4424, name: 'Mangan Engineering & Automation Inc', url: 'https://manganinc.com' },
  { id: 4425, name: 'M E Cubed Engineering LLC', url: 'https://me3eng.com' },
  { id: 4427, name: 'Murray Enterprise Mechanical LLC', url: 'https://murrayenterprisemechanicalllc.net' },
  { id: 4428, name: 'Precision Design Associates', url: 'https://pdaatl.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n==============================================`);
    console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      let response = null;
      try {
        response = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (err) {
        console.log(`Initial goto error: ${err.message}`);
      }

      console.log(`Status code: ${response ? response.status() : 'none'}, Final URL: ${page.url()}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|reach|about|inquir|quote/i.test(a.text) || /contact/i.test(a.href))
          .slice(0, 10);
      });
      console.log(`Contact-related links:`, links);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => ({
          index: i,
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            tag: inp.tagName.toLowerCase(),
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder,
            required: inp.required
          })),
          captchas: {
            grecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey]'),
            hcaptcha: !!f.querySelector('.h-captcha'),
            turnstile: !!f.querySelector('.cf-turnstile'),
            iframeRecaptcha: Array.from(f.querySelectorAll('iframe')).some(ifm => ifm.src && ifm.src.includes('recaptcha'))
          }
        }));
      });
      console.log(`Forms found on root:`, JSON.stringify(forms, null, 2));

    } catch (e) {
      console.log(`Error inspecting #${lead.id}: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspect();
