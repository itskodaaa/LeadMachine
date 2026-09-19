import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 1784, name: 'Sees Precision Machine', url: 'https://seesmachine.com' },
  { id: 1786, name: 'Cook Machine & Engineering', url: 'https://repairmachineengineering.com' },
  { id: 1787, name: 'Level 7 Fabrication', url: 'https://level7fabrication.com' },
  { id: 1788, name: 'Bullet Fabrication', url: 'https://bulletfabrication.com' },
  { id: 1792, name: 'Tool Specialty Co', url: 'https://toolspecialty.com' },
  { id: 1794, name: 'BOB LEWIS MACHINE CO.', url: 'https://boblewismachine.com' },
  { id: 1796, name: 'Fisher Machine & Grinding', url: 'https://fishermachine.com' },
  { id: 1797, name: 'JLD CNC Machining', url: 'https://jldcncmachining.com' }
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--ignore-certificate-errors',
      '--window-size=1280,800'
    ]
  });

  for (const t of targets) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n========================================\nChecking #${t.id} ${t.name}: ${t.url}`);
    
    let loaded = false;
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      loaded = true;
    } catch (e) {
      if (t.url.startsWith('https://')) {
        try {
          await page.goto(t.url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
        } catch (err) {}
      }
    }

    if (!loaded) {
      console.log(`❌ #${t.id} Inaccessible / Connection Failed`);
      await page.close();
      continue;
    }

    const title = await page.title();
    const finalUrl = page.url();
    console.log(`Title: "${title}", Current URL: ${finalUrl}`);

    // Check links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
        .filter(l => /contact|quote|about|reach|inquir/i.test(l.text) || /contact|quote|rfq/i.test(l.href));
    });
    console.log(`Relevant links found:`, links);

    // If there is a contact link and we are on home, let's also visit the contact link
    let contactUrl = finalUrl;
    const contactLink = links.find(l => /contact|quote/i.test(l.text) || /contact|quote/i.test(l.href));
    if (contactLink && contactLink.href !== finalUrl) {
      try {
        console.log(`Navigating to contact page: ${contactLink.href}`);
        await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        contactUrl = page.url();
      } catch (e) {
        console.log(`Failed to navigate to contact page: ${e.message}`);
      }
    }

    // Inspect forms on contactUrl
    const forms = await page.evaluate(() => {
      const formEls = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
      return {
        captchas,
        forms: formEls.map(f => ({
          id: f.id,
          className: f.className,
          action: f.getAttribute('action'),
          method: f.getAttribute('method'),
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }))
      };
    });

    console.log(`Forms & Captchas on ${contactUrl}:`, JSON.stringify(forms, null, 2));

    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
