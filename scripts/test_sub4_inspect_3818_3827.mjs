import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3818, name: 'Wilson Structural', url: 'https://wilsonstructural.com' },
  { id: 3819, name: 'Structural Engineering & Inspections', url: 'https://seiflorida.com' },
  { id: 3820, name: 'Tampa Bay Engineer Incorporated', url: 'https://tampabayengineer.com' },
  { id: 3821, name: 'McNeal Engineering Inc', url: 'https://mcnealengineering.com' },
  { id: 3822, name: 'Otero Engineering, Inc.', url: 'https://oteroengineering.com' },
  { id: 3823, name: 'Mendieta Structural Consulting, Inc.', url: 'https://mendietastructural.com' },
  { id: 3824, name: 'Mohan Engineering, Inc.', url: 'https://mohaneng.com' },
  { id: 3825, name: 'Commercial Site Solutions, Inc.', url: 'https://css-eng.com' },
  { id: 3826, name: 'Oasis Engineering', url: 'https://oasisengineering.com' },
  { id: 3827, name: 'Helicon', url: 'https://heliconusa.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      console.log(`\n========================================\n[#${lead.id}] ${lead.name} (${lead.url})`);
      
      let res;
      try {
        res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e) {
        console.log(`Failed to load ${lead.url}: ${e.message}`);
      }

      const info = await page.evaluate(() => {
        const title = document.title;
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            name: el.name,
            type: el.type,
            placeholder: el.placeholder,
            id: el.id
          }))
        }));

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|about|touch|reach|estimate|quote|connect/i.test(l.text) || /contact|about|touch|reach|estimate|quote|connect/i.test(l.href));

        const captchas = {
          hasRecaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
          hasHcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          hasTurnstile: !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]')
        };

        const emails = (document.body ? document.body.innerText : '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];

        return { title, forms, links: links.slice(0, 10), captchas, emails: [...new Set(emails)].slice(0, 5) };
      });

      console.log('Title:', info.title);
      console.log('Forms on home:', info.forms.length);
      if (info.forms.length > 0) {
        console.log('Forms details:', JSON.stringify(info.forms, null, 2));
      }
      console.log('Captchas on home:', info.captchas);
      console.log('Contact links:', info.links);
      console.log('Emails:', info.emails);

      // If contact link exists, visit the first contact link
      const contactLink = info.links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      if (contactLink && contactLink.href !== page.url()) {
        console.log(`Navigating to contact page: ${contactLink.href}`);
        try {
          await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          const contactInfo = await page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
              idx: i,
              id: f.id,
              action: f.action,
              inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                id: el.id
              }))
            }));
            const captchas = {
              hasRecaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
              hasHcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
              hasTurnstile: !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]')
            };
            const emails = (document.body ? document.body.innerText : '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            return { forms, captchas, emails: [...new Set(emails)].slice(0, 5) };
          });
          console.log('Forms on contact page:', contactInfo.forms.length);
          if (contactInfo.forms.length > 0) {
            console.log('Contact page forms details:', JSON.stringify(contactInfo.forms, null, 2));
          }
          console.log('Captchas on contact page:', contactInfo.captchas);
          console.log('Contact page emails:', contactInfo.emails);
        } catch (e) {
          console.log(`Failed to navigate to contact page: ${e.message}`);
        }
      }

    } catch (err) {
      console.log(`Error processing #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
