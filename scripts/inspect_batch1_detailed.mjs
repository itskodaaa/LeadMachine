import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3893, name: 'J&R Precision Drilling', url: 'https://jrpdrilling.com' },
  { id: 3894, name: 'BTL Engineering Services', url: 'https://btleng.com' },
  { id: 3895, name: 'Custom Manufacturing & Engineering', url: 'https://custom-mfg-eng.com' },
  { id: 3896, name: 'Arnold Engineering LLC', url: 'https://arnoldengineeringllc.com' },
  { id: 3897, name: 'Parker SMT LLC', url: 'https://parkersmt.com' },
  { id: 3899, name: 'Electrical Engineering Ent', url: 'https://electricalengineeringenterprises.com' },
  { id: 3901, name: 'Rocha Controls', url: 'https://rochacontrols.com' },
  { id: 3902, name: 'Keller', url: 'https://keller-na.com' },
  { id: 3904, name: 'Sirius Steel Services Inc', url: 'https://siriussteelservices.com' },
  { id: 3905, name: 'TMG Manufacturing', url: 'https://tmgmfg.com' },
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n=== Checking Lead #${lead.id}: ${lead.name} (${lead.url}) ===`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      const response = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`HTTP status: ${response ? response.status() : 'null'}, Final URL: ${page.url()}`);
      
      // Look for contact links or forms
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input, textarea, select').length,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id
          }))
        }));

        const contactLinks = Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|reach|quote|touch|get-in-touch|talk/i.test(a.innerText || '') || /contact/i.test(a.href || ''))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .slice(0, 5);

        const textSnippets = document.body.innerText.slice(0, 300).replace(/\s+/g, ' ');
        
        return { forms, contactLinks, textSnippets };
      });

      console.log('Forms on root:', JSON.stringify(info.forms, null, 2));
      console.log('Contact links:', JSON.stringify(info.contactLinks, null, 2));
      console.log('Body preview:', info.textSnippets);

    } catch (e) {
      console.log(`Error navigating to ${lead.url}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
