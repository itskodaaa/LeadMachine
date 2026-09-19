import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const targets = [
  { id: 1697, name: 'The Morgan Corporation', url: 'https://morgancorporation.net/contact-us/' },
  { id: 1704, name: 'Kempler Industries', url: 'https://kempler.com/contact-us' },
  { id: 1705, name: 'JB Manufacturing', url: 'https://jb-mfg.com/contact-us/' },
  { id: 1705, name: 'JB Manufacturing Home', url: 'https://jb-mfg.com/' },
  { id: 1712, name: 'Marvel Machining', url: 'https://marvelspeed.com/' },
  { id: 1719, name: 'Hattan Tool Co Inc', url: 'https://hattantool.com/' },
  { id: 1722, name: 'Euromextool, Inc.', url: 'https://www.euromextool.com/contact/' },
  { id: 1729, name: 'Oakley Industrial Machinery', url: 'https://oim-inc.com/contacts/' }
];

async function deepInspectBatch5() {
  for (const t of targets) {
    console.log(`\n==================================================`);
    console.log(`Deep Inspecting Lead #${t.id}: ${t.name} (${t.url})`);
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
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--window-size=1280,900'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      page.on('dialog', async d => {
        console.log(`[DIALOG]: ${d.type()} "${d.message()}"`);
        await d.accept();
      });

      let res;
      try {
        res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (err) {
        console.log(`Goto failed: ${err.message}`);
        continue;
      }

      await new Promise(r => setTimeout(r, 2500));
      console.log(`Final URL: ${page.url()} (Status: ${res ? res.status() : 'none'})`);

      // Extract emails
      const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
      const emails = [...new Set(pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
      const mailtos = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
      });
      const allEmails = [...new Set([...emails, ...mailtos])].filter(e => !e.includes('sentry') && !e.includes('example') && !e.includes('wix') && !e.includes('godaddy') && !e.includes('.png') && !e.includes('.jpg'));
      console.log(`Emails found: ${JSON.stringify(allEmails)}`);

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
              required: el.required,
              text: el.innerText ? el.innerText.trim().slice(0, 40) : '',
              label: el.labels && el.labels[0] ? el.labels[0].innerText.trim() : ''
            }))
          };
        });
      });

      console.log(`Forms found (${forms.length}):`);
      for (const f of forms) {
        console.log(`\n Form #${f.index} [id="${f.id}", action="${f.action}", class="${f.className}"]`);
        for (const el of f.elements) {
          if (el.type !== 'hidden') {
            console.log(`   * <${el.tag} type="${el.type}" name="${el.name}" id="${el.id}"> label="${el.label}" placeholder="${el.placeholder || el.text || ''}"`);
          }
        }
      }

    } catch (e) {
      console.error(`Error inspecting ${t.id}: ${e.message}`);
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }
  }
}

deepInspectBatch5().catch(console.error);
