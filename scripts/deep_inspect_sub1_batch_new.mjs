import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const targets = [
  { id: 5268, company: 'American Metal Specialties', url: 'https://apiams.com' },
  { id: 5276, company: 'PCC Structurals - Steel Building', url: 'https://pccstructurals.com' },
  { id: 5277, company: 'Epic Engineering Northwest, LLC', url: 'https://epicengineeringnw.com' },
  { id: 5280, company: 'T&M Design Inc.', url: 'https://tandmdesign.com' },
  { id: 5283, company: 'KIC Engineering Services, LLC', url: 'https://kicengineering.com' },
  { id: 5284, company: 'Energy 350', url: 'https://energy350.com' },
];

const SUCCESS_SIGNALS = [
  'thank you','thanks for contacting','thanks for reaching out','message has been sent',
  'we have received your','we will contact you','will get back to you','submission was successful',
  'submitted successfully','in touch shortly','inquiry received','form received',
  'successfully submitted','your message was sent','we will be in touch','sent successfully',
  'request received','quote requested'
];

async function inspectLead(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========== #${target.id} ${target.company} ==========`);
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    console.log(`  Homepage title: "${title}" | URL: ${page.url()}`);

    // Look for contact link
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const keywords = ['contact', 'get-in-touch', 'inquire', 'request-quote', 'quote', 'reach', 'estimate'];
      for (const k of keywords) {
        const match = links.find(a => {
          const href = a.getAttribute('href') || '';
          const text = (a.innerText || '').toLowerCase();
          return (text.includes(k) || href.toLowerCase().includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#');
        });
        if (match) return { href: match.href, text: match.innerText.trim() };
      }
      // return all links for debugging
      return { allLinks: links.slice(0, 20).map(a => ({ href: a.href, text: a.innerText.trim().substring(0,30) })) };
    });
    console.log(`  Contact link found:`, JSON.stringify(contactLink));

    // Navigate to contact page if found
    let contactUrl = page.url();
    if (contactLink?.href && !contactLink.href.startsWith('mailto:')) {
      await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      contactUrl = page.url();
      console.log(`  Contact page URL: ${contactUrl}`);
    }

    // Get page body text snippet
    const bodySnip = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
    console.log(`  Body snippet: ${bodySnip.substring(0, 300).replace(/\n/g, ' ')}`);

    // Detect forms
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        inputCount: f.querySelectorAll('input, textarea, select').length,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type || i.tagName,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        })),
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
        hasTurnstile: !!f.querySelector('.cf-turnstile, iframe[src*="turnstile"]'),
        hasHcaptcha: !!f.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
      }));
    });
    console.log(`  Forms found: ${formInfo.length}`);
    formInfo.forEach((f, i) => {
      console.log(`    Form #${i}: action=${f.action}, method=${f.method}, inputs=${f.inputCount}, captcha=${f.hasRecaptcha ? 'reCAPTCHA' : f.hasTurnstile ? 'Turnstile' : f.hasHcaptcha ? 'hCaptcha' : 'none'}`);
      f.inputs.slice(0,8).forEach(inp => console.log(`      - ${inp.type} name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`));
    });

    // Check mailto links
    const mailtoLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
    });
    if (mailtoLinks.length) console.log(`  Mailto links: ${mailtoLinks.join(', ')}`);

    // If unconfirmed before, try to submit again and capture result
    if ([5276, 5277, 5280, 5283].includes(target.id) && formInfo.some(f => f.inputCount >= 2 && !f.hasRecaptcha && !f.hasTurnstile && !f.hasHcaptcha)) {
      console.log(`  -> Attempting form fill & submit...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
          const name = (el.getAttribute('name') || '').toLowerCase();
          const id = (el.getAttribute('id') || '').toLowerCase();
          const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder}`;
          if (type === 'file' || type === 'hidden' || type === 'submit' || type === 'button') continue;
          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment')) {
            el.value = p.message; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (type === 'email' || combined.includes('email')) {
            el.value = p.email; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (type === 'tel' || combined.includes('phone') || combined.includes('tel')) {
            el.value = p.phone; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (combined.includes('first')) {
            el.value = p.firstName; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (combined.includes('last')) {
            el.value = p.lastName; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (combined.includes('name') && !combined.includes('company')) {
            el.value = p.fullName; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (combined.includes('company') || combined.includes('business') || combined.includes('org')) {
            el.value = p.company; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          } else if (combined.includes('subject') || combined.includes('topic')) {
            el.value = p.subject; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true}));
          }
        }
      }, OUTREACH_PROFILE);

      const preUrl = page.url();
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button'));
        const submitBtn = btns.find(b => {
          const t = (b.innerText || b.value || '').toLowerCase();
          const tp = (b.getAttribute('type') || '').toLowerCase();
          return tp === 'submit' || t.includes('submit') || t.includes('send') || t.includes('contact');
        });
        if (submitBtn) { submitBtn.click(); return; }
        const form = document.querySelector('form');
        if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit(); }
      });
      await new Promise(r => setTimeout(r, 5000));
      const postUrl = page.url();
      const postBody = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
      const successSignals = ['thank you','thanks for','message has been sent','we have received','will contact you','will get back','successfully submitted','in touch shortly','inquiry received','sent successfully'];
      const found = successSignals.find(s => postBody.includes(s));
      console.log(`  -> Post-submit URL: ${postUrl} (changed: ${preUrl !== postUrl})`);
      console.log(`  -> Success signal: ${found || 'NONE'}`);
      console.log(`  -> Post-submit body snippet: ${postBody.substring(0, 400).replace(/\n/g, ' ')}`);
    }

  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--ignore-certificate-errors']
  });
  for (const t of targets) {
    await inspectLead(browser, t);
  }
  await browser.close();
  console.log('\nDone.');
})();
