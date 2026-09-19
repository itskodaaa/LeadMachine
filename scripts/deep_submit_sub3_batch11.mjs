import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const SUCCESS_SIGNALS = [
  'thank you','thanks for contacting','thanks for reaching out','message has been sent',
  'we have received your','we will contact you','will get back to you','submission was successful',
  'submitted successfully','in touch shortly','inquiry received','form received',
  'successfully submitted','your message was sent','we will be in touch','sent successfully',
  'request received','quote requested','message received','contact received',
  'we\'ll be in touch','received your inquiry','received your message'
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
}

async function launchBrowser() {
  return await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--ignore-certificate-errors','--window-size=1280,800']
  });
}

async function inspectSite(browser, leadId, companyName, website) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========== #${leadId} ${companyName} ==========`);
  console.log(`URL: ${website}`);

  try {
    // Try homepage
    await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const homeUrl = page.url();
    const homeTitle = await page.title();
    console.log(`Home: ${homeUrl} | Title: ${homeTitle}`);

    // Gather all forms and links
    const pageInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const links = Array.from(document.querySelectorAll('a[href]'));
      
      const formInfo = forms.map(f => ({
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || 'GET',
        inputCount: f.querySelectorAll('input, textarea, select').length,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({
          type: i.type || i.tagName,
          name: i.name || '',
          id: i.id || '',
          placeholder: i.placeholder || ''
        }))
      }));

      const contactLinks = links
        .filter(a => {
          const h = a.getAttribute('href') || '';
          const t = (a.innerText || '').toLowerCase();
          return (t.includes('contact') || h.includes('contact') || t.includes('quote') || h.includes('quote'))
            && !h.startsWith('mailto:') && !h.startsWith('tel:');
        })
        .map(a => ({ href: a.href, text: (a.innerText || '').trim() }))
        .slice(0, 5);

      const allLinks = links.map(a => a.href).filter(h => !h.startsWith('mailto:') && !h.startsWith('tel:')).slice(0, 20);

      return { forms: formInfo, contactLinks, allLinks };
    });

    console.log(`Forms on homepage: ${pageInfo.forms.length}`);
    pageInfo.forms.forEach((f, i) => console.log(`  Form ${i}: action=${f.action}, inputs=${f.inputCount}, fields=${JSON.stringify(f.inputs.map(x=>x.name||x.placeholder))}`));
    console.log(`Contact links: ${JSON.stringify(pageInfo.contactLinks)}`);

    // Try contact page if no form found
    let targetPage = homeUrl;
    let contactUrl = null;

    if (pageInfo.contactLinks.length > 0) {
      contactUrl = pageInfo.contactLinks[0].href;
    } else {
      // Try common contact paths
      const base = new URL(homeUrl).origin;
      const paths = ['/contact', '/contact-us', '/get-in-touch', '/quote', '/request-quote'];
      for (const p of paths) {
        try {
          const r = await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 8000 });
          if (r && r.ok()) {
            const hasForm = await page.evaluate(() => document.querySelectorAll('form input, form textarea').length > 0);
            if (hasForm) { contactUrl = page.url(); break; }
          }
        } catch(e) {}
      }
    }

    if (contactUrl && contactUrl !== homeUrl) {
      console.log(`Navigating to contact: ${contactUrl}`);
      await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      targetPage = page.url();
    }

    await page.waitForTimeout(2000);

    const formDetection = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const formData = forms.map(f => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select'));
        return {
          action: f.getAttribute('action') || '',
          method: (f.getAttribute('method') || 'GET').toUpperCase(),
          inputCount: inputs.length,
          visibleInputCount: inputs.filter(i => !['hidden','submit','button'].includes(i.type)).length,
          hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .cf-turnstile'),
          inputs: inputs.filter(i => !['hidden','submit','button'].includes(i.type)).map(i => ({
            type: i.type || i.tagName.toLowerCase(),
            name: i.name || '',
            id: i.id || '',
            placeholder: i.placeholder || '',
            required: i.required
          }))
        };
      });
      return formData;
    });

    console.log(`Forms on target page (${targetPage}):`);
    formDetection.forEach((f, i) => {
      console.log(`  Form ${i}: action=${f.action}, method=${f.method}, visibleInputs=${f.visibleInputCount}, hasCaptcha=${f.hasCaptcha}`);
      f.inputs.forEach(inp => console.log(`    - ${inp.type} name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}" required=${inp.required}`));
    });

    await page.close();
    return { leadId, company: companyName, url: website, targetPage, forms: formDetection };

  } catch (e) {
    console.log(`Error: ${e.message}`);
    await page.close().catch(() => {});
    return { leadId, company: companyName, url: website, error: e.message };
  }
}

// TARGETED SUBMIT FUNCTIONS
async function submitEsmeralizedElectric(browser) {
  // #5105 - esmeralizedelectric.com - unconfirmed
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5105 Esmeralized Electric targeted submit ---');
    await page.goto('https://esmeralizedelectric.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Look for contact link
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(a => (a.href || '').toLowerCase().includes('contact') && !a.href.startsWith('mailto:'));
      return found ? found.href : null;
    });
    if (contactLink) {
      await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    }
    
    await page.waitForTimeout(2000);
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({name: i.name, id: i.id, type: i.type, placeholder: i.placeholder}))
      }));
    });
    console.log('Forms:', JSON.stringify(formInfo, null, 2));
    
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasCaptcha = await page.evaluate(() => !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'));
    
    if (hasCaptcha) {
      console.log('#5105: CAPTCHA detected, cannot submit');
      saveResult(5105, 'unable_to_reach', `Contact form: ${page.url()} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5105, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }

    // Fill all form fields
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (el.tagName === 'TEXTAREA' && nativeTextareaSetter) {
          nativeTextareaSetter.call(el, value);
        } else if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, value);
        } else {
          el.value = value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'));
      for (const el of inputs) {
        const combined = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const full = combined + ' ' + label;
        
        if (el.tagName === 'TEXTAREA' || full.includes('message') || full.includes('comment') || full.includes('detail') || full.includes('how can')) {
          fillField(el, p.message);
        } else if (full.includes('email')) {
          fillField(el, p.email);
        } else if (full.includes('phone') || full.includes('tel')) {
          fillField(el, p.phone);
        } else if (full.includes('first')) {
          fillField(el, p.firstName);
        } else if (full.includes('last')) {
          fillField(el, p.lastName);
        } else if (full.includes('name') && !full.includes('company')) {
          fillField(el, p.fullName);
        } else if (full.includes('company') || full.includes('business') || full.includes('organization')) {
          fillField(el, p.company);
        } else if (full.includes('subject') || full.includes('topic')) {
          fillField(el, p.subject);
        }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    
    const preSubmitUrl = page.url();
    
    // Try to submit
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], button'));
      const submitBtn = btns.find(b => {
        const t = (b.innerText || b.value || '').toLowerCase();
        const type = b.getAttribute('type') || '';
        return type === 'submit' || t.includes('send') || t.includes('submit') || t.includes('contact');
      });
      if (submitBtn) submitBtn.click();
      else {
        const form = document.querySelector('form');
        if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
      }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preSubmitUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5105 post-submit URL: ${postUrl}`);
    console.log(`#5105 success detected: ${confirmed || urlChange}`);
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL redirect: ${postUrl}`;
      saveResult(5105, 'contacted', `Contact form: ${preSubmitUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5105, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      // check for partial success
      const snippet = postText.substring(0, 400);
      console.log(`#5105 page text snippet: ${snippet}`);
      saveResult(5105, 'unable_to_reach', `Contact form: ${preSubmitUrl} (No confirmation detected after submit. Post-URL: ${postUrl})`);
      await page.close();
      return { id: 5105, status: 'unable_to_reach', result: 'No confirmation detected' };
    }
  } catch (e) {
    console.log(`#5105 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5105, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitCAElectrical(browser) {
  // #5106 - caelectricalgroup.com - validation error "this field is required"
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5106 CA Electrical Group 24/7 targeted submit ---');
    await page.goto('https://caelectricalgroup.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    if (contactLink) await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        id: f.id,
        class: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name, id: i.id, type: i.type || i.tagName.toLowerCase(),
          placeholder: i.placeholder, required: i.required, value: i.value
        }))
      }));
    });
    console.log('CA Electrical forms:', JSON.stringify(formInfo, null, 2));
    
    const hasCaptcha = await page.evaluate(() => !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'));
    if (hasCaptcha) {
      console.log('#5106: CAPTCHA detected');
      saveResult(5106, 'unable_to_reach', `Contact form: ${page.url()} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5106, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    // Fill all visible required fields carefully with native setters
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
      for (const el of inputs) {
        if (el.closest('.hs-form-field') && el.type === 'hidden') continue;
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('notes')) {
          fillField(el, p.message);
        } else if (combined.includes('email')) {
          fillField(el, p.email);
        } else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') {
          fillField(el, p.phone);
        } else if (combined.includes('first')) {
          fillField(el, p.firstName);
        } else if (combined.includes('last')) {
          fillField(el, p.lastName);
        } else if (combined.includes('name') && !combined.includes('company') && !combined.includes('user') && !combined.includes('username')) {
          fillField(el, p.fullName);
        } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
          fillField(el, p.company);
        } else if (combined.includes('subject') || combined.includes('topic')) {
          fillField(el, p.subject);
        } else if (el.tagName === 'SELECT' && el.options.length > 1) {
          el.selectedIndex = 1;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    // Submit
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => {
        const t = (b.innerText || '').toLowerCase();
        return t.includes('send') || t.includes('submit') || t.includes('contact');
      });
      if (btn) { btn.click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const errText = await page.evaluate(() => {
      const errEls = document.querySelectorAll('.error, .wpcf7-not-valid-tip, .hs-error-msgs, .validation-error, [aria-invalid="true"]');
      return Array.from(errEls).map(e => e.innerText).join(' | ');
    });
    
    console.log(`#5106 errors: ${errText}`);
    console.log(`#5106 post-url: ${postUrl}`);
    
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success'));
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5106, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5106, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5106, 'unable_to_reach', `Contact form: ${preUrl} (Validation error persists or no confirmation. Errors: ${errText || 'none'})`);
      await page.close();
      return { id: 5106, status: 'unable_to_reach', result: `Errors: ${errText || 'no confirmation'}` };
    }
  } catch (e) {
    console.log(`#5106 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5106, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function inspectJMCElectric(browser) {
  // #5107 - testedandtrue.com - no form found
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5107 JMC Electric (testedandtrue.com) deep inspect ---');
    await page.goto('https://testedandtrue.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const title = await page.title();
    const url = page.url();
    console.log(`Home: ${url} | ${title}`);
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'))
        .map(a => ({ href: a.href, text: (a.innerText || '').trim().substring(0, 50) }))
        .filter(a => a.text.length > 0)
        .slice(0, 30);
    });
    console.log('Links:', JSON.stringify(links));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasEmail = bodyText.match(/[\w.-]+@[\w.-]+\.\w+/);
    console.log(`Emails found: ${hasEmail}`);
    
    // Check if this is an e-commerce site or unrelated
    const isJMC = title.toLowerCase().includes('jmc') || title.toLowerCase().includes('electric') || title.toLowerCase().includes('test');
    console.log(`Is JMC Electric site: ${isJMC}`);
    
    // Try contact page
    const base = new URL(url).origin;
    for (const path of ['/contact', '/contact-us', '/contactus']) {
      try {
        await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 8000 });
        const hasForm = await page.evaluate(() => !!document.querySelector('form input, form textarea'));
        if (hasForm) {
          console.log(`Found form at ${page.url()}`);
          await page.close();
          return { id: 5107, status: 'has_form', url: page.url() };
        }
      } catch(e) {}
    }
    
    // Only mailto available?
    const mailtoLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
    console.log(`Mailto links: ${JSON.stringify(mailtoLinks)}`);
    
    if (mailtoLinks.length > 0) {
      saveResult(5107, 'unable_to_reach', `No web form found on testedandtrue.com. Only mailto: ${mailtoLinks[0]} available`);
    } else {
      saveResult(5107, 'unable_to_reach', 'No web form found on testedandtrue.com. Site appears unrelated or has no contact form');
    }
    
    await page.close();
    return { id: 5107, status: 'unable_to_reach', result: 'No web form found' };
  } catch (e) {
    console.log(`#5107 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5107, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitDalconElectric(browser) {
  // #5109 - dalconelectric.com
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5109 Dalcon Electric targeted submit ---');
    await page.goto('https://dalconelectric.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact') || t.includes('quote') || h.includes('quote')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    
    if (contactLink) {
      console.log(`Navigating to: ${contactLink}`);
      await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    }
    
    await page.waitForTimeout(2000);
    const targetUrl = page.url();
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        id: f.id,
        class: f.className,
        hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'),
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
          name: i.name, id: i.id, type: i.type || i.tagName.toLowerCase(),
          placeholder: i.placeholder, required: i.required
        }))
      }));
    });
    console.log('Dalcon forms:', JSON.stringify(formInfo, null, 2));
    
    if (formInfo.some(f => f.hasCaptcha)) {
      saveResult(5109, 'unable_to_reach', `Contact form: ${targetUrl} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5109, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    if (formInfo.length === 0 || formInfo.every(f => f.inputs.length === 0)) {
      saveResult(5109, 'unable_to_reach', `No web form found at ${targetUrl}`);
      await page.close();
      return { id: 5109, status: 'unable_to_reach', result: 'No web form' };
    }
    
    // Fill
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
      for (const el of inputs) {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label}`.toLowerCase();
        
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment') || combined.includes('description')) {
          fillField(el, p.message);
        } else if (combined.includes('email')) {
          fillField(el, p.email);
        } else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') {
          fillField(el, p.phone);
        } else if (combined.includes('first')) {
          fillField(el, p.firstName);
        } else if (combined.includes('last')) {
          fillField(el, p.lastName);
        } else if (combined.includes('name') && !combined.includes('company')) {
          fillField(el, p.fullName);
        } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
          fillField(el, p.company);
        } else if (combined.includes('subject') || combined.includes('topic')) {
          fillField(el, p.subject);
        } else if (el.tagName === 'SELECT' && el.options.length > 1) {
          el.selectedIndex = 1;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => ['send','submit','contact','request'].some(k => (b.innerText||'').toLowerCase().includes(k)));
      if (btn) { btn.click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5109 post-url: ${postUrl}, confirmed: ${confirmed || urlChange}`);
    console.log(`Page snippet: ${postText.substring(0, 300)}`);
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5109, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5109, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5109, 'unable_to_reach', `Contact form: ${preUrl} (No confirmation detected after submit)`);
      await page.close();
      return { id: 5109, status: 'unable_to_reach', result: 'No confirmation' };
    }
  } catch (e) {
    console.log(`#5109 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5109, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function inspectIflandEngineers(browser) {
  // #5110 - iflandengineers.com - no form
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5110 Ifland Engineers Inc (iflandengineers.com) deep inspect ---');
    await page.goto('https://iflandengineers.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const url = page.url();
    const title = await page.title();
    console.log(`Home: ${url} | ${title}`);
    
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: (a.innerText||'').trim().substring(0,40) }))
        .filter(x => x.text && !x.href.startsWith('mailto:') && !x.href.startsWith('tel:'))
        .slice(0, 25)
    );
    console.log('Links:', JSON.stringify(links));
    
    const base = new URL(url).origin;
    for (const path of ['/contact', '/contact-us', '/about/contact', '/reach-us']) {
      try {
        await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 8000 });
        const hasForm = await page.evaluate(() => !!document.querySelector('form input, form textarea'));
        if (hasForm) {
          console.log(`Found form at ${page.url()}`);
          break;
        }
      } catch(e) {}
    }
    
    const mailtoLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
    const formExists = await page.evaluate(() => !!document.querySelector('form input, form textarea'));
    console.log(`Form exists: ${formExists}, Mailto: ${JSON.stringify(mailtoLinks)}`);
    
    if (!formExists) {
      const reason = mailtoLinks.length > 0 ? `Only mailto: ${mailtoLinks[0]}` : 'No contact form or mailto found';
      saveResult(5110, 'unable_to_reach', `iflandengineers.com: ${reason}`);
    }
    
    await page.close();
    return { id: 5110, status: 'unable_to_reach', result: 'No web form found' };
  } catch (e) {
    console.log(`#5110 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5110, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitSAEEngineering(browser) {
  // #5111 - sae-consulting.com
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5111 SAE Engineering Consulting (sae-consulting.com) targeted submit ---');
    await page.goto('https://sae-consulting.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    if (contactLink) await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    const targetUrl = page.url();
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action, id: f.id, class: f.className,
        hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'),
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
          name: i.name, id: i.id, type: i.type || i.tagName.toLowerCase(), placeholder: i.placeholder
        }))
      }));
    });
    console.log('SAE forms:', JSON.stringify(formInfo, null, 2));
    
    if (formInfo.some(f => f.hasCaptcha)) {
      saveResult(5111, 'unable_to_reach', `Contact form: ${targetUrl} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5111, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    if (formInfo.length === 0 || formInfo.every(f => f.inputs.length === 0)) {
      const mailtoLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
      saveResult(5111, 'unable_to_reach', `sae-consulting.com: No web form. Mailto: ${mailtoLinks[0] || 'none'}`);
      await page.close();
      return { id: 5111, status: 'unable_to_reach', result: 'No web form' };
    }
    
    // Fill
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
      for (const el of inputs) {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label}`.toLowerCase();
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment')) {
          fillField(el, p.message);
        } else if (combined.includes('email')) { fillField(el, p.email); }
        else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') { fillField(el, p.phone); }
        else if (combined.includes('first')) { fillField(el, p.firstName); }
        else if (combined.includes('last')) { fillField(el, p.lastName); }
        else if (combined.includes('name') && !combined.includes('company')) { fillField(el, p.fullName); }
        else if (combined.includes('company') || combined.includes('business')) { fillField(el, p.company); }
        else if (combined.includes('subject')) { fillField(el, p.subject); }
        else if (el.tagName === 'SELECT' && el.options.length > 1) { el.selectedIndex = 1; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5111 post-url: ${postUrl}, confirmed: ${confirmed || urlChange}`);
    console.log(`Snippet: ${postText.substring(0, 300)}`);
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5111, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5111, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5111, 'unable_to_reach', `Contact form: ${preUrl} (No confirmation detected)`);
      await page.close();
      return { id: 5111, status: 'unable_to_reach', result: 'No confirmation' };
    }
  } catch (e) {
    console.log(`#5111 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5111, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitESCEngineering(browser) {
  // #5113 - escengineering.com
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5113 ESC Engineering Services (escengineering.com) targeted submit ---');
    await page.goto('https://escengineering.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    if (contactLink) await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    const targetUrl = page.url();
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action, hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'),
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({ name: i.name, id: i.id, type: i.type || i.tagName.toLowerCase(), placeholder: i.placeholder }))
      }));
    });
    console.log('ESC forms:', JSON.stringify(formInfo, null, 2));
    
    if (formInfo.some(f => f.hasCaptcha)) {
      saveResult(5113, 'unable_to_reach', `Contact form: ${targetUrl} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5113, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    if (formInfo.length === 0 || formInfo.every(f => f.inputs.length === 0)) {
      const mailto = await page.evaluate(() => (document.querySelector('a[href^="mailto:"]')?.href || 'none'));
      saveResult(5113, 'unable_to_reach', `escengineering.com: No web form found. Mailto: ${mailto}`);
      await page.close();
      return { id: 5113, status: 'unable_to_reach', result: 'No web form' };
    }
    
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
      for (const el of inputs) {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label}`.toLowerCase();
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment')) { fillField(el, p.message); }
        else if (combined.includes('email')) { fillField(el, p.email); }
        else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') { fillField(el, p.phone); }
        else if (combined.includes('first')) { fillField(el, p.firstName); }
        else if (combined.includes('last')) { fillField(el, p.lastName); }
        else if (combined.includes('name') && !combined.includes('company')) { fillField(el, p.fullName); }
        else if (combined.includes('company') || combined.includes('business')) { fillField(el, p.company); }
        else if (combined.includes('subject')) { fillField(el, p.subject); }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5113 post-url: ${postUrl}, confirmed: ${confirmed || urlChange}`);
    console.log(`Snippet: ${postText.substring(0, 300)}`);
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5113, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5113, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5113, 'unable_to_reach', `Contact form: ${preUrl} (No confirmation detected)`);
      await page.close();
      return { id: 5113, status: 'unable_to_reach', result: 'No confirmation' };
    }
  } catch (e) {
    console.log(`#5113 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5113, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitAmconConsultants(browser) {
  // #5114 - amconconsultants.com
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5114 Amcon Consultants Inc (amconconsultants.com) targeted submit ---');
    await page.goto('https://amconconsultants.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    if (contactLink) await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    const targetUrl = page.url();
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action, hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'),
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({ name: i.name, id: i.id, type: i.type||i.tagName.toLowerCase(), placeholder: i.placeholder }))
      }));
    });
    console.log('Amcon forms:', JSON.stringify(formInfo, null, 2));
    
    if (formInfo.some(f => f.hasCaptcha)) {
      saveResult(5114, 'unable_to_reach', `Contact form: ${targetUrl} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5114, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    if (formInfo.length === 0 || formInfo.every(f => f.inputs.length === 0)) {
      const mailto = await page.evaluate(() => (document.querySelector('a[href^="mailto:"]')?.href || 'none'));
      saveResult(5114, 'unable_to_reach', `amconconsultants.com: No web form found. Mailto: ${mailto}`);
      await page.close();
      return { id: 5114, status: 'unable_to_reach', result: 'No web form' };
    }
    
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
      for (const el of inputs) {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label}`.toLowerCase();
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment')) { fillField(el, p.message); }
        else if (combined.includes('email')) { fillField(el, p.email); }
        else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') { fillField(el, p.phone); }
        else if (combined.includes('first')) { fillField(el, p.firstName); }
        else if (combined.includes('last')) { fillField(el, p.lastName); }
        else if (combined.includes('name') && !combined.includes('company')) { fillField(el, p.fullName); }
        else if (combined.includes('company') || combined.includes('business')) { fillField(el, p.company); }
        else if (combined.includes('subject')) { fillField(el, p.subject); }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5114 post-url: ${postUrl}, confirmed: ${confirmed || urlChange}`);
    console.log(`Snippet: ${postText.substring(0, 300)}`);
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5114, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5114, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5114, 'unable_to_reach', `Contact form: ${preUrl} (No confirmation detected)`);
      await page.close();
      return { id: 5114, status: 'unable_to_reach', result: 'No confirmation' };
    }
  } catch (e) {
    console.log(`#5114 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5114, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function inspectSEGInc(browser) {
  // #5115 - seg-corp.com - no form
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5115 SEG Inc (seg-corp.com) deep inspect ---');
    await page.goto('https://seg-corp.com', { waitUntil: 'networkidle2', timeout: 20000 });
    const url = page.url();
    const title = await page.title();
    console.log(`Home: ${url} | ${title}`);
    
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: (a.innerText||'').trim().substring(0,40) }))
        .filter(x => x.text && !x.href.startsWith('mailto:') && !x.href.startsWith('tel:'))
        .slice(0, 25)
    );
    console.log('Links:', JSON.stringify(links));
    
    const contactLink = links.find(l => l.text.toLowerCase().includes('contact') || l.href.toLowerCase().includes('contact'));
    if (contactLink) {
      await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const hasForm = await page.evaluate(() => document.querySelectorAll('form input:not([type="hidden"]), form textarea').length > 0);
      console.log(`Contact page form exists: ${hasForm}, URL: ${page.url()}`);
      
      if (hasForm) {
        const hasCaptcha = await page.evaluate(() => !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'));
        if (hasCaptcha) {
          saveResult(5115, 'unable_to_reach', `Contact form: ${page.url()} (Blocked by CAPTCHA)`);
          await page.close();
          return { id: 5115, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
        }
        // There's a form! This shouldn't happen but handle it
        await page.close();
        return { id: 5115, has_form: true, formUrl: page.url() };
      }
    }
    
    const mailtoLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
    console.log(`Mailto: ${JSON.stringify(mailtoLinks)}`);
    
    const reason = mailtoLinks.length > 0 ? `Only mailto: ${mailtoLinks[0]} available` : 'No contact form or email form found';
    saveResult(5115, 'unable_to_reach', `seg-corp.com: ${reason}`);
    
    await page.close();
    return { id: 5115, status: 'unable_to_reach', result: 'No web form' };
  } catch (e) {
    console.log(`#5115 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5115, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function submitADCEngineers(browser) {
  // #5116 - adcengineers.com
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    console.log('\n--- #5116 Advance Design Consultants (adcengineers.com) targeted submit ---');
    await page.goto('https://adcengineers.com', { waitUntil: 'networkidle2', timeout: 20000 });
    
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const found = links.find(a => {
        const h = (a.getAttribute('href') || '').toLowerCase();
        const t = (a.innerText || '').toLowerCase();
        return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
      });
      return found ? found.href : null;
    });
    if (contactLink) await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    const targetUrl = page.url();
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action, hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], .cf-turnstile'),
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({ name: i.name, id: i.id, type: i.type||i.tagName.toLowerCase(), placeholder: i.placeholder }))
      }));
    });
    console.log('ADC forms:', JSON.stringify(formInfo, null, 2));
    
    if (formInfo.some(f => f.hasCaptcha)) {
      saveResult(5116, 'unable_to_reach', `Contact form: ${targetUrl} (Blocked by CAPTCHA)`);
      await page.close();
      return { id: 5116, status: 'unable_to_reach', result: 'Blocked by CAPTCHA' };
    }
    
    if (formInfo.length === 0 || formInfo.every(f => f.inputs.length === 0)) {
      const mailto = await page.evaluate(() => (document.querySelector('a[href^="mailto:"]')?.href || 'none'));
      saveResult(5116, 'unable_to_reach', `adcengineers.com: No web form found. Mailto: ${mailto}`);
      await page.close();
      return { id: 5116, status: 'unable_to_reach', result: 'No web form' };
    }
    
    await page.evaluate((p) => {
      const fillField = (el, value) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        ['input', 'change', 'blur'].forEach(evt => el.dispatchEvent(new Event(evt, { bubbles: true })));
      };

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
      for (const el of inputs) {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText?.toLowerCase() || '';
        const combined = `${el.name} ${el.id} ${el.placeholder} ${label}`.toLowerCase();
        if (el.tagName === 'TEXTAREA' || combined.includes('message') || combined.includes('comment')) { fillField(el, p.message); }
        else if (combined.includes('email')) { fillField(el, p.email); }
        else if (combined.includes('phone') || combined.includes('tel') || el.type === 'tel') { fillField(el, p.phone); }
        else if (combined.includes('first')) { fillField(el, p.firstName); }
        else if (combined.includes('last')) { fillField(el, p.lastName); }
        else if (combined.includes('name') && !combined.includes('company')) { fillField(el, p.fullName); }
        else if (combined.includes('company') || combined.includes('business')) { fillField(el, p.company); }
        else if (combined.includes('subject')) { fillField(el, p.subject); }
      }
    }, PROFILE);
    
    await page.waitForTimeout(1000);
    const preUrl = page.url();
    
    await page.evaluate(() => {
      const submitEls = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      if (submitEls.length > 0) { submitEls[0].click(); return; }
      const form = document.querySelector('form');
      if (form) { try { form.requestSubmit(); } catch(e) { form.submit(); } }
    });
    
    await page.waitForTimeout(5000);
    
    const postUrl = page.url();
    const postText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmed = SUCCESS_SIGNALS.some(s => postText.includes(s));
    const urlChange = postUrl !== preUrl && (postUrl.includes('thank') || postUrl.includes('success') || postUrl.includes('confirm'));
    
    console.log(`#5116 post-url: ${postUrl}, confirmed: ${confirmed || urlChange}`);
    console.log(`Snippet: ${postText.substring(0, 300)}`);
    
    if (confirmed || urlChange) {
      const phrase = confirmed ? SUCCESS_SIGNALS.find(s => postText.includes(s)) : `URL: ${postUrl}`;
      saveResult(5116, 'contacted', `Contact form: ${preUrl} (Autofilled & verified: ${phrase})`);
      await page.close();
      return { id: 5116, status: 'contacted', result: `Confirmed: ${phrase}` };
    } else {
      saveResult(5116, 'unable_to_reach', `Contact form: ${preUrl} (No confirmation detected)`);
      await page.close();
      return { id: 5116, status: 'unable_to_reach', result: 'No confirmation' };
    }
  } catch (e) {
    console.log(`#5116 error: ${e.message}`);
    await page.close().catch(() => {});
    return { id: 5116, status: 'unable_to_reach', result: `Error: ${e.message}` };
  }
}

async function main() {
  console.log('\n🚀 Deep Investigation & Retry - Agent 3 Batch 11 leads');
  const browser = await launchBrowser();
  
  const results = [];
  
  try {
    // Process each lead with targeted logic
    results.push(await submitEsmeralizedElectric(browser));
    results.push(await submitCAElectrical(browser));
    results.push(await inspectJMCElectric(browser));
    results.push(await submitDalconElectric(browser));
    results.push(await inspectIflandEngineers(browser));
    results.push(await submitSAEEngineering(browser));
    results.push(await submitESCEngineering(browser));
    results.push(await submitAmconConsultants(browser));
    results.push(await inspectSEGInc(browser));
    results.push(await submitADCEngineers(browser));
  } finally {
    try { await browser.close(); } catch(_) {}
  }
  
  console.log('\n========================================');
  console.log('🏁 Deep Investigation Complete');
  console.table(results);
  
  // Summary
  const contacted = results.filter(r => r.status === 'contacted').length;
  const unable = results.filter(r => r.status === 'unable_to_reach').length;
  console.log(`\n✅ Contacted: ${contacted}`);
  console.log(`❌ Unable to reach: ${unable}`);
}

main().catch(console.error);
