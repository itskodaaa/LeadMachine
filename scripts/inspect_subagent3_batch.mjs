import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [4301, 4302, 4303, 4304, 4305, 4306, 4308, 4310];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leadIds) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    console.log(`\n==================================================`);
    console.log(`Inspecting Lead #${lead.id}: ${lead.company_name} (${lead.website})`);

    const page = await browser.newPage();
    try {
      let url = lead.website.startsWith('http') ? lead.website : 'https://' + lead.website;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        console.log(`Goto failed for ${url}: ${e.message}, trying http or www...`);
        url = 'http://' + lead.website.replace(/^https?:\/\//, '');
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e2) {
          console.log(`Failed again: ${e2.message}`);
        }
      }

      console.log(`Current URL: ${page.url()}`);
      console.log(`Page Title: ${await page.title()}`);

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
        const contactLinks = links.filter(l => /contact|reach|touch|quote|inquir/i.test(l.text) || /contact|reach|touch|quote|inquir/i.test(l.href));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));

        const formDetails = forms.map(f => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }));
          return {
            action: f.action,
            method: f.method,
            inputCount: inputs.length,
            inputs: inputs
          };
        });

        return {
          bodySnippet: document.body ? document.body.innerText.slice(0, 300) : '',
          contactLinks: contactLinks.slice(0, 5),
          formCount: forms.length,
          formDetails,
          iframes,
          captchas
        };
      });

      console.log(`Contact Links:`, info.contactLinks);
      console.log(`Captchas found:`, info.captchas);
      console.log(`Forms found (${info.formCount}):`);
      info.formDetails.forEach((f, idx) => {
        console.log(`  Form ${idx + 1}: action=${f.action} method=${f.method}`);
        console.log(`    Inputs:`, f.inputs);
      });
      if (info.iframes.length > 0) {
        console.log(`  Iframes:`, info.iframes);
      }
    } catch (err) {
      console.log(`Error inspecting #${id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
