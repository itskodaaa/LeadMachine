import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 5080, company: 'J L Precision', url: 'https://jlprecision.com' },
  { id: 5081, company: 'Uni Precision', url: 'https://uniprecision.com' },
  { id: 5082, company: 'Rapid Precision Mfg.', url: 'https://rapidprecision.us' },
  { id: 5083, company: 'Precision Polymer Engineering', url: 'https://prepol.com' },
  { id: 5085, company: 'JF Precision Inc', url: 'https://jfprecision.com' },
  { id: 5086, company: 'Accura Precision Inc', url: 'https://accuraprecisioninc.com' },
  { id: 5087, company: 'MMX Machining', url: 'https://mmxmachining.com' },
  { id: 5089, company: 'Master Precision Machining', url: 'https://master-precision.com' },
];

async function inspectSite(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });

  console.log(`\n========== #${target.id} ${target.company} ==========`);

  try {
    const urls = [target.url, target.url.replace('://', '://www.')];
    let loaded = false;
    for (const u of urls) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch(e) {}
    }
    if (!loaded) { console.log('SITE INACCESSIBLE'); await page.close(); return; }

    const pageUrl = page.url();
    const title = await page.title();
    console.log(`URL: ${pageUrl}`);
    console.log(`Title: ${title}`);

    // Find all links with contact/quote keywords
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const keywords = ['contact', 'quote', 'inquire', 'request', 'get-in-touch', 'estimate', 'reach'];
      return anchors
        .filter(a => {
          const href = a.getAttribute('href') || '';
          const text = (a.innerText || '').toLowerCase();
          return keywords.some(k => text.includes(k) || href.toLowerCase().includes(k))
            && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#');
        })
        .slice(0, 10)
        .map(a => ({ href: a.href, text: a.innerText.trim().substring(0, 50) }));
    });
    console.log('Contact-like links:', JSON.stringify(links, null, 2));

    // Check for forms on home page
    const homeForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        inputCount: f.querySelectorAll('input, textarea').length,
        inputs: Array.from(f.querySelectorAll('input:not([type=hidden]), textarea')).map(i => ({
          type: i.type || i.tagName,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        })).slice(0, 10),
        hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*=recaptcha], iframe[src*=hcaptcha], iframe[src*=turnstile], .cf-turnstile')
      }));
    });
    console.log(`Forms on homepage: ${homeForms.length}`);
    if (homeForms.length > 0) console.log(JSON.stringify(homeForms, null, 2));

    // Try navigating to contact page
    if (links.length > 0) {
      const contactUrl = links[0].href;
      console.log(`\nNavigating to contact link: ${contactUrl}`);
      try {
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await new Promise(r => setTimeout(r, 2000));
        const contactTitle = await page.title();
        const contactPageUrl = page.url();
        console.log(`Contact page: ${contactPageUrl} - "${contactTitle}"`);

        const contactForms = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          // Also check for mailto links
          const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
          return {
            formCount: forms.length,
            mailtoLinks,
            forms: forms.map(f => ({
              action: f.action,
              method: f.method,
              inputCount: f.querySelectorAll('input, textarea').length,
              inputs: Array.from(f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea')).map(i => ({
                type: i.type || i.tagName,
                name: i.name,
                id: i.id,
                placeholder: i.placeholder,
                label: document.querySelector(`label[for="${i.id}"]`)?.innerText || ''
              })).slice(0, 15),
              hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*=recaptcha], iframe[src*=hcaptcha], iframe[src*=turnstile], .cf-turnstile'),
              submitButtons: Array.from(f.querySelectorAll('button, input[type=submit]')).map(b => b.innerText || b.value)
            }))
          };
        });
        console.log('Contact page analysis:', JSON.stringify(contactForms, null, 2));

        // Check page text for any relevant hints
        const bodySnippet = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
        console.log(`Body snippet: ${bodySnippet}`);
      } catch(e) {
        console.log(`Error navigating to contact page: ${e.message}`);
      }
    }

  } catch(err) {
    console.log(`Error: ${err.message}`);
  }

  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  for (const target of targets) {
    await inspectSite(browser, target);
  }

  await browser.close();
  console.log('\n✅ Inspection complete.');
}

main().catch(console.error);
