import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4466, name: 'Weiser Engineering', url: 'https://weiserengineering.com' },
  { id: 4468, name: 'Thomas & Hutton', url: 'https://thomasandhutton.com' },
  { id: 4469, name: 'SYMS Engineering', url: 'https://syms-e.com' },
  { id: 4470, name: 'Security Engineering Consultants', url: 'https://securityengineeringconsultants.com' },
  { id: 4471, name: 'HTS Advanced Solutions', url: 'https://hts-3d.com' },
  { id: 4472, name: 'McKinnon Engineering LLC', url: 'https://mckinnonengineering.com' },
  { id: 4473, name: 'SELCO USA, Inc.', url: 'https://selcousa.com' },
  { id: 4474, name: 'Skyline Engineering & Construction', url: 'https://skyline-ec.com' },
  { id: 4475, name: 'Clyde Industries Inc.', url: 'https://clyde-industries.com' },
  { id: 4476, name: 'Techwood Engineering', url: 'https://techwoodengineering.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      console.log(`\n==================================================`);
      console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
      
      let finalUrl = lead.url;
      try {
        const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        finalUrl = page.url();
        console.log(`Initial status: ${resp?.status()}, final URL: ${finalUrl}`);
      } catch (err) {
        console.log(`Failed initial load: ${err.message}`);
      }

      // Check for navigation/links to contact or quote
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText?.trim() || '',
          href: a.href
        })).filter(l => /contact|inquir|touch|about|quote|request/i.test(l.text) || /contact|inquir|reach|about|quote/i.test(l.href));
      });
      console.log(`Contact-like links found (${links.length}):`, links.slice(0, 8));

      // Inspect forms helper
      async function inspectForms(currentPage) {
        return await currentPage.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map((f, i) => {
            const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName,
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required,
              value: el.value,
              text: el.innerText?.trim(),
              visible: el.offsetWidth > 0 && el.offsetHeight > 0
            }));
            const captchas = Array.from(f.querySelectorAll('.g-recaptcha, .cf-turnstile, [data-sitekey], [class*="captcha"], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')).map(c => c.outerHTML.substring(0, 150));
            return {
              formIndex: i,
              id: f.id,
              name: f.name,
              action: f.action,
              method: f.method,
              classes: f.className,
              inputs,
              captchas
            };
          });
        });
      }

      let forms = await inspectForms(page);
      console.log(`Forms on current page (${page.url()}): ${forms.length}`);
      forms.forEach((f, idx) => {
        console.log(`  Form ${idx}: action="${f.action}" method="${f.method}" id="${f.id}" classes="${f.classes}" captchas=${JSON.stringify(f.captchas)}`);
        f.inputs.forEach(inp => {
          if (inp.visible || inp.required) {
            console.log(`    [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" req=${inp.required} vis=${inp.visible}`);
          }
        });
      });

      // If no contact forms on current page, check contact link
      if (!forms.some(f => f.inputs.some(i => i.tag === 'TEXTAREA' || /message|comments|email/i.test(i.name || i.placeholder)))) {
        const contactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
        if (contactLink && contactLink.href !== page.url()) {
          console.log(`Navigating to contact link: ${contactLink.href}`);
          try {
            await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
            console.log(`Arrived at: ${page.url()}`);
            forms = await inspectForms(page);
            console.log(`Forms on contact page (${page.url()}): ${forms.length}`);
            forms.forEach((f, idx) => {
              console.log(`  Form ${idx}: action="${f.action}" method="${f.method}" id="${f.id}" classes="${f.classes}" captchas=${JSON.stringify(f.captchas)}`);
              f.inputs.forEach(inp => {
                if (inp.visible || inp.required) {
                  console.log(`    [${inp.tag}:${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" req=${inp.required} vis=${inp.visible}`);
                }
              });
            });
          } catch (e) {
            console.log(`Failed navigating to contact page: ${e.message}`);
          }
        }
      }

      // Check email addresses visible on page
      const emails = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
        const textEmails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        return Array.from(new Set([...mailtos, ...textEmails]));
      });
      console.log(`Emails found:`, emails);

    } catch (err) {
      console.log(`Error processing lead #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
