import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Precision CNC Machining & Manufacturing Capabilities Inquiry',
  message: `Hello,\n\nI am reaching out on behalf of Northeast Precision Machinery, Inc. We specialize in precision CNC machining, tooling, and custom components for industrial applications.\n\nWe are currently expanding our supplier and machining partner network and would like to learn more about your available production capacity, equipment capabilities, and standard lead times. Could you please direct me to the appropriate person on your quoting or engineering team to discuss potential subcontract or partnership opportunities?\n\nThank you,\nPamela Jameson\nNortheast Precision Machinery, Inc.\nPhone: 708-568-3708\nEmail: pamela.jameson@nortiheastprecision.com`
};

const targets = [
  { id: 1481, name: 'Axis Machine Works, Inc.', url: 'https://axismachineworks.com/contact-us' },
  { id: 1482, name: 'Dallas Precision Machining “DPM”', url: 'https://dallasprecisionmachining.com/' },
  { id: 1485, name: 'Dallas Fabrication', url: 'https://www.dallasfab.com/' },
  { id: 1486, name: 'North Texas Machine Tool Group', url: 'https://billor.com/contact' },
  { id: 1487, name: 'P & W Machine Inc', url: 'https://www.pwmachine.com/locations-contact/' },
  { id: 1489, name: 'Centralized Production, LLC', url: 'https://centralizedproduction.com/contact-us.html' },
  { id: 1491, name: 'Felder Group USA', url: 'https://www.felder-group.com/en-us/contact' },
  { id: 1493, name: 'East Dallas Welding & Machining', url: 'https://valentidesign.net/contact' },
  { id: 1494, name: 'ACCUFAST STEEL & WELDING SUPPLY', url: 'https://accufaststeel.com/contact/' }
];

async function deepInspect() {
  for (const target of targets) {
    console.log(`\n==================================================`);
    console.log(`Deep Inspecting Lead #${target.id}: ${target.name} (${target.url})`);
    console.log(`==================================================`);

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--window-size=1280,900'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      page.on('dialog', async dialog => {
        console.log(`[ALERT/DIALOG]: ${dialog.type()} "${dialog.message()}"`);
        await dialog.accept();
      });

      page.on('response', async res => {
        const u = res.url();
        if (u.includes('admin-ajax.php') || u.includes('wpcf7') || u.includes('contact') || u.includes('form') || u.includes('submit')) {
          try {
            const text = await res.text();
            console.log(`[NET RESPONSE] ${res.status()} ${u.slice(0, 80)} -> ${text.slice(0, 120)}`);
          } catch (_) {}
        }
      });

      let res;
      try {
        res = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (err) {
        console.log(`Failed to load ${target.url}: ${err.message}`);
        continue;
      }

      await new Promise(r => setTimeout(r, 2000));
      console.log(`Final URL: ${page.url()} (Status: ${res ? res.status() : 'none'})`);

      // Extract emails
      const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
      const emails = [...new Set(pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
      const mailtos = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
      });
      const allEmails = [...new Set([...emails, ...mailtos])].filter(e => !e.includes('sentry') && !e.includes('example') && !e.includes('wix') && !e.includes('godaddy') && !e.includes('.png') && !e.includes('.jpg'));
      console.log(`Emails on contact page: ${JSON.stringify(allEmails)}`);

      // Captchas
      const captchaInfo = await page.evaluate(() => {
        const recaptcha = document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]');
        const turnstile = document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare.com"]');
        const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        return {
          recaptcha: !!recaptcha,
          recaptchaKey: recaptcha ? recaptcha.getAttribute('data-sitekey') : null,
          turnstile: !!turnstile,
          hcaptcha: !!hcaptcha
        };
      });
      console.log(`Captcha check:`, captchaInfo);

      // Forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            id: f.id,
            action: f.action,
            className: f.className,
            elements: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              ariaLabel: el.getAttribute('aria-label'),
              dataAid: el.getAttribute('data-aid'),
              required: el.required,
              text: el.innerText ? el.innerText.trim() : ''
            }))
          };
        });
      });

      console.log(`Forms found (${forms.length}):`);
      for (const f of forms) {
        console.log(`\n Form #${f.index} [id="${f.id}", action="${f.action}", class="${f.className}"]`);
        for (const el of f.elements) {
          console.log(`   * <${el.tag} type="${el.type}" name="${el.name}" id="${el.id}" data-aid="${el.dataAid}" req=${el.required}> ${el.placeholder || el.text || ''}`);
        }
      }

      // Check GoDaddy widgets if 0 regular forms
      if (forms.length === 0) {
        const godaddyFields = await page.evaluate(() => {
          const aids = Array.from(document.querySelectorAll('[data-aid*="FORM"], [data-aid*="CONTACT"]')).map(el => ({
            tag: el.tagName.toLowerCase(),
            dataAid: el.getAttribute('data-aid'),
            id: el.id,
            name: el.name,
            text: el.innerText ? el.innerText.slice(0, 30) : ''
          }));
          return aids;
        });
        if (godaddyFields.length > 0) {
          console.log(`GoDaddy Data-Aid elements found:`, godaddyFields);
        }
      }

    } catch (err) {
      console.error(`Error inspecting ${target.id}: ${err.message}`);
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }
  }
}

deepInspect().catch(console.error);
