import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4092, name: 'Paramount Consulting & Engineering, LLC', url: 'https://paramountce.com' },
  { id: 4093, name: 'OptaMiss Construction Consulting Engineers', url: 'https://optamiss.com' },
  { id: 4094, name: 'CNC Supply USA', url: 'https://cncsupplyusa.com' },
  { id: 4095, name: 'BEK Milling Solutions', url: 'https://bekmilling.com' },
  { id: 4096, name: 'CNC Cutting services ZF', url: 'https://zerofractal.com' },
  { id: 4097, name: 'Miami CNC Router', url: 'https://miamicncrouter.com' },
  { id: 4099, name: 'Rapid Precision Machining and Fabrication', url: 'https://rapidprecisionfl.com' },
  { id: 4103, name: 'ALM MACHINE INC', url: 'https://almmachineshop.com' },
  { id: 4104, name: 'Bird Road Machine Shop', url: 'https://birdroadmachine.com' },
  { id: 4105, name: 'Gregg Tool & Die Co', url: 'https://greggtool.com' }
];

async function inspectSite(browser, lead) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========================================`);
  console.log(`[#${lead.id}] ${lead.name} -> ${lead.url}`);

  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('admin-ajax') || u.includes('wp-json') || u.includes('contact') || u.includes('form') || u.includes('submit')) {
      console.log(`  [Network] ${resp.status()} ${u.slice(0, 110)}`);
    }
  });

  try {
    let targetUrl = lead.url;
    let res = null;
    try {
      res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.log(`  Direct goto failed: ${e.message}, trying http/www...`);
      try {
        targetUrl = targetUrl.replace('https://', 'http://www.');
        res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e2) {
        console.log(`  Retry failed: ${e2.message}`);
        await page.close();
        return;
      }
    }

    console.log(`  Loaded URL: ${page.url()} (Status: ${res ? res.status() : 'none'})`);
    console.log(`  Title: ${await page.title()}`);

    // Check forms, captchas, mailtos, links
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
        return {
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder
          }))
        };
      });

      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
        tag: c.tagName,
        src: c.getAttribute('src') || '',
        class: c.className
      }));

      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.innerText.trim().replace(/\s+/g, ' '),
        href: a.href
      })).filter(a => /contact|quote|about|reach|touch|estimate|inquiry/i.test(a.text) || /contact|quote|about|reach|touch/i.test(a.href));

      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

      return { forms, captchas, links: links.slice(0, 10), mailtos };
    });

    console.log(`  Forms count: ${info.forms.length}`);
    if (info.forms.length > 0) {
      console.log('  Forms:', JSON.stringify(info.forms, null, 2));
    }
    if (info.captchas.length > 0) {
      console.log('  Captchas detected:', JSON.stringify(info.captchas, null, 2));
    }
    console.log('  Relevant links:', JSON.stringify(info.links, null, 2));
    console.log('  Mailtos:', JSON.stringify(info.mailtos, null, 2));

  } catch (err) {
    console.log(`  Error: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    for (const lead of leads) {
      await inspectSite(browser, lead);
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
