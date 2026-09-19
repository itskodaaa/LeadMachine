import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(leadId, company, url) {
  console.log(`\n======================================================`);
  console.log(`Checking Lead #${leadId}: ${company} (${url})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`Loaded URL: ${page.url()} (Status: ${res?.status()})`);
    
    // Check links for contact
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.innerText.trim().replace(/\s+/g, ' ') }))
        .filter(a => /contact|quote|reach|touch|estimate|inquir/i.test(a.text) || /contact|quote|inquir/i.test(a.href))
        .slice(0, 10);
    });
    console.log(`Contact links:`, contactLinks);

    // If there is a contact link and we are on home, check the contact link
    let targetPage = page;
    if (contactLinks.length > 0 && !page.url().includes('contact')) {
      const cUrl = contactLinks[0].href;
      console.log(`Navigating to contact page: ${cUrl}`);
      try {
        await page.goto(cUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        console.log(`Contact page loaded: ${page.url()}`);
      } catch (e) {
        console.log(`Failed to navigate to contact: ${e.message}`);
      }
    }

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
        idx,
        action: f.action,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          value: el.value
        }))
      }));

      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(el => el.outerHTML.slice(0, 150));
      
      const body = document.body ? document.body.innerText : '';
      const emails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const phones = body.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];

      return {
        forms,
        captchas,
        emails: Array.from(new Set(emails)).slice(0, 5),
        phones: Array.from(new Set(phones)).slice(0, 5),
        snippet: body.slice(0, 400).replace(/\s+/g, ' ')
      };
    });

    console.log(`Forms found:`, JSON.stringify(info.forms, null, 2));
    console.log(`Captchas:`, info.captchas);
    console.log(`Emails/Phones:`, info.emails, info.phones);
    console.log(`Snippet:`, info.snippet);

  } catch (err) {
    console.log(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  const leads = [
    { id: 1982, company: 'Blumenthal Sheet Metal', url: 'https://blumenthalsheetmetal.com' },
    { id: 1989, company: 'Architectural Fabricators', url: 'https://architecturalfabricators.com' },
    { id: 1998, company: 'Texas Metal Specialty Co', url: 'https://texasmetalspecialty.com' },
    { id: 2001, company: 'Fabcorp Inc', url: 'https://fabcorp.com' },
    { id: 2003, company: 'Hou-Tex Sheet Metal Inc.', url: 'https://houtexsheetmetal.com' },
    { id: 2004, company: 'All-Rite Sheet Metal Inc', url: 'https://arsheetmetal.com' },
    { id: 2021, company: 'Campo Sheet Metal Works, Inc.', url: 'https://camposheetmetal.com' },
    { id: 2022, company: 'Sheet Metal Co', url: 'https://sheetmetalcompany.com' },
    { id: 2024, company: 'Texas Sheet Metal Services', url: 'https://texassheetmetalservices.com' },
    { id: 2026, company: 'Contractors Metal Works, Inc.', url: 'https://contractorsmetalworks.com' }
  ];

  for (const l of leads) {
    await checkSite(l.id, l.company, l.url);
  }
}

run();
