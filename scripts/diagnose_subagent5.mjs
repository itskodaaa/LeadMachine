import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4888, name: 'Metal Processors Inc.', url: 'https://www.metalprocessors.com/' },
  { id: 4889, name: 'Tampa Welding', url: 'https://www.tampaweld.com/' },
  { id: 4891, name: 'Elevation Design & Fabrication', url: 'https://www.elevationdf.com/contact-1' },
  { id: 4892, name: 'Tampa Steel Erecting Co', url: 'https://tampasteelerecting.com/' },
  { id: 4894, name: 'Tampa Weld | Avellan Metal Works', url: 'https://avellanmetalworks.com' },
  { id: 4898, name: 'AA Casey Co. | Tampa Bay', url: 'https://www.aacasey.com/' },
  { id: 4899, name: 'Hoffstetter Tool & Die', url: 'http://hoffstettertool.com' },
  { id: 4901, name: 'Integral Components Manufacturing Inc.', url: 'https://integralcomponents.net/' }
];

async function inspectLead(lead) {
  console.log(`\n==================================================`);
  console.log(`🔍 Inspecting #${lead.id}: ${lead.name} (${lead.url})`);
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1366,768']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(25000);
  page.setDefaultTimeout(20000);

  page.on('dialog', async d => {
    console.log(`[${lead.id} Dialog]: ${d.type()} - ${d.message()}`);
    await d.dismiss();
  });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('feedback') || u.includes('form') || u.includes('submit') || u.includes('wp-json') || u.includes('ajax')) {
      try {
        const text = await res.text();
        console.log(`[${lead.id} Response]: ${u.slice(0, 80)} -> HTTP ${res.status()} -> ${text.slice(0, 150)}`);
      } catch (_) {}
    }
  });

  try {
    const res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Loaded status: ${res ? res.status() : 'null'}, URL: ${page.url()}`);
    await new Promise(r => setTimeout(r, 2000));

    const analysis = await page.evaluate(() => {
      const contactLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => /contact|quote|reach|about/i.test(a.innerText || a.href))
        .map(a => ({ text: (a.innerText || '').trim(), href: a.href }));

      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0].trim());

      const captchas = {
        grecaptcha: !!(window.grecaptcha || document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]')),
        hcaptcha: !!(window.hcaptcha || document.querySelector('.h-captcha, iframe[src*="hcaptcha"]')),
        turnstile: !!(window.turnstile || document.querySelector('.cf-turnstile, iframe[src*="turnstile"]')),
        v3_hidden: !!document.querySelector('input[name*="recaptcha"], input[name*="g-recaptcha-response"]')
      };

      const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => {
        const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          required: el.required || false,
          visible: el.offsetParent !== null
        }));
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
          text: (b.innerText || b.value || '').trim(),
          type: b.type
        }));
        return {
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs,
          buttons
        };
      });

      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);

      return {
        title: document.title,
        bodyTextSnippet: document.body ? document.body.innerText.slice(0, 300).replace(/\s+/g, ' ') : '',
        mailtos: [...new Set(mailtos)],
        contactLinks: contactLinks.slice(0, 10),
        captchas,
        formCount: forms.length,
        forms,
        iframes: iframes.filter(s => s && !s.includes('google.com/maps') && !s.includes('analytics'))
      };
    });

    console.log(`Analysis for #${lead.id}:`, JSON.stringify(analysis, null, 2));

  } catch (err) {
    console.log(`Failed to load #${lead.id}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const lead of leads) {
    await inspectLead(lead);
  }
}

main();
