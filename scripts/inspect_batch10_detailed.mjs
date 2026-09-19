import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 2036, name: 'Katy Custom Metal', url: 'https://katymetal.com' },
  { id: 2049, name: 'RCW AND FABRICATION', url: 'https://rcwandfabrication.com' },
  { id: 2058, name: 'Canopy Solutions', url: 'https://canopy-solutions.com' },
  { id: 2073, name: 'South Texas Sheet Metal', url: 'https://southtexassheetmetal.com' },
  { id: 2097, name: 'Mason Road Sheet Metal', url: 'https://mrsheetmetal.com' },
  { id: 2101, name: 'M & M Manufacturing', url: 'https://mmmfg.com' },
  { id: 2103, name: 'Hollywood Steel Inc', url: 'https://hollywoodsteel.com' },
  { id: 2108, name: 'Moore Fabrication', url: 'https://moorefabrication.com' },
  { id: 2116, name: 'G&H Diversified Manufacturing', url: 'https://ghdiv.com' },
  { id: 2126, name: 'B Metal Fabrication', url: 'https://bmetalfabrication.com' }
];

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n========================================\n[#${lead.id}] ${lead.name} (${lead.url})`);

    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));

      const pageTitle = await page.title();
      const currentUrl = page.url();

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
          .filter(l => /contact|quote|about|reach|inquir|estimate/i.test(l.text) || /contact|quote|rfq/i.test(l.href));
      });

      let targetUrl = currentUrl;
      const contactLink = links.find(l => /contact|quote|inquir/i.test(l.text) || /contact|quote|inquir/i.test(l.href));
      if (contactLink && contactLink.href !== currentUrl) {
        try {
          await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
          targetUrl = page.url();
        } catch (e) {}
      }

      const formDetails = await page.evaluate(() => {
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 80));
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          className: f.className,
          action: f.getAttribute('action'),
          method: f.getAttribute('method'),
          inputCount: f.querySelectorAll('input:not([type="hidden"]), textarea').length,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            type: i.type
          }))
        }));
        return { captchas, forms };
      });

      console.log(`Target URL: ${targetUrl} ("${pageTitle}")`);
      console.log(`Form details:`, JSON.stringify(formDetails, null, 2));

    } catch (e) {
      console.log(`Failed #${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectLeads().catch(console.error);
