import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 1839, company: 'H&D Metal Works Corp', url: 'https://metalworkshd.com' },
  { id: 1841, company: 'Doudney Sheet Metal Works', url: 'https://doudney.com' },
  { id: 1847, company: 'P&S Sheet Metal Miami', url: 'https://psinternationalsupply.net' },
  { id: 1856, company: 'FAC Metal Works Corp', url: 'https://facmetalworkscorp.com' },
  { id: 1863, company: 'JC Machine Shop', url: 'https://jcmachineshop.com' },
  { id: 1877, company: 'VLA&DI GROUP INC.', url: 'https://uniqsolutions.tech' },
  { id: 1881, company: 'MFH Sheet Metal Fabricators', url: 'https://mfhsheetmetal.com' },
  { id: 1888, company: "MILAN'S MACHINE SHOP & WELDING SERVICE", url: 'https://milansmachineshop.com' },
  { id: 1893, company: 'Diamond Drawings', url: 'https://diamonddrawingsproyects.com' },
  { id: 1897, company: 'American Aluminum Fabricators', url: 'https://americanaluminumfabricators.com' }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    console.log(`\n================== Lead #${lead.id}: ${lead.company} ==================`);
    try {
      let resp = null;
      try {
        resp = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (e) {
        console.log(`Initial goto error: ${e.message}`);
        // try http
        try {
          const httpUrl = lead.url.replace('https://', 'http://');
          resp = await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e2) {
          console.log(`HTTP goto error: ${e2.message}`);
        }
      }

      console.log(`Final URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);

      const pageInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input, textarea, select').length,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            id: i.id,
            type: i.type,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label')
          }))
        }));

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|quote|about|touch/i.test(l.text) || /contact|quote/i.test(l.href));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          tagName: c.tagName,
          className: c.className,
          src: c.getAttribute('src'),
          sitekey: c.getAttribute('data-sitekey')
        }));

        const bodySnippet = document.body ? document.body.innerText.slice(0, 500).replace(/\s+/g, ' ') : '';

        return { forms, links, captchas, bodySnippet };
      });

      console.log(`Forms found: ${pageInfo.forms.length}`);
      if (pageInfo.forms.length > 0) {
        console.log(JSON.stringify(pageInfo.forms, null, 2));
      }
      console.log(`Captchas:`, pageInfo.captchas);
      console.log(`Relevant Links:`, pageInfo.links.slice(0, 5));
    } catch (err) {
      console.log(`Error inspecting #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectAll();
