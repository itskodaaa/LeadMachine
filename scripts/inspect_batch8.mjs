import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 2302, company: 'Rumsey Construction', url: 'https://rumseycr.com' },
  { id: 2303, company: 'Genesis Construction', url: 'https://genesiscoc.com' },
  { id: 2304, company: 'Blythe Construction', url: 'https://blytheconstruction.com' },
  { id: 2305, company: 'Zeal Construction', url: 'https://zealconstruction.us' },
  { id: 2306, company: 'Vannoy Construction', url: 'https://jrvannoy.com' },
  { id: 2307, company: 'Carocon Corporation', url: 'https://carocon.com' },
  { id: 2308, company: 'Cleveland Construction', url: 'https://clevelandconstruction.com' },
  { id: 2309, company: 'Miller Homes', url: 'https://millercarolinas.com' },
  { id: 2310, company: 'Seretta Construction', url: 'https://seretta.com' },
  { id: 2312, company: 'J.B. Stones Construction', url: 'https://jbstones.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================== Lead #${lead.id}: ${lead.company} ==================`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      console.log('Final URL:', page.url());
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
          sitekey: c.getAttribute('data-sitekey'),
          cls: c.className
        }));

        return { forms, links: links.slice(0, 5), captchas };
      });

      console.log('Forms:', JSON.stringify(data.forms, null, 2));
      console.log('Links:', data.links);
      console.log('Captchas:', data.captchas);

    } catch (e) {
      console.log('Error inspecting #' + lead.id + ':', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
