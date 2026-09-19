import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const leads = [
  { id: 4092, name: 'Paramount Consulting & Engineering, LLC', domain: 'paramountce.com' },
  { id: 4093, name: 'OptaMiss Construction Consulting Engineers', domain: 'optamiss.com' },
  { id: 4094, name: 'CNC Supply USA', domain: 'cncsupplyusa.com' },
  { id: 4095, name: 'BEK Milling Solutions', domain: 'bekmilling.com' },
  { id: 4096, name: 'CNC Cutting services ZF', domain: 'zerofractal.com' },
  { id: 4097, name: 'Miami CNC Router', domain: 'miamicncrouter.com' },
  { id: 4099, name: 'Rapid Precision Machining and Fabrication', domain: 'rapidprecisionfl.com' },
  { id: 4103, name: 'ALM MACHINE INC', domain: 'almmachineshop.com' },
  { id: 4104, name: 'Bird Road Machine Shop', domain: 'birdroadmachine.com' },
  { id: 4105, name: 'Gregg Tool & Die Co', domain: 'greggtool.com' }
];

async function runOne(targetId) {
  const lead = leads.find(l => l.id === targetId);
  if (!lead) {
    console.log(`Lead ${targetId} not found`);
    return;
  }

  console.log(`\n==================================================`);
  console.log(`ANALYZING LEAD #${lead.id}: ${lead.name} (${lead.domain})`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Monitor network activity
  const responses = [];
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('contact') || url.includes('admin-ajax') || url.includes('wp-json') || url.includes('email') || url.includes('form') || url.includes('submit')) {
      let status = resp.status();
      let text = '';
      try {
        if (resp.headers()['content-type']?.includes('json') || resp.headers()['content-type']?.includes('text')) {
          text = (await resp.text()).slice(0, 300);
        }
      } catch (e) {}
      responses.push({ url, status, text });
      console.log(`  [HTTP ${status}] ${url.slice(0, 100)} => ${text.replace(/\s+/g, ' ')}`);
    }
  });

  page.on('dialog', async d => {
    console.log(`  [DIALOG] ${d.type()}: ${d.message()}`);
    await d.accept();
  });

  try {
    const tryUrls = [
      `https://${lead.domain}`,
      `https://www.${lead.domain}`,
      `http://${lead.domain}`,
      `http://www.${lead.domain}`
    ];

    let loaded = false;
    for (const u of tryUrls) {
      try {
        console.log(`  Trying ${u}...`);
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (e) {
        console.log(`  Failed ${u}: ${e.message}`);
      }
    }

    if (!loaded) {
      console.log(`  => RESULT: Site completely inaccessible`);
      await browser.close();
      return;
    }

    console.log(`  Current URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    // Look for contact pages
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = [];
      for (const a of links) {
        const h = a.href;
        const t = (a.innerText || '').trim();
        if (/contact|quote|touch|inquir/i.test(h) || /contact|quote|touch|inquir/i.test(t)) {
          if (!h.startsWith('mailto:') && !h.startsWith('tel:') && !found.some(x => x.href === h)) {
            found.push({ text: t, href: h });
          }
        }
      }
      return found;
    });

    console.log(`  Contact links found:`, contactLinks);

    // If on homepage and there's a contact link, let's navigate to contact link
    const isContactPage = /contact|quote|touch|inquir/i.test(page.url());
    if (!isContactPage && contactLinks.length > 0) {
      console.log(`  Navigating to contact link: ${contactLinks[0].href}`);
      try {
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        console.log(`  Loaded contact URL: ${page.url()}`);
      } catch (e) {
        console.log(`  Failed to load contact link: ${e.message}`);
      }
    }

    // Examine form fields and captchas
    const pageAnalysis = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const details = forms.map((f, idx) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          value: el.value
        }));
        return {
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputCount: inputs.length,
          inputs
        };
      });

      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
        tag: c.tagName,
        className: c.className,
        sitekey: c.getAttribute('data-sitekey') || '',
        src: c.getAttribute('src') || ''
      }));

      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      const text = document.body ? document.body.innerText.slice(0, 1000) : '';

      return { details, captchas, mailtos, textPreview: text };
    });

    console.log(`  Analysis:`, JSON.stringify(pageAnalysis, null, 2));

    // Try autofilling and submitting if there is a form and no visible captcha
    const formToSubmit = pageAnalysis.details.find(f => {
      if (f.inputCount < 2) return false;
      const textInputs = f.inputs.filter(i => ['text', 'email', 'tel', 'textarea'].includes(i.type) || i.tag === 'textarea');
      // If the only input is search 's', skip
      if (textInputs.length === 1 && (textInputs[0].name === 's' || textInputs[0].placeholder.toLowerCase().includes('search'))) {
        return false;
      }
      return textInputs.length >= 2;
    });
    if (!formToSubmit) {
      console.log(`  => RESULT: No contact form found on ${page.url()}`);
      await browser.close();
      return;
    }

    if (pageAnalysis.captchas.length > 0) {
      console.log(`  => RESULT: Captcha detected:`, pageAnalysis.captchas);
      await browser.close();
      return;
    }

    console.log(`  Attempting form autofill & submission on form #${formToSubmit.idx}...`);
    await page.evaluate((p, formIdx) => {
      const form = document.querySelectorAll('form')[formIdx];
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const combo = `${name} ${id} ${ph} ${label}`;

        if (type === 'file' || type === 'submit' || type === 'button' || type === 'reset') continue;
        // Honeypot check
        if (name.includes('gotcha') || name.includes('honeypot') || name.includes('[hp]') || el.tabIndex === -1 || el.offsetWidth === 0) continue;

        if (el.tagName.toLowerCase() === 'textarea' || combo.includes('message') || combo.includes('comment') || combo.includes('detail') || combo.includes('notes')) {
          el.value = p.message;
        } else if (type === 'email' || combo.includes('email')) {
          el.value = p.email;
        } else if (type === 'tel' || combo.includes('phone') || combo.includes('tel')) {
          el.value = p.phone;
        } else if (combo.includes('first') || combo.includes('fname')) {
          el.value = p.firstName;
        } else if (combo.includes('last') || combo.includes('lname')) {
          el.value = p.lastName;
        } else if (combo.includes('company') || combo.includes('business')) {
          el.value = p.company;
        } else if (combo.includes('name')) {
          el.value = p.fullName;
        } else if (combo.includes('subject') || combo.includes('topic')) {
          el.value = p.subject;
        } else if (combo.includes('city')) {
          el.value = p.city;
        } else if (combo.includes('zip')) {
          el.value = p.zip;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE, formToSubmit.idx);

    // Wait 1s
    await new Promise(r => setTimeout(r, 1000));

    // Submit form
    console.log(`  Submitting form...`);
    const initialUrl = page.url();
    await page.evaluate((formIdx) => {
      const form = document.querySelectorAll('form')[formIdx];
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');
      if (submitBtn) {
        submitBtn.click();
      } else if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
    }, formToSubmit.idx);

    // Wait up to 6 seconds for responses and DOM updates
    await new Promise(r => setTimeout(r, 6000));

    const postSubmit = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyText: document.body ? document.body.innerText.slice(0, 1500) : '',
        alerts: Array.from(document.querySelectorAll('.alert, [role="alert"], .wpcf7-response-output, .elementor-message, .success, .error')).map(x => x.innerText.trim())
      };
    });

    console.log(`  Post submit URL: ${postSubmit.url}`);
    console.log(`  Post submit alerts:`, postSubmit.alerts);
    console.log(`  Post submit text sample:`, postSubmit.bodyText.slice(0, 400).replace(/\n+/g, ' '));

  } catch (err) {
    console.log(`  Exception: ${err.message}`);
  } finally {
    await browser.close();
  }
}

const targetLead = parseInt(process.argv[2], 10);
if (targetLead) {
  runOne(targetLead).catch(console.error);
} else {
  (async () => {
    for (const l of leads) {
      await runOne(l.id);
    }
  })();
}
