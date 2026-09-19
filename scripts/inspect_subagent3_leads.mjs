import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4190, company: 'Bayside Mechanical Contractors', url: 'https://baysidemechanicalcontractors.com' },
  { id: 4191, company: 'Way Engineering', url: 'https://wayeng.com' },
  { id: 4192, company: 'Interfield Group', url: 'https://interfield.net' },
  { id: 4194, company: 'McDowell Owens Engineering', url: 'https://mcdowellowens.com' },
  { id: 4195, company: 'JM Gross Engineering', url: 'https://jmgrossengineering.com' },
  { id: 4196, company: 'IMS Engineers', url: 'https://imsengineers.com' },
  { id: 4197, company: 'XWARE Engineering', url: 'https://xware-eng.com' },
  { id: 4198, company: 'HTS Texas', url: 'https://hts.com' },
  { id: 4199, company: 'Apollo BBC', url: 'https://apollobbc.com' },
  { id: 4200, company: 'KIS.Solutions, LLC', url: 'https://kis.solutions' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  for (const lead of leads) {
    console.log(`\n========================================\n[Lead #${lead.id}] ${lead.company} - ${lead.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('goto err:', e.message));
      console.log('Main URL landed:', page.url(), 'Title:', await page.title());

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|reach|touch|quote|inquir|about/i.test(l.text) || /contact|reach|touch|quote|inquir/i.test(l.href));
      });
      console.log('Contact/relevant links:', JSON.stringify(links.slice(0, 8)));

      // Check forms on current page
      const formsInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            tag: inp.tagName,
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder
          }));
          const action = f.action;
          const method = f.method;
          const hasRecaptcha = !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
          return { formIndex: i, action, method, inputsCount: inputs.length, inputs, hasRecaptcha };
        });
      });
      console.log(`Forms on main page (${formsInfo.length}):`, JSON.stringify(formsInfo, null, 2));

      // Also check emails/phone numbers on page
      const pageInfo = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];
        return { emails: Array.from(new Set(emails)).slice(0, 5), phones: Array.from(new Set(phones)).slice(0, 5) };
      });
      console.log('Emails/Phones on main page:', pageInfo);

    } catch (e) {
      console.error(`Error processing #${lead.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
