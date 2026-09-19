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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function runDetailed() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // A. Lead #4796 DG Metal (/quote)
  console.log('\n========================================');
  console.log('Testing Lead #4796 DG Metal (https://dgmetal.works/quote/)');
  try {
    const page = await browser.newPage();
    await page.goto('https://dgmetal.works/quote/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    // Inspect all fields and labels in the WPForm
    const formFields = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.wpforms-field'));
      return items.map(item => {
        const label = item.querySelector('.wpforms-field-label')?.innerText || '';
        const input = item.querySelector('input, textarea, select');
        const req = item.classList.contains('wpforms-has-error') || item.innerText.includes('*');
        return {
          label,
          required: req,
          name: input?.name,
          id: input?.id,
          tag: input?.tagName,
          type: input?.type
        };
      });
    });
    console.log('WPForms fields structure:', JSON.stringify(formFields, null, 2));

    // Fill in the fields
    if (await page.$('input[name="wpforms[fields][0][first]"]')) {
      await page.type('input[name="wpforms[fields][0][first]"]', OUTREACH_PROFILE.firstName);
    }
    if (await page.$('input[name="wpforms[fields][0][last]"]')) {
      await page.type('input[name="wpforms[fields][0][last]"]', OUTREACH_PROFILE.lastName);
    }
    if (await page.$('input[name="wpforms[fields][1]"]')) {
      await page.type('input[name="wpforms[fields][1]"]', OUTREACH_PROFILE.email);
    }
    if (await page.$('input[name="wpforms[fields][3]"]')) {
      await page.type('input[name="wpforms[fields][3]"]', OUTREACH_PROFILE.phone);
    }
    if (await page.$('textarea[name="wpforms[fields][2]"]')) {
      await page.type('textarea[name="wpforms[fields][2]"]', OUTREACH_PROFILE.message);
    }

    // Check optional/required other fields
    for (const f of formFields) {
      if (f.name && f.required && !f.name.includes('[0]') && !f.name.includes('[1]') && !f.name.includes('[2]') && !f.name.includes('[3]')) {
        console.log(`Filling required field: ${f.label} (${f.name})`);
        if (f.tag === 'INPUT') {
          await page.type(`[name="${f.name}"]`, 'General Custom Fabrication Quote');
        }
      }
    }

    // Check for captcha in wpforms
    const hasCaptcha = await page.evaluate(() => {
      return !!document.querySelector('.wpforms-recaptcha-container, .g-recaptcha, .h-captcha');
    });
    console.log('Has Captcha on DG Metal:', hasCaptcha);

    console.log('Submitting DG Metal form...');
    const submitBtn = await page.$('.wpforms-submit');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const postSubmit = await page.evaluate(() => {
        const conf = document.querySelector('.wpforms-confirmation-container');
        return {
          confMsg: conf?.innerText,
          bodyText: document.body.innerText.slice(0, 500)
        };
      });
      console.log('DG Metal Confirmation container:', postSubmit.confMsg);
      const matched = postSubmit.bodyText.split('\n').filter(l => /thank|sent|received|message|success/i.test(l));
      console.log('DG Metal snippet:', matched);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4796:', e.message);
  }

  // B. Lead #4795 Teco Metal Products
  console.log('\n========================================');
  console.log('Testing Lead #4795 Teco Metal Products');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.tecometalproducts.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill inputs with real focus and keypresses for Wix React bindings
    const fillField = async (selector, value) => {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        await page.keyboard.down('Meta');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Meta');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(value, { delay: 10 });
        await el.evaluate(e => {
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    };

    await fillField('#input_comp-jxbwzbfp', OUTREACH_PROFILE.fullName);
    await fillField('#input_comp-jxbwzbfw', OUTREACH_PROFILE.email);
    await fillField('#input_comp-jxbwzbg2', OUTREACH_PROFILE.subject);
    await fillField('#textarea_comp-jxbwzbg8', OUTREACH_PROFILE.message);

    console.log('Fields typed into Wix form. Looking for submit button element...');
    const btnHandle = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, [data-testid="buttonElement"]'));
      return btns.find(b => /submit|send/i.test(b.innerText || ''));
    });

    // Check network for wix submission
    let wixResponse = null;
    page.on('response', async res => {
      if (res.url().includes('form-submissions') || res.url().includes('wix') && res.url().includes('submission')) {
        try {
          wixResponse = await res.text();
          console.log('Wix submit API response:', wixResponse.slice(0, 200));
        } catch (_) {}
      }
    });

    if (btnHandle) {
      await btnHandle.click();
      console.log('Clicked Wix submit button.');
      await new Promise(r => setTimeout(r, 6000));
      const messages = await page.evaluate(() => {
        const res = Array.from(document.querySelectorAll('[data-testid="inline-feedback"], [role="alert"], [class*="message"], [class*="notification"]'))
          .map(el => el.innerText);
        return res;
      });
      console.log('Wix inline feedback:', messages);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4795:', e.message);
  }

  // C. Lead #4800 Unique Taper Tools Inc
  console.log('\n========================================');
  console.log('Testing Lead #4800 Unique Taper Tools Inc');
  try {
    const page = await browser.newPage();
    await page.goto('https://uniquetapertools.weebly.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Inspect full form HTML
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('form');
      return f ? f.outerHTML : 'none';
    });
    console.log('Weebly form HTML:', formHtml);

    // Let's see all buttons and inputs
    const elements = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return [];
      return Array.from(f.querySelectorAll('input, button, a.wsite-button, span.wsite-button-text')).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText,
        type: el.type
      }));
    });
    console.log('Weebly form elements:', elements);

    await page.close();
  } catch (e) {
    console.error('Error on #4800:', e.message);
  }

  // D. Lead #4801 Techni Tool Inc
  console.log('\n========================================');
  console.log('Testing Lead #4801 Techni Tool Inc (reCAPTCHA check)');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.technitoolinc.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const recaptchaInfo = await page.evaluate(() => {
      const gRecaptcha = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
      const v3 = Array.from(document.querySelectorAll('script')).some(s => s.src.includes('recaptcha') && s.src.includes('render='));
      return {
        hasV2IframeOrDiv: !!gRecaptcha,
        hasV3Script: v3,
        captchaHtml: gRecaptcha ? gRecaptcha.outerHTML : null
      };
    });
    console.log('Recaptcha info on #4801:', recaptchaInfo);
    await page.close();
  } catch (e) {
    console.error('Error on #4801:', e.message);
  }

  await browser.close();
}

runDetailed();
