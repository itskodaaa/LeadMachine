import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 2225, company: 'Sheet Metal Specialists', url: 'https://sheetmetalspecialists.com' },
  { id: 2230, company: 'Suri Steel', url: 'https://suristeel.com' },
  { id: 2233, company: 'Globe Stainless Inc', url: 'https://globestainless.com' },
  { id: 2236, company: 'Firm Designs', url: 'https://firmdesigns.us' },
  { id: 2238, company: 'JC Mobile Custom Welding', url: 'https://jcweldingrepair.com' },
  { id: 2246, company: 'America West Sheet Metal', url: 'https://americawestsheetmetal.com' },
  { id: 2249, company: 'Star Steel', url: 'https://starsteel.com' },
  { id: 2259, company: 'Macias Sheet Metal', url: 'https://maciassheetmetal.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  for (const lead of leads) {
    console.log(`\n================== Checking Lead #${lead.id}: ${lead.company} ==================`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Current URL:', page.url());
      console.log('Title:', await page.title());

      const data = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          className: f.className,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label'),
            dataAid: i.getAttribute('data-aid')
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
        }));

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|quote|about|touch/i.test(l.text) || /contact|quote/i.test(l.href));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          tagName: c.tagName,
          src: c.getAttribute('src'),
          sitekey: c.getAttribute('data-sitekey')
        }));

        const bodySnippet = document.body ? document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) : '';

        return { forms, links: links.slice(0, 5), captchas, bodySnippet };
      });

      console.log('Forms:', JSON.stringify(data.forms, null, 2));
      console.log('Relevant links:', data.links);
      console.log('Captchas:', data.captchas);
      console.log('Body snippet:', data.bodySnippet);
    } catch (e) {
      console.log('Error checking #' + lead.id + ':', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
