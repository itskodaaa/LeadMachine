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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention. Sincerely, Pamela Jameson'
};

const leads = [
  { id: 3525, name: 'Nanohmics, Inc.', url: 'https://nanohmics.com', contactUrl: 'https://www.nanohmics.com/contact' },
  { id: 3526, name: 'Cleary Zimmermann Engineers - Austin', url: 'https://clearyzimmermann.com', contactUrl: 'https://clearyzimmermann.com/about/contact/' },
  { id: 3527, name: 'Design & Manufacturing (DSNMFG)', url: 'https://dsnmfg.com', contactUrl: 'https://dsnmfg.com' },
  { id: 3528, name: 'ViewPoint Engineering', url: 'https://viewpointengineering.com', contactUrl: 'https://viewpointlandsolutions.com/contact-us/' },
  { id: 3529, name: 'HEI Civil', url: 'https://heicivil.com', contactUrl: 'https://heicivil.com/contact/' },
  { id: 3530, name: 'Glumac', url: 'https://glumac.com', contactUrl: 'https://glumac.com/contact/' },
  { id: 3531, name: 'Detekt Biomedical', url: 'https://idetekt.com', contactUrl: 'https://www.idetekt.com/' },
  { id: 3532, name: 'Tei Controls', url: 'https://teicontrols.com', contactUrl: 'https://teicontrols.com/quote1.html' },
  { id: 3533, name: 'Propulsion', url: 'https://propulsiondesign.com', contactUrl: 'https://propulsiondesign.com/contact/' },
  { id: 3534, name: 'Professional Service Industries, Inc', url: 'https://psiusa.com', contactUrl: 'https://www.intertek.com/contact/' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const lead of leads) {
    console.log(`\n==============================================`);
    console.log(`Analyzing Lead #${lead.id}: ${lead.name}`);
    console.log(`Contact URL: ${lead.contactUrl}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
      const response = await page.goto(lead.contactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => ({ status: () => 'ERROR: ' + e.message }));
      console.log('HTTP Status:', typeof response.status === 'function' ? response.status() : response.status);
      console.log('Final URL:', page.url());

      // Wait a bit for dynamic forms
      await new Promise(r => setTimeout(r, 3000));

      // Inspect forms & iframes
      const pageAnalysis = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            id: f.id,
            action: f.action,
            fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required
            }))
          };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          id: iframe.id,
          name: iframe.name
        }));

        const hasCaptcha = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile');

        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);

        return {
          forms,
          iframes,
          hasCaptcha,
          emails: Array.from(new Set(emails))
        };
      });

      console.log('Has CAPTCHA visible on page:', pageAnalysis.hasCaptcha);
      console.log('Direct emails found:', pageAnalysis.emails);
      console.log('Iframes:', pageAnalysis.iframes.map(i => i.src));
      console.log('Forms found:', pageAnalysis.forms.length);
      for (const f of pageAnalysis.forms) {
        console.log(`Form #${f.index} action: ${f.action}`);
        console.log(`  Inputs:`, f.fields.map(i => `${i.tag}[type=${i.type}, name=${i.name}, id=${i.id}]`).join(', '));
      }

    } catch (err) {
      console.error('Error analyzing lead:', err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
