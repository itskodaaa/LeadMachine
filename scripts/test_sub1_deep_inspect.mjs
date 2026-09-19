import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4610, company: 'Weld ATX llc', url: 'https://weld-atx.com' },
  { id: 4611, company: 'Civil Steel', url: 'https://civil-steel.com' },
  { id: 4612, company: 'Flight Metals, Inc.', url: 'https://flightmetals.com' },
  { id: 4613, company: 'Moore Fabrication', url: 'https://moorefabinfo.com' },
  { id: 4615, company: 'Custom Sheet Metal', url: 'https://customatx.com' },
  { id: 4616, company: 'Eastside Fabrication', url: 'https://eastsidefabricationllc.com' },
  { id: 4617, company: 'Apache Metal Works', url: 'https://apachemetalworksatx.squarespace.com' },
  { id: 4618, company: 'Atomic Sheet Metal', url: 'https://atomicsheetmetals.com' },
  { id: 4620, company: '5 Star Fabrications Inc', url: 'https://5starfabrications.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of leads) {
    const page = await browser.newPage();
    console.log(`\n--- Inspecting #${item.id} ${item.company} (${item.url}) ---`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      // Check nav links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
          .filter(l => /contact|quote|about|reach|estimate/i.test(l.text) || /contact|quote|about|reach|estimate/i.test(l.href))
          .slice(0, 10);
      });
      console.log('Relevant links:', links);

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            text: el.innerText
          }))
        }));
      });
      console.log('Forms on page:', forms.length);
      if (forms.length > 0) {
        console.log('Form details:', JSON.stringify(forms, null, 2));
      }

      // Check email addresses or phone on page
      const contactInfo = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : '';
        const emails = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        return { emails: Array.from(new Set([...emails, ...mailtos])), bodySnippet: body.slice(0, 300).replace(/\n+/g, ' ') };
      });
      console.log('Contact info found:', contactInfo.emails);

    } catch (e) {
      console.log('Error inspecting:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
