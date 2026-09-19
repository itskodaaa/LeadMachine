import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3883, name: 'DeCaro Willson', url: 'http://decarowillson.com/' },
  { id: 3884, name: 'EBI Surveying', url: 'https://www.ebisurvey.com/' },
  { id: 3885, name: 'P G & H Engineering', url: 'http://pgheng.com/' },
  { id: 3886, name: 'Kingdom Precision', url: 'https://kingdomprecision.com/' },
  { id: 3887, name: 'KPI Engineering, Inc.', url: 'https://kpiengineering.com/' },
  { id: 3888, name: 'Princeton Tool South', url: 'https://princetontool.com/' },
  { id: 3889, name: 'Engineering Professionals, Inc.', url: 'https://www.engrpros.com/' },
  { id: 3890, name: 'Pegasus TSI Inc', url: 'https://www.pegasustsi.com/' },
  { id: 3891, name: 'Award Engineering Inc', url: 'http://awardengineering.com/' },
  { id: 3892, name: 'Phoenix Engineering Group', url: 'https://www.phoenixeng.us/' }
];

const PROFILE = {
  name: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n======================================================`);
    console.log(`ANALYZING Lead #${lead.id}: ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Landed at: ${page.url()} | Title: ${await page.title()}`);

      // Find all contact-like links
      const navLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors
          .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
          .filter(a => /contact|reach|touch|quote|inquir|estimate/i.test(a.text) || /contact|reach|touch|quote|inquir|estimate/i.test(a.href));
      });
      console.log(`Contact links found:`, JSON.stringify(navLinks.slice(0, 6)));

      // If we are not on a contact page and there is a contact link (that is not mailto/tel), navigate to it
      let contactUrl = page.url();
      const validContactLink = navLinks.find(l => !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.includes('#'));
      if (validContactLink && !page.url().includes('contact')) {
        console.log(`Navigating to contact page: ${validContactLink.href}`);
        try {
          await page.goto(validContactLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          contactUrl = page.url();
          console.log(`Contact page: ${contactUrl} | Title: ${await page.title()}`);
        } catch (e) {
          console.log(`Failed to navigate to contact link: ${e.message}`);
        }
      }

      // Detailed form and DOM inspection
      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'));

        const formsData = forms.map((f, idx) => {
          const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type || '',
            name: i.name || '',
            id: i.id || '',
            placeholder: i.placeholder || '',
            required: i.required || false,
            classes: i.className || ''
          }));
          return {
            idx,
            action: f.action,
            method: f.method,
            inputCount: inputs.length,
            inputs
          };
        });

        // Also check if there are inputs outside of forms (e.g. React/Vue/Wix/Div forms)
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
          tag: i.tagName.toLowerCase(),
          type: i.type || '',
          name: i.name || '',
          id: i.id || '',
          placeholder: i.placeholder || ''
        }));

        // Email / Phone on page
        const bodyText = document.body ? document.body.innerText : '';
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const phones = bodyText.match(/(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];

        return {
          formsCount: forms.length,
          formsData,
          totalInputs: allInputs.length,
          allInputs: allInputs.slice(0, 10),
          captchas: captchas.map(c => c.getAttribute('src') || c.className),
          emails: Array.from(new Set(emails)).slice(0, 3),
          phones: Array.from(new Set(phones)).slice(0, 3)
        };
      });

      console.log(`Form details:`, JSON.stringify(formDetails, null, 2));

    } catch (e) {
      console.log(`Error analyzing #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
