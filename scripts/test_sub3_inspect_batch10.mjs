import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3918, name: 'FreeDimension LLC', url: 'https://freedimension.net' },
  { id: 3919, name: 'HR CNC', url: 'https://hrcnc.net' },
  { id: 3920, name: 'Vulcan Machine', url: 'https://princeind.com' },
  { id: 3921, name: 'Anchor Machine & Fabrication', url: 'https://anchormachineshop.com' },
  { id: 3922, name: 'MAX Machine & Manufacturing', url: 'https://maxmachine.biz' },
  { id: 3923, name: 'Catamount Machine Works', url: 'https://catmw.com' },
  { id: 3925, name: 'Aztec Welding and Fabrication', url: 'https://aztec-welding.com' },
  { id: 3926, name: 'DALANE MACHINING INC', url: 'https://dalanemachining.com' },
  { id: 3927, name: 'HernandezMachineShop.LLC', url: 'https://hernandezmashineshop.com' },
  { id: 3928, name: 'Performance King', url: 'https://performanceking.com' },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n==================================================`);
    console.log(`Testing Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => {
        console.log(`Goto error: ${e.message}`);
        return null;
      });
      console.log(`Page title: ${await page.title().catch(() => 'N/A')}`);
      console.log(`Final URL: ${page.url()}`);
      console.log(`Status: ${resp ? resp.status() : 'N/A'}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|reach|quote|touch|inquiry/i.test(a.innerText) || /contact|reach|quote|inquiry/i.test(a.href))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 10);
      });
      console.log(`Contact links found:`, contactLinks);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tagName: el.tagName,
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder
            }))
          };
        });
      });
      console.log(`Forms found on page: ${forms.length}`);
      forms.forEach((f, i) => {
        console.log(`Form ${i}: action=${f.action}, inputs=${f.inputs.length}`);
        console.log(`Inputs:`, f.inputs);
      });

      // Check for captchas
      const captcha = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]');
        const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { hasRecaptcha, hasHcaptcha, hasTurnstile };
      });
      console.log(`Captcha:`, captcha);

    } catch (err) {
      console.log(`Error on ${lead.id}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

main().catch(console.error);
