import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [836, 837, 838, 839, 840, 841, 842, 843, 844, 845];
const placeholders = leadIds.map(() => '?').join(',');
const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    console.log(`\n==============================================`);
    console.log(`Analyzing #${lead.id}: ${lead.company_name} (${lead.website})`);
    try {
      let targetUrl = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
      const res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Initial status: ${res ? res.status() : 'none'} -> ${page.url()}`);
      await new Promise(r => setTimeout(r, 2000));

      // Find contact link
      const contactUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const kws = ['contact', 'get-in-touch', 'reach-us', 'contact-us'];
        for (const kw of kws) {
          const match = links.find(a => (a.innerText || '').toLowerCase().includes(kw) || (a.getAttribute('href') || '').toLowerCase().includes(kw));
          if (match && !match.href.startsWith('mailto:') && !match.href.startsWith('tel:')) return match.href;
        }
        return null;
      });
      console.log(`Contact URL found: ${contactUrl}`);

      if (contactUrl && contactUrl !== page.url()) {
        try {
          await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          console.log(`Navigated to contact page: ${page.url()}`);
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.log(`Failed to navigate to contact URL: ${err.message}`);
        }
      }

      // Inspect forms and fields
      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.substring(0, 100));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        
        return {
          title: document.title,
          url: window.location.href,
          formsCount: forms.length,
          captchas,
          iframes: iframes.filter(s => s && (s.includes('form') || s.includes('contact') || s.includes('hubspot') || s.includes('cognito') || s.includes('jotform'))),
          forms: forms.map((f, i) => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type') || '',
              name: el.getAttribute('name') || '',
              id: el.getAttribute('id') || '',
              placeholder: el.getAttribute('placeholder') || '',
              required: el.hasAttribute('required') || el.classList.contains('required'),
              ariaRequired: el.getAttribute('aria-required')
            }));
            const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
            return {
              index: i,
              action: f.getAttribute('action') || '',
              inputs,
              buttons
            };
          }),
          emails: Array.from(document.body.innerText.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)).map(m => m[0]).slice(0, 5)
        };
      });

      console.log(`Details for #${lead.id}:`);
      console.log(`Title: ${formDetails.title}`);
      console.log(`Captchas: ${JSON.stringify(formDetails.captchas)}`);
      console.log(`Special iframes: ${JSON.stringify(formDetails.iframes)}`);
      console.log(`Emails found: ${JSON.stringify(formDetails.emails)}`);
      console.log(`Forms found (${formDetails.forms.length}):`);
      for (const f of formDetails.forms) {
        console.log(` Form ${f.index}: action=${f.action}, buttons=${f.buttons.join(', ')}`);
        for (const inp of f.inputs) {
          console.log(`   - ${inp.tag}[type=${inp.type}, name=${inp.name}, id=${inp.id}, req=${inp.required || inp.ariaRequired}] placeholder="${inp.placeholder}"`);
        }
      }

    } catch (e) {
      console.log(`Error analyzing #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectAll();
