import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [4738, 4741, 4742, 4743, 4745, 4746, 4747, 4748, 4750, 4751];

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leadIds) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    console.log(`\n========================================\nChecking #${id}: ${lead.company_name} (${lead.website})`);
    const page = await browser.newPage();
    page.on('dialog', async d => {
      console.log(`  [Dialog]:`, d.message());
      await d.dismiss();
    });

    try {
      let url = lead.website.startsWith('http') ? lead.website : 'https://' + lead.website;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log(`  Goto error:`, e.message));

      console.log(`  Current URL: ${page.url()}`);
      console.log(`  Title: ${await page.title()}`);

      // Check contact link
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|estimate|inquir/i.test(a.text) || /contact|quote|estimate|inquir/i.test(a.href));
      });
      console.log(`  Contact/Quote links found:`, JSON.stringify(links.slice(0, 3)));

      if (links.length > 0 && !/contact|quote/i.test(page.url())) {
        console.log(`  Navigating to contact link: ${links[0].href}`);
        await page.goto(links[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log(`  Nav error:`, e.message));
        console.log(`  New URL: ${page.url()}`);
      }

      // Check forms and captchas anywhere on page
      const formInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const allCaptchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="captcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], [class*="recaptcha"]')).map(c => c.outerHTML.slice(0, 100));
        return {
          captchaGlobal: allCaptchas,
          forms: forms.map((f, i) => {
            const action = f.action || '';
            const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName,
              type: el.type || '',
              name: el.name || '',
              id: el.id || '',
              placeholder: el.placeholder || '',
              required: el.required,
              visible: el.offsetWidth > 0 && el.offsetHeight > 0
            }));
            return { formIndex: i, action, inputCount: inputs.length, inputs };
          })
        };
      });

      console.log(`  Global captchas:`, formInfo.captchaGlobal);
      console.log(`  Forms count: ${formInfo.forms.length}`);
      formInfo.forms.forEach((f, idx) => {
        console.log(`    Form #${idx}: action=${f.action}`);
        console.log(`    Inputs:`, f.inputs.map(inp => `${inp.tag}[${inp.type}|name=${inp.name}|req=${inp.required}|vis=${inp.visible}]`).join(', '));
      });

    } catch (err) {
      console.log(`  Error inspecting #${id}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectLeads();
