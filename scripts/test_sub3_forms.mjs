import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function test4802(browser) {
  console.log('\n--- Testing Lead #4802 (Smith Tool & Manufacturing) ---');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    await page.goto('https://smithtoolmfg.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Fill form
    await page.waitForSelector('#contact-form', { timeout: 10000 });
    await page.type('#name', PROFILE.fullName, { delay: 30 });
    await page.type('#email', PROFILE.email, { delay: 30 });
    await page.type('#company', PROFILE.company, { delay: 30 });
    await page.type('#message', PROFILE.message, { delay: 20 });

    // Intercept network requests
    let apiSubmitted = false;
    let apiStatus = null;
    let apiResponse = null;
    page.on('response', async resp => {
      if (resp.url().includes('readdy.ai/api/form')) {
        apiSubmitted = true;
        apiStatus = resp.status();
        try { apiResponse = await resp.text(); } catch(e) {}
      }
    });

    console.log('Clicking submit button...');
    const submitBtn = await page.$('#contact-form button[type="submit"], #contact-form button');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.$eval('#contact-form', f => f.requestSubmit());
    }

    await new Promise(r => setTimeout(r, 5000));
    console.log(`API call captured: ${apiSubmitted}, status: ${apiStatus}, resp: ${apiResponse}`);

    const result = await page.evaluate(() => {
      const form = document.querySelector('#contact-form');
      return {
        formText: form ? form.innerText : '',
        bodyText: document.body ? document.body.innerText : '',
        alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, .success, .toast')).map(e => e.innerText)
      };
    });

    console.log('Result alerts:', result.alerts);
    console.log('Form text snippet:', result.formText.slice(0, 200));

    return { apiSubmitted, apiStatus, apiResponse, alerts: result.alerts };
  } catch (e) {
    console.log('Error 4802:', e.message);
  } finally {
    await page.close();
  }
}

async function test4806(browser) {
  console.log('\n--- Testing Lead #4806 (Big D Tool Center) ---');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    await page.goto('https://bigdtoolcenter.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#wpforms-form-988', { timeout: 10000 });

    // Examine fields in wpforms-form-988
    const fieldDetails = await page.evaluate(() => {
      const select = document.querySelector('#wpforms-988-field_7');
      const options = select ? Array.from(select.options).map(o => ({ val: o.value, text: o.text })) : [];
      return { options };
    });
    console.log('Field 7 options:', fieldDetails.options);

    // Select valid option (first non-empty option)
    await page.select('#wpforms-988-field_7', fieldDetails.options[1]?.val || 'Quote');
    await page.type('#wpforms-988-field_2', PROFILE.firstName, { delay: 20 });
    await page.type('#wpforms-988-field_2-last', PROFILE.lastName, { delay: 20 });
    await page.type('#wpforms-988-field_6', PROFILE.phone, { delay: 20 });
    await page.type('#wpforms-988-field_5', PROFILE.email, { delay: 20 });
    
    // Date field
    await page.$eval('#wpforms-988-field_10', el => el.value = '09/15/2026');
    await page.type('#wpforms-988-field_3', 'Precision tooling and equipment quote request', { delay: 20 });
    await page.type('#wpforms-988-field_11', PROFILE.message, { delay: 15 });

    let ajaxSubmitted = false;
    let ajaxRespText = '';
    page.on('response', async r => {
      if (r.url().includes('admin-ajax.php')) {
        ajaxSubmitted = true;
        try { ajaxRespText = await r.text(); } catch(e) {}
      }
    });

    console.log('Submitting WPForm 988...');
    await page.click('#wpforms-submit-988');

    await new Promise(r => setTimeout(r, 6000));
    console.log(`WPForms AJAX captured: ${ajaxSubmitted}, resp: ${ajaxRespText}`);

    const confirmation = await page.evaluate(() => {
      const conf = document.querySelector('.wpforms-confirmation-container-full, [id*="wpforms-confirmation"]');
      const err = document.querySelector('.wpforms-error-container');
      return {
        confText: conf ? conf.innerText : '',
        errText: err ? err.innerText : ''
      };
    });
    console.log('WPForms result:', confirmation);

    return { ajaxSubmitted, ajaxRespText, confirmation };
  } catch (e) {
    console.log('Error 4806:', e.message);
  } finally {
    await page.close();
  }
}

async function test4810(browser) {
  console.log('\n--- Testing Lead #4810 (Fine Line Production) ---');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    await page.goto('https://www.finelineproduction.com/dallas-metal-shop-near-me', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Look for inputs
    const hasForm = await page.waitForSelector('input[name="full-name"], input[placeholder*="Full Name"]', { timeout: 10000 }).catch(() => null);
    console.log('Found full name input:', !!hasForm);

    if (hasForm) {
      await page.type('input[name="full-name"]', PROFILE.fullName, { delay: 20 });
      await page.type('input[name="company"]', PROFILE.company, { delay: 20 });
      await page.type('input[name="phone"]', PROFILE.phone, { delay: 20 });
      await page.type('input[name="email"]', PROFILE.email, { delay: 20 });
      await page.type('input[name="estimated-annual usage (eau)"]', '5000', { delay: 20 });
      await page.type('textarea', PROFILE.message, { delay: 15 });

      let wixSubmitted = false;
      let wixResp = '';
      page.on('response', async r => {
        if (r.url().includes('wix') && (r.url().includes('submit') || r.url().includes('form'))) {
          wixSubmitted = true;
          try { wixResp = await r.text(); } catch(e) {}
        }
      });

      console.log('Clicking Wix submit button...');
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('send'));
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 6000));
      console.log(`Wix submit response captured: ${wixSubmitted}`);

      const msg = await page.evaluate(() => {
        const success = document.querySelector('[data-testid="form-submitted"], .wixui-form__message');
        return success ? success.innerText : document.body.innerText.slice(0, 300);
      });
      console.log('Wix confirmation message:', msg);
    }
  } catch (e) {
    console.log('Error 4810:', e.message);
  } finally {
    await page.close();
  }
}

async function test4813(browser) {
  console.log('\n--- Testing Lead #4813 (R.W. Smith Company) ---');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    await page.goto('https://rwscompany.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#gform_1', { timeout: 10000 });

    // Fill visible fields only
    await page.type('#input_1_1_3', PROFILE.fullName, { delay: 20 });
    await page.type('#input_1_2', PROFILE.email, { delay: 20 });
    await page.type('#input_1_4', PROFILE.phone, { delay: 20 });
    await page.type('#input_1_3', PROFILE.message, { delay: 15 });

    // Check honeypots - make sure input_1_5 and ak_hp_textarea are empty
    const hpValues = await page.evaluate(() => ({
      hp1: document.querySelector('#input_1_5')?.value,
      hp2: document.querySelector('textarea[name="ak_hp_textarea"]')?.value
    }));
    console.log('Honeypot values before submit (must be empty):', hpValues);

    console.log('Submitting Gravity Form...');
    await page.click('#gform_submit_button_1');

    await new Promise(r => setTimeout(r, 6000));

    const gformResult = await page.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, #gform_confirmation_wrapper_1');
      const err = document.querySelector('.gform_validation_errors, .validation_error');
      return {
        conf: conf ? conf.innerText : '',
        err: err ? err.innerText : '',
        url: window.location.href
      };
    });
    console.log('Gravity Form result:', gformResult);
  } catch (e) {
    console.log('Error 4813:', e.message);
  } finally {
    await page.close();
  }
}

async function test4805(browser) {
  console.log('\n--- Testing Lead #4805 (DLT Manufacturing) ---');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    await page.goto('https://www.dltmanufacturing.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForSelector('#comp-kg9p6v8a', { timeout: 10000 });

    await page.type('#input_comp-kg9p6v9g', PROFILE.fullName, { delay: 20 });
    await page.type('#input_comp-kg9p6v9t', PROFILE.email, { delay: 20 });
    await page.type('#input_comp-kg9p6v9x1', PROFILE.subject, { delay: 20 });
    await page.type('#textarea_comp-kg9p6va2', PROFILE.message, { delay: 15 });

    console.log('Clicking Wix submit button on DLT...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('send'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const msg = await page.evaluate(() => {
      const success = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
      return success ? success.innerText : document.body.innerText.slice(0, 300);
    });
    console.log('DLT confirmation message:', msg);
  } catch (e) {
    console.log('Error 4805:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await test4802(browser);
  await test4806(browser);
  await test4810(browser);
  await test4813(browser);
  await test4805(browser);

  await browser.close();
}

main();
