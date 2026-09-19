import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targetPages = [
  { id: 4839, name: 'USA Tools', url: 'https://usatoolsinc.com' },
  { id: 4840, name: 'Master Tool Co.', url: 'https://mastertoolusa.com/contact-us/' },
  { id: 4841, name: 'Miller Tool & Die', url: 'https://miller-tool.com' },
  { id: 4842, name: 'Dewitt Tool Company Inc', url: 'https://www.dewitt-tool.com/contact' },
  { id: 4843, name: 'Unique Tool & Die LLC', url: 'https://utdllc.com/contact.htm' },
  { id: 4844, name: 'XStone LLC', url: 'https://maxirocas.com/contacto.html' },
  { id: 4846, name: 'DI-EL Tool & Manufacturing Inc.', url: 'https://dieltool.com/contact-us/' },
  { id: 4848, name: 'Royo Machinery USA, LLC', url: 'https://royomachinery.com/contacts/en' },
  { id: 4849, name: 'All Tools & Fastener', url: 'https://all-tool.net/contact-us/' },
  { id: 4850, name: 'AAA Tool & Saw Services', url: 'https://www.aaatool.net/contact' }
];

async function deepInspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of targetPages) {
    console.log(`\n==================================================`);
    console.log(`Deep Inspect Lead #${item.id}: ${item.name} -> ${item.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      const resp = await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 20000 });
      console.log(`Status: ${resp ? resp.status() : 'null'}, Final URL: ${page.url()}`);
    } catch (e) {
      console.log(`Load error: ${e.message}`);
    }

    const pageAnalysis = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText.replace(/\s+/g, ' ').slice(0, 500) : '';
      const emailLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      
      const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          required: el.required || false
        }));

        const recaptchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], [data-sitekey]')).map(r => ({
          tag: r.tagName,
          src: r.src || '',
          sitekey: r.getAttribute('data-sitekey') || ''
        }));

        const submitBtn = f.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"]), .btn-submit, .submit');
        const submitText = submitBtn ? (submitBtn.innerText || submitBtn.value || '') : '';

        return {
          formIndex: i,
          action: f.action,
          method: f.method,
          fieldsCount: fields.length,
          recaptchas,
          fields,
          submitText
        };
      });

      return {
        bodySnippet: bodyText,
        emailLinks,
        forms
      };
    });

    console.log(`Emails found:`, pageAnalysis.emailLinks);
    console.log(`Body snippet:`, pageAnalysis.bodySnippet);
    console.log(`Forms found (${pageAnalysis.forms.length}):`);
    for (const f of pageAnalysis.forms) {
      console.log(`- Form #${f.formIndex}: action=${f.action}, fieldsCount=${f.fieldsCount}, recaptchas=${f.recaptchas.length}`);
      console.log(`  Fields:`, JSON.stringify(f.fields));
    }

    await page.close();
  }

  await browser.close();
}

deepInspect().catch(console.error);
