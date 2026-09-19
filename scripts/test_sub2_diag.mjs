import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadsToInspect = [4016, 4017, 4018, 4019, 4020, 4021, 4022, 4024, 4026];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,900'
    ]
  });

  for (const id of leadsToInspect) {
    const lead = db.prepare('SELECT id, company_name, website, notes, status FROM leads WHERE id = ?').get(id);
    console.log(`\n==================================================`);
    console.log(`🔍 Examining Lead #${id}: ${lead.company_name} (${lead.website})`);

    const page = await browser.newPage();
    page.on('dialog', async d => {
      console.log(`  [Dialog] type: ${d.type()}, message: ${d.message()}`);
      try { await d.dismiss(); } catch (_) {}
    });

    try {
      let targetUrl = lead.website;
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

      console.log(`  Navigating to ${targetUrl}...`);
      let resp;
      try {
        resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e) {
        console.log(`  Initial goto failed: ${e.message}, trying http or alternative...`);
        try {
          targetUrl = targetUrl.replace('https://', 'http://');
          resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e2) {
          console.log(`  Fallback goto failed: ${e2.message}`);
        }
      }

      await new Promise(r => setTimeout(r, 2000));
      const finalUrl = page.url();
      const title = await page.title();
      console.log(`  Current URL: ${finalUrl} | Title: "${title}"`);

      // Find all contact links on page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|touch|quote|reach|about|inquir/i.test(l.text) || /contact|touch|quote|reach|about|inquir/i.test(l.href));
      });
      console.log(`  Found ${links.length} potential contact links:`, links.slice(0, 5));

      // Check if there's a better contact page to navigate to
      const bestContactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      if (bestContactLink && bestContactLink.href !== finalUrl && !finalUrl.includes('contact')) {
        console.log(`  Navigating to contact page: ${bestContactLink.href}`);
        try {
          await page.goto(bestContactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          console.log(`  Loaded contact URL: ${page.url()} | Title: "${await page.title()}"`);
        } catch (e) {
          console.log(`  Failed navigating to contact link: ${e.message}`);
        }
      }

      // Inspect forms on current page
      const inspectForms = async () => {
        return await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map((f, i) => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required
            }));
            const buttons = Array.from(f.querySelectorAll('button, input[type="submit"], a.button, a.btn')).map(b => b.innerText || b.value);
            const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src);
            return { index: i, action: f.action, method: f.method, id: f.id, className: f.className, inputs, buttons, captchas };
          });
        });
      };

      let forms = await inspectForms();
      console.log(`  Forms detected on page: ${forms.length}`);
      forms.forEach((f, idx) => {
        console.log(`    Form #${idx}: inputs=${f.inputs.length}, buttons=${JSON.stringify(f.buttons)}, captchas=${JSON.stringify(f.captchas)}, action=${f.action}`);
        console.log(`      Inputs:`, f.inputs);
      });

      // Check for standalone iframes
      const allIframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(ifm => ({
          src: ifm.src,
          name: ifm.name,
          id: ifm.id
        }));
      });
      if (allIframes.length > 0) {
        console.log(`  Iframes on page:`, allIframes);
      }

      // Check text for email or phone
      const contactInfo = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];
        return {
          uniqueEmails: [...new Set(emails)].slice(0, 5),
          uniquePhones: [...new Set(phones)].slice(0, 5)
        };
      });
      console.log(`  Direct Contact Info:`, contactInfo);

    } catch (err) {
      console.log(`  Error inspecting #${id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

main().catch(console.error);
