import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 4817, name: 'Irving Tool Manufacturing', url: 'https://irvingtool.com' },
  { id: 4818, name: 'Vertical Engineering Consulting & Construction', url: 'https://www.verticalengineeringcc.com/request-a-quote' },
  { id: 4819, name: 'Concord Engineering', url: 'https://concordeng.com' },
  { id: 4820, name: 'Peña Architecture and Engineering Corp.', url: 'https://paecorporation.com' },
  { id: 4821, name: 'Fortin Leavy Skiles Inc', url: 'https://flssurvey.com' },
  { id: 4822, name: 'F&J Engineering Group, Inc.', url: 'https://fj-group.com' },
  { id: 4823, name: 'Kline Engineering & Consulting', url: 'https://www.klineengineered.com/contact' },
  { id: 4824, name: 'Leiter, Perez & Associates Inc', url: 'https://leiterperez.com' },
  { id: 4825, name: 'SSN Engineering', url: 'https://ssnengineering.com' },
  { id: 4826, name: '360 Electrical & Engineering Services', url: 'https://360electricalservices.com' }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`[Lead #${lead.id}] ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    try {
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`HTTP Status: ${resp ? resp.status() : 'null'}, URL: ${page.url()}`);

      // Check forms, iframes, email links, and contact navigation links
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const fields = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute('aria-label')
          }));
          return {
            index: i,
            id: f.id,
            action: f.action,
            fieldsCount: fields.length,
            fields: fields.slice(0, 10),
            hasCaptcha: !!f.querySelector('.g-recaptcha, [src*="recaptcha"], [src*="turnstile"], [src*="hcaptcha"], iframe[src*="captcha"]')
          };
        });

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const contactLinks = Array.from(document.querySelectorAll('a')).filter(a => {
          const text = (a.innerText || '').toLowerCase();
          const href = (a.getAttribute('href') || '').toLowerCase();
          return text.includes('contact') || text.includes('quote') || href.includes('contact') || href.includes('quote');
        }).map(a => ({ text: a.innerText.trim(), href: a.href })).slice(0, 5);

        return { forms, iframes, emails, contactLinks, title: document.title };
      });

      console.log(`Title: ${info.title}`);
      console.log(`Forms found: ${info.forms.length}`);
      if (info.forms.length > 0) {
        console.log(`Forms detail:`, JSON.stringify(info.forms, null, 2));
      }
      if (info.iframes.length > 0) {
        console.log(`Iframes:`, info.iframes);
      }
      if (info.emails.length > 0) {
        console.log(`Emails:`, info.emails);
      }
      console.log(`Contact Links:`, info.contactLinks);

    } catch (e) {
      console.log(`Error navigating to ${lead.url}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectAll();
