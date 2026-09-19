import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function inspectAndTest() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  });

  const tests = [
    {
      id: 4190,
      name: 'Bayside Mechanical Contractors',
      url: 'https://baysidemechanicalcontractors.com'
    },
    {
      id: 4191,
      name: 'Way Engineering',
      url: 'https://www.wayeng.com/contact-us'
    },
    {
      id: 4192,
      name: 'Interfield Group',
      url: 'https://interfield.net/contact-us/'
    },
    {
      id: 4194,
      name: 'McDowell Owens Engineering',
      url: 'https://mcdowellowens.com/contact'
    },
    {
      id: 4195,
      name: 'JM Gross Engineering',
      url: 'https://jmgrossengineering.com'
    },
    {
      id: 4196,
      name: 'IMS Engineers',
      url: 'https://www.imsengineers.com/contact/'
    },
    {
      id: 4197,
      name: 'XWARE Engineering',
      url: 'https://xware-eng.com/about-us-1'
    },
    {
      id: 4198,
      name: 'HTS Texas',
      url: 'https://hts.com'
    },
    {
      id: 4199,
      name: 'Apollo BBC',
      url: 'https://www.apollobbc.com/contact-us'
    },
    {
      id: 4200,
      name: 'KIS.Solutions, LLC',
      url: 'https://www.kis.solutions/'
    }
  ];

  for (const t of tests) {
    console.log(`\n==============================================`);
    console.log(`Testing #${t.id}: ${t.name} -> ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      page.on('dialog', async d => {
        console.log(`[#${t.id}] Dialog appeared:`, d.message());
        await d.dismiss();
      });

      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('goto error:', e.message));
      await new Promise(r => setTimeout(r, 2000));

      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Landed at: ${currentUrl} | Title: "${title}"`);

      // Check forms and details
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const formsData = forms.map((f, i) => {
          const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute('aria-label'),
            required: el.required
          }));
          const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
          return {
            index: i,
            action: f.action,
            method: f.method,
            fields,
            captchas
          };
        });

        const bodyText = document.body ? document.body.innerText : '';
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = bodyText.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g) || [];

        return {
          formsCount: forms.length,
          formsData,
          emails: Array.from(new Set(emails)).slice(0, 5),
          phones: Array.from(new Set(phones)).slice(0, 5)
        };
      });

      console.log(`Forms found: ${info.formsCount}`);
      console.log('Forms details:', JSON.stringify(info.formsData, null, 2));
      console.log('Emails:', info.emails, 'Phones:', info.phones);

    } catch (err) {
      console.error(`Error on #${t.id}:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectAndTest();
