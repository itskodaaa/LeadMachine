import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4363, name: 'Turnipseed Engineers', url: 'https://turnipseed.com' },
  { id: 4364, name: 'Georgia Structural Engineer', url: 'https://georgiastructuralengineer.com' },
  { id: 4365, name: 'Vest Engineering Inc', url: 'https://vestengineering.net' },
  { id: 4366, name: 'Walter P Moore', url: 'https://walterpmoore.com' },
  { id: 4369, name: 'Contineo Group', url: 'https://thecontineogroup.com' },
  { id: 4370, name: 'PES Structural Engineers', url: 'https://pesengineers.com' },
  { id: 4372, name: 'Knoble Engineering', url: 'https://knobleengineering.com' },
  { id: 4374, name: 'Smith Monitoring & Maintenance', url: 'https://bioremediationsmme.com' }
];

async function examine() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      console.log(`\n========================================`);
      console.log(`Examining #${lead.id} ${lead.name} (${lead.url})`);
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Final URL:', page.url());

      // Look for contact link
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|inquir|about/i.test(a.text) || /contact|inquir/i.test(a.href));
      });
      console.log('Contact links:', links.slice(0, 5));

      // If on home, let's navigate to contact page if found
      const contactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      if (contactLink && !page.url().includes('contact')) {
        console.log('Navigating to contact page:', contactLink.href);
        await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('Contact page URL:', page.url());
      }

      // Check forms on the page
      const formData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, idx) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            className: i.className,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }));
          const action = f.getAttribute('action') || '';
          const method = f.getAttribute('method') || '';
          const html = f.outerHTML.substring(0, 300);
          return { idx, action, method, inputsCount: inputs.length, inputs, html };
        });
      });

      console.log(`Forms found: ${formData.length}`);
      for (const f of formData) {
        console.log(`Form ${f.idx} (action: ${f.action}, inputs: ${f.inputsCount}):`);
        for (const inp of f.inputs) {
          console.log(`  - [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" req=${inp.required} vis=${inp.visible}`);
        }
      }

      // Also check for iframes or captchas
      const iframesAndCaptchas = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe')).map(ifm => ifm.src);
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], .cf-turnstile, [class*="captcha"]')).map(c => c.outerHTML.substring(0, 150));
        return { iframes, captchas };
      });
      console.log('Iframes/Captchas:', iframesAndCaptchas);

    } catch (err) {
      console.log(`Error examining #${lead.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

examine();
