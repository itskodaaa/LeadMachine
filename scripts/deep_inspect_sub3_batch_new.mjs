/**
 * Deep inspection of unconfirmed / no-form leads from Sub-Agent 3 batch
 * Leads: 5309, 5311, 5315, 5316, 5317, 5318, 5319, 5320
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const TARGETS = [
  { id: 5309, company: 'West Side Electric Company', url: 'https://westsideelectric.com' },
  { id: 5311, company: 'MKE & Associates', url: 'https://mke-inc.com' },
  { id: 5315, company: 'Rose City Electric Co', url: 'https://rosecityelectricco.com' },
  { id: 5316, company: 'Hood-Mc Nees Inc', url: 'https://hmcnees.com' },
  { id: 5317, company: 'Phoenix', url: 'https://phoenixpdx.com' },
  { id: 5318, company: 'Portland Electrical Construction, Inc', url: 'https://portlandelectrical.com' },
  { id: 5319, company: 'Badger Electric', url: 'https://badgerelectricinc.com' },
  { id: 5320, company: 'KCL Engineering', url: 'https://kclengineering.com' },
];

async function inspectSite(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    // Try homepage
    let loaded = false;
    for (const u of [target.url, target.url.replace('://', '://www.')]) {
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch(e) {}
    }

    if (!loaded) {
      console.log(`\n[#${target.id}] ${target.company}: INACCESSIBLE`);
      await page.close();
      return;
    }

    const homeUrl = page.url();
    const homeTitle = await page.title();

    // Find all navigation/contact links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: (a.innerText || '').trim().substring(0, 50), href: a.href }))
        .filter(l => l.href && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.startsWith('javascript:'))
        .filter(l => {
          const t = l.text.toLowerCase();
          const h = l.href.toLowerCase();
          return t.includes('contact') || t.includes('quote') || t.includes('estimate') || t.includes('request') ||
                 h.includes('contact') || h.includes('quote') || h.includes('estimate') || h.includes('request') || h.includes('touch');
        })
        .slice(0, 10);
    });

    // Check for forms on home page
    const homeForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        inputs: f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea').length,
        hasEmail: !!f.querySelector('input[type=email], input[name*=email], input[id*=email]'),
        hasSubmit: !!f.querySelector('button[type=submit], input[type=submit], button'),
        iframes: document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]').length
      }));
    });

    // Check for mailto only
    const hasMailtoOnly = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const hasMailto = links.some(l => l.href.startsWith('mailto:'));
      const hasForms = document.querySelectorAll('form').length > 0;
      const hasContactLink = links.some(l => {
        const h = l.href.toLowerCase();
        const t = (l.innerText || '').toLowerCase();
        return (h.includes('contact') || t.includes('contact')) && !l.href.startsWith('mailto:');
      });
      return { hasMailto, hasForms, hasContactLink };
    });

    console.log(`\n[#${target.id}] ${target.company}`);
    console.log(`  URL: ${homeUrl} | Title: "${homeTitle}"`);
    console.log(`  Home forms: ${JSON.stringify(homeForms)}`);
    console.log(`  Mailto/Contact status: ${JSON.stringify(hasMailtoOnly)}`);
    console.log(`  Contact links found: ${JSON.stringify(links)}`);

    // Try visiting contact links
    if (links.length > 0) {
      for (const link of links.slice(0, 3)) {
        try {
          await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 12000 });
          const contactTitle = await page.title();
          const contactForms = await page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form'));
            return forms.map(f => ({
              action: f.action,
              inputs: f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea').length,
              hasEmail: !!f.querySelector('input[type=email], input[name*=email], input[id*=email]'),
              captcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'),
              iframe_wufoo: !!document.querySelector('iframe[src*="wufoo"]'),
              iframe_jotform: !!document.querySelector('iframe[src*="jotform"]')
            }));
          });
          const bodySnippet = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || '');
          console.log(`  >> Contact page: ${page.url()} | "${contactTitle}"`);
          console.log(`     Forms: ${JSON.stringify(contactForms)}`);
          console.log(`     Body snippet: ${bodySnippet.substring(0, 200).replace(/\n/g, ' ')}`);
          if (contactForms.some(f => f.inputs >= 2)) break;
        } catch(e) {
          console.log(`  >> Error visiting ${link.href}: ${e.message}`);
        }
      }
    }

  } catch(e) {
    console.log(`[#${target.id}] ERROR: ${e.message}`);
  }

  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--ignore-certificate-errors']
  });

  for (const target of TARGETS) {
    await inspectSite(browser, target);
  }

  await browser.close();
  console.log('\n✅ Deep inspection complete.');
}

main().catch(console.error);
