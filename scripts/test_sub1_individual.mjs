import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [3439, 3440, 3441, 3442, 3443, 3444, 3445, 3446, 3447, 3448];

async function checkSite(leadId) {
  const lead = db.prepare('SELECT id, company_name, website FROM leads WHERE id = ?').get(leadId);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    let url = lead.website.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    console.log(`\n--------------------------------------------`);
    console.log(`Testing Lead #${lead.id}: ${lead.company_name} (${url})`);
    
    let loaded = false;
    for (const u of [url, url.replace('https://', 'http://'), url.replace('://', '://www.')]) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 12000 });
        loaded = true;
        break;
      } catch (e) {
        console.log(`  Failed ${u}: ${e.message.split('\n')[0]}`);
      }
    }

    if (!loaded) {
      console.log(`  RESULT: Inaccessible / Timeout`);
      await browser.close();
      return;
    }

    const currentUrl = page.url();
    const title = await page.title();
    console.log(`  Loaded URL: ${currentUrl} | Title: ${title}`);

    // Check contact links
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.innerText.trim().replace(/\s+/g, ' ') }))
        .filter(a => /contact|inquir|touch|get-in-touch|quote|estimate/i.test(a.text) || /contact|inquir|quote/i.test(a.href))
        .filter(a => !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'));
    });
    console.log(`  Contact links found:`, contactLinks.slice(0, 3));

    // Check forms on home page
    const getForms = async () => {
      return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, idx) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }));
          return {
            idx,
            id: f.id,
            action: f.action,
            visibleInputs: inputs.filter(i => i.type !== 'hidden' && i.visible)
          };
        }).filter(f => f.visibleInputs.length >= 2);
      });
    };

    let forms = await getForms();
    console.log(`  Forms on current page: ${forms.length}`);
    if (forms.length > 0) {
      console.log(JSON.stringify(forms, null, 2));
    }

    if (forms.length === 0 && contactLinks.length > 0) {
      const targetContactUrl = contactLinks[0].href;
      console.log(`  Navigating to contact page: ${targetContactUrl}`);
      try {
        await page.goto(targetContactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`  Contact page title: ${await page.title()}`);
        forms = await getForms();
        console.log(`  Forms on contact page: ${forms.length}`);
        if (forms.length > 0) {
          console.log(JSON.stringify(forms, null, 2));
        }
      } catch (e) {
        console.log(`  Failed navigating to contact page: ${e.message}`);
      }
    }

    // Check contact info
    const info = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const phones = text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];
      return {
        emails: Array.from(new Set(emails)).slice(0, 2),
        phones: Array.from(new Set(phones)).slice(0, 2)
      };
    });
    console.log(`  Direct info:`, info);

  } catch (err) {
    console.log(`  Error: ${err.message}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function run() {
  for (const id of leadIds) {
    await checkSite(id);
  }
}

run();
