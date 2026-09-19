import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testLead(id, fn) {
  const lead = db.prepare('SELECT id, company_name, website, status, notes FROM leads WHERE id = ?').get(id);
  console.log(`\n========================================\n[Deep Test] #${lead.id} ${lead.company_name} (${lead.website})`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  try {
    await fn(page, lead);
  } catch (err) {
    console.error(`Error processing #${lead.id}:`, err);
  } finally {
    await browser.close();
  }
}

async function run() {
  // Test #3314 Consultant Engineering, Inc.
  await testLead(3314, async (page, lead) => {
    await page.goto('https://cei-az.com/#contact', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Page loaded:', page.url());
    
    // Check form
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('form[action*="contact"], form:has(input[name="contact_name"])');
      return f ? f.outerHTML.slice(0, 1000) : 'No form found';
    });
    console.log('Form preview:', formHtml);

    // Fill fields
    await page.type('input[name="contact_name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="contact_email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="contact_subject"]', OUTREACH_PROFILE.subject);
    await page.type('textarea[name="contact_comment"]', OUTREACH_PROFILE.message);

    // Listen to network responses
    page.on('response', async resp => {
      if (resp.url().includes('contact') || resp.request().method() === 'POST') {
        try {
          console.log(`Response [${resp.status()}] ${resp.url()}: ${(await resp.text()).slice(0, 200)}`);
        } catch (_) {}
      }
    });

    console.log('Clicking submit button...');
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => console.log('No full page navigation')),
      page.click('input[name="contact_submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const content = await page.evaluate(() => document.body.innerText);
    console.log('Page text snippet after submit:', content.slice(0, 500));
    const alerts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.alert, .message, .success, .error, .notification, p'))
        .map(el => el.innerText.trim())
        .filter(t => /thank|sent|success|received|error|fail|invalid/i.test(t));
    });
    console.log('Alerts/Messages found:', alerts);
  });

  // Test #3317 Assured Engineering Concepts, LLC
  await testLead(3317, async (page, lead) => {
    await page.goto('https://assuredeng.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Page loaded:', page.url());

    // Inspect the form structure on assuredeng.com
    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return 'No form';
      const labels = Array.from(f.querySelectorAll('label')).map(l => ({ for: l.getAttribute('for'), text: l.innerText }));
      const inputs = Array.from(f.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        outerHTML: i.outerHTML
      }));
      return { action: f.action, method: f.method, labels, inputs };
    });
    console.log('Assured form details:', JSON.stringify(formDetails, null, 2));

    // Fill the inputs
    // Look at formDetails
    if (formDetails.inputs) {
      // Typically input 1 is Name, input 2 is Email or Phone, textarea is Message
      await page.type('#input90381', OUTREACH_PROFILE.fullName);
      await page.type('#input90382', OUTREACH_PROFILE.email);
      await page.type('textarea', OUTREACH_PROFILE.message);

      console.log('Submitting Assured Engineering form...');
      page.on('dialog', async d => { console.log('Dialog:', d.message()); await d.accept(); });
      
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      }
      await new Promise(r => setTimeout(r, 4000));
      const text = await page.evaluate(() => document.body.innerText);
      const msgs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div, p, span'))
          .map(e => e.innerText.trim())
          .filter(t => /thank|sent|received|message|error/i.test(t) && t.length < 150);
      });
      console.log('Messages after submit:', msgs);
    }
  });

  // Test #3312 UES (teamues.com)
  await testLead(3312, async (page, lead) => {
    await page.goto('https://www.teamues.com/contact-ues/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Page loaded:', page.url());

    // Dismiss cookie banner if present
    const cookieBtn = await page.$('button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, button:has-text("Accept All")');
    if (cookieBtn) {
      await cookieBtn.click().catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
    }

    const wpform = await page.evaluate(() => {
      const f = document.querySelector('form.wpforms-form');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        recaptcha: !!f.querySelector('.wpforms-recaptcha-container, .g-recaptcha, iframe[src*="recaptcha"]')
      };
    });
    console.log('UES form info:', wpform);

    // Let's see what happens on submit
    await page.type('input[name="wpforms[fields][0][first]"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="wpforms[fields][0][last]"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="wpforms[fields][3]"]', OUTREACH_PROFILE.company);
    await page.type('input[name="wpforms[fields][4]"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="wpforms[fields][1]"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="wpforms[fields][2]"]', OUTREACH_PROFILE.message);

    // Check radio buttons
    await page.evaluate(() => {
      const r = document.querySelector('input[type="radio"]');
      if (r) r.click();
    });

    console.log('Submitting UES form...');
    await page.click('button[name="wpforms[submit]"], #wpforms-submit-6792, button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    const uesResult = await page.evaluate(() => {
      const conf = document.querySelector('.wpforms-confirmation-container-full, .wpforms-confirmation-container');
      const err = document.querySelector('.wpforms-error-container, label.wpforms-error');
      return {
        conf: conf ? conf.innerText : null,
        err: err ? err.innerText : null,
        bodyMatches: Array.from(document.querySelectorAll('*')).map(e => e.innerText).filter(t => /thank|sent|we have received/i.test(t)).slice(0, 3)
      };
    });
    console.log('UES Result:', JSON.stringify(uesResult, null, 2));
  });

  // Test #3315 RLF Consulting (rlfconsulting.com)
  await testLead(3315, async (page, lead) => {
    await page.goto('https://rlfconsulting.com/request-a-quote/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Page loaded:', page.url());

    // Check form fields and captchas
    const formFields = await page.evaluate(() => {
      const form = document.querySelector('form.everest-form, form');
      if (!form) return 'No form';
      const inputs = Array.from(form.querySelectorAll('.everest-forms-field, .evf-field-container > div')).map(div => {
        const label = div.querySelector('label')?.innerText.trim();
        const input = div.querySelector('input, select, textarea');
        return {
          label,
          tag: input?.tagName,
          name: input?.name,
          id: input?.id,
          required: input?.required || div.classList.contains('validate-required')
        };
      });
      return inputs;
    });
    console.log('RLF form fields:', JSON.stringify(formFields, null, 2));

    // Fill all required fields carefully
    await page.type('#evf-32853-field_5auOgtDrkY-1', OUTREACH_PROFILE.fullName);
    await page.type('#evf-32853-field_lfmcmyeR76-5', OUTREACH_PROFILE.email);
    await page.type('#evf-32853-field_Bhj3vfgndx-3', OUTREACH_PROFILE.phone);
    await page.type('#evf-32853-field_26TGKWc47O-6', OUTREACH_PROFILE.address);
    await page.select('#evf-32853-field_UJRsDZjGBK-34', 'AZ'); // State
    await page.type('#evf-32853-field_aFrhZcwmuZ-48', OUTREACH_PROFILE.city);
    await page.select('#evf-32853-field_OQUyv9y06c-21', 'Commercial'); // Property type
    await page.select('#evf-32853-field_Cfkomj8mbz-11', 'Contractor'); // Role
    await page.select('#evf-32853-field_FJwjAZZ5Iu-22', 'Boundary'); // Survey type
    
    // Check if there are other textareas or inputs
    const otherInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('textarea, input[type="text"]'))
        .filter(el => !el.value)
        .map(el => ({ id: el.id, name: el.name, placeholder: el.placeholder }));
    });
    console.log('Unfilled inputs:', otherInputs);

    // If there's a comment/message field:
    await page.evaluate((msg) => {
      const ta = document.querySelector('textarea');
      if (ta) { ta.value = msg; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE.message);

    console.log('Submitting RLF form...');
    await page.click('button[type="submit"].everest-forms-submit-button, button.everest-forms-submit-button');
    await new Promise(r => setTimeout(r, 5000));

    const rlfResult = await page.evaluate(() => {
      const notice = document.querySelector('.everest-forms-notice, .everest-forms-confirmation-container');
      const errors = Array.from(document.querySelectorAll('.everest-forms-error, label.error')).map(e => e.innerText);
      return {
        notice: notice ? notice.innerText : null,
        errors,
        bodyText: document.body.innerText.slice(0, 300)
      };
    });
    console.log('RLF Result:', JSON.stringify(rlfResult, null, 2));
  });

  // Test #3311 Professional Consulting Engineers, LLC (pce-az.com)
  await testLead(3311, async (page, lead) => {
    await page.goto('https://pce-az.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('PCE loaded:', page.url(), await page.title());
    
    const pceForm = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          name: i.name,
          type: i.type,
          placeholder: i.placeholder,
          text: i.innerText || i.value
        }))
      }));
    });
    console.log('PCE forms:', JSON.stringify(pceForm, null, 2));

    // Check if there is a form and fill it
    if (pceForm.length > 0 && pceForm[0].inputs.length > 0) {
      await page.evaluate((p) => {
        for (const input of document.querySelectorAll('input, textarea')) {
          const type = input.type.toLowerCase();
          const name = (input.name || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          if (type === 'email' || name.includes('email') || placeholder.includes('email')) input.value = p.email;
          else if (type === 'tel' || name.includes('phone') || placeholder.includes('phone')) input.value = p.phone;
          else if (input.tagName.toLowerCase() === 'textarea' || name.includes('message') || placeholder.includes('message')) input.value = p.message;
          else if (name.includes('name') || placeholder.includes('name')) input.value = p.fullName;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH_PROFILE);

      console.log('Submitting PCE form...');
      await page.evaluate(() => {
        const btn = document.querySelector('form button[type="submit"], form input[type="submit"], button.submit, .submit-btn');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 4000));
      const res = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).map(e => e.innerText).filter(t => /thank|success|received|sent/i.test(t)).slice(0, 3);
      });
      console.log('PCE after submit messages:', res);
    }
  });

  // Test #3309 Schweitzer Engineering Laboratories (selinc.com)
  await testLead(3309, async (page, lead) => {
    await page.goto('https://selinc.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('SEL Contact Us loaded:', page.url(), await page.title());
    const selInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const text = document.body.innerText;
      return {
        formsCount: forms.length,
        hasPhone: text.includes('509') || text.includes('Phone:'),
        snippet: text.slice(0, 500)
      };
    });
    console.log('SEL Info:', selInfo);
  });

  // Test #3316 Terracon Consultants, Inc. (terracon.com)
  await testLead(3316, async (page, lead) => {
    await page.goto('https://www.terracon.com/about/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Terracon loaded:', page.url());
    // See form-picker
    await page.select('#form-picker', 'I need help with a project');
    await new Promise(r => setTimeout(r, 2000));

    const visibleForm = await page.evaluate(() => {
      const visibleForms = Array.from(document.querySelectorAll('form')).filter(f => f.offsetWidth > 0 && f.offsetHeight > 0);
      return visibleForms.map(f => ({
        id: f.id,
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
          name: i.name,
          placeholder: i.placeholder,
          type: i.type,
          label: i.closest('.gfield')?.querySelector('label')?.innerText.trim()
        })),
        hasCaptcha: !!f.querySelector('.g-recaptcha, .cf-turnstile, iframe[src*="recaptcha"], .ginput_recaptchav3')
      }));
    });
    console.log('Terracon visible form after picker:', JSON.stringify(visibleForm, null, 2));
  });

  // Test #3318 Peterson Associates Consulting (mpeconsult.com)
  await testLead(3318, async (page, lead) => {
    await page.goto('https://mpeconsult.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('MPE loaded:', page.url());
    const mpeInfo = await page.evaluate(() => {
      const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      const phones = Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href);
      return {
        emails,
        phones,
        bodySnippet: document.body.innerText.slice(0, 600)
      };
    });
    console.log('MPE info:', mpeInfo);
  });
}

run();
