import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
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
  location: 'Houston, TX',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function testLead(browser, id, url, setupFn) {
  console.log(`\n==================================================\nTesting Lead ${id}: ${url}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('dialog', async dialog => {
    console.log(`[${id}] Dialog popped up: ${dialog.type()} "${dialog.message()}"`);
    await dialog.accept().catch(() => {});
  });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('admin-ajax.php') || u.includes('wpforms') || u.includes('form') || u.includes('submit') || u.includes('wix') || u.includes('breakdance') || u.includes('gravityforms')) {
      try {
        const status = res.status();
        const text = await res.text().catch(() => '');
        console.log(`[${id}] Network response: ${status} ${u.slice(0, 100)} -> ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
    await setupFn(page);
  } catch (err) {
    console.error(`[${id}] Error: ${err.message}`);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Lead 4180: Langford Engineering (Wix form)
  await testLead(browser, 4180, 'https://www.langfordeng.com/', async (page) => {
    console.log('[4180] Inspecting Wix form...');
    const formExists = await page.$('#comp-kej860hr');
    if (!formExists) {
      console.log('[4180] Form comp-kej860hr not found');
      return;
    }

    await page.type('#input_comp-kej860in', OUTREACH.fullName, { delay: 30 });
    await page.type('#input_comp-kej860iz', OUTREACH.email, { delay: 30 });
    await page.type('#input_comp-kej860j3', OUTREACH.phone, { delay: 30 });
    await page.type('#input_comp-kej860j7', OUTREACH.address, { delay: 30 });
    await page.type('#input_comp-kej860ja1', OUTREACH.subject, { delay: 30 });
    await page.type('#textarea_comp-kej860jk', OUTREACH.message, { delay: 20 });

    console.log('[4180] Filled fields. Looking for submit button...');
    const submitBtn = await page.$('#comp-kej860hr button[type="submit"], #comp-kej860hr [data-testid="buttonElement"]');
    if (submitBtn) {
      console.log('[4180] Clicking submit button...');
      await submitBtn.click();
      await page.waitForTimeout(6000);

      const postStatus = await page.evaluate(() => {
        const text = document.body.innerText;
        const formText = document.querySelector('#comp-kej860hr')?.innerText || '';
        return {
          formText,
          hasSuccess: /thank|thanks|received|sent|success/i.test(formText) || /thank|thanks|received|sent|success/i.test(text),
          hasError: /error|problem|failed/i.test(formText)
        };
      });
      console.log('[4180] Post submission status:', JSON.stringify(postStatus));
    }
  });

  // 2. Lead 4181: Pinnacle Engineering Inc
  await testLead(browser, 4181, 'https://www.pinnacleengr.com/Contact/', async (page) => {
    console.log('[4181] Checking form-collection-50 fields...');
    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('#form-collection-50');
      if (!f) return 'No form-collection-50';
      return {
        html: f.outerHTML.slice(0, 1000),
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          name: el.name,
          id: el.id,
          type: el.type,
          placeholder: el.placeholder,
          outer: el.outerHTML
        }))
      };
    });
    console.log('[4181] form-collection-50 details:', JSON.stringify(formDetails, null, 2));
  });

  // 3. Lead 4182: RSK Engineering (Gravity Forms gform_1)
  await testLead(browser, 4182, 'https://rskengineering.com/contact-us/', async (page) => {
    console.log('[4182] Checking gform_1 fields...');
    const fields = await page.evaluate(() => {
      const f = document.querySelector('#gform_1');
      if (!f) return null;
      return Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
        tag: el.tagName,
        name: el.name,
        id: el.id,
        type: el.type,
        placeholder: el.placeholder,
        required: el.required
      }));
    });
    console.log('[4182] gform_1 fields:', JSON.stringify(fields, null, 2));
  });

  // 4. Lead 4183: Paramount Engineering LLC
  await testLead(browser, 4183, 'https://pellctx.com/contact-pe/', async (page) => {
    console.log('[4183] Checking content of contact-pe page...');
    const content = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log('[4183] Content snippet:', content.text.slice(0, 500));
    console.log('[4183] Links:', JSON.stringify(content.links.slice(0, 10)));
  });

  // 5. Lead 4184: Cobb, Fendley & Associates, Inc.
  await testLead(browser, 4184, 'https://www.cobbfendley.com/contact-us/', async (page) => {
    console.log('[4184] Testing gform_1 on Cobb Fendley...');
    await page.type('#input_1_1', OUTREACH.fullName, { delay: 20 });
    await page.type('#input_1_12', OUTREACH.email, { delay: 20 });
    await page.type('#input_1_11', OUTREACH.phone, { delay: 20 });
    await page.type('#input_1_2', OUTREACH.message, { delay: 20 });

    const btn = await page.$('#gform_submit_button_1');
    if (btn) {
      console.log('[4184] Submitting gform_1...');
      await btn.click();
      await page.waitForTimeout(6000);
      const res = await page.evaluate(() => {
        return {
          url: window.location.href,
          conf: document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1')?.innerText || '',
          validation: document.querySelector('.gform_validation_errors, .validation_error')?.innerText || '',
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });
      console.log('[4184] Submission result:', JSON.stringify(res));
    }
  });

  // 6. Lead 4185: KEA Structural Engineers, LLC
  await testLead(browser, 4185, 'https://keastructural.com/contact/', async (page) => {
    console.log('[4185] Testing Breakdance form on KEA Structural...');
    await page.type('#name', OUTREACH.fullName, { delay: 20 });
    await page.type('#email', OUTREACH.email, { delay: 20 });
    await page.type('#phone', OUTREACH.phone, { delay: 20 });
    await page.type('#project_location', OUTREACH.location, { delay: 20 });
    await page.type('#message', OUTREACH.message, { delay: 20 });

    const btn = await page.$('#contact-form107 button[type="submit"]');
    if (btn) {
      console.log('[4185] Submitting...');
      await btn.click();
      await page.waitForTimeout(6000);
      const res = await page.evaluate(() => {
        const formText = document.querySelector('#contact-form107')?.innerText || '';
        return {
          formText,
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });
      console.log('[4185] Result:', JSON.stringify(res));
    }
  });

  // 7. Lead 4186: EZpermitsTX
  await testLead(browser, 4186, 'https://ezpermitstx.com/', async (page) => {
    console.log('[4186] Testing wpforms-form-18672...');
    await page.type('#wpforms-18672-field_1', OUTREACH.fullName, { delay: 20 });
    await page.type('#wpforms-18672-field_2', OUTREACH.email, { delay: 20 });
    await page.type('#wpforms-18672-field_3', '7085683708', { delay: 20 });
    await page.type('#wpforms-18672-field_4', '77043', { delay: 20 });
    await page.type('#wpforms-18672-field_5', 'Commercial Engineering Consultation', { delay: 20 });

    const btn = await page.$('#wpforms-submit-18672');
    if (btn) {
      console.log('[4186] Submitting...');
      await btn.click();
      await page.waitForTimeout(6000);
      const res = await page.evaluate(() => {
        return {
          conf: document.querySelector('.wpforms-confirmation-container')?.innerText || '',
          err: document.querySelector('.wpforms-error-container')?.innerText || '',
          bodySnippet: document.body.innerText.slice(0, 500)
        };
      });
      console.log('[4186] Result:', JSON.stringify(res));
    }
  });

  // 8. Lead 4187: BMG STRUCTURAL ENGINEERS
  await testLead(browser, 4187, 'https://bmgstructural.com/?page_id=6', async (page) => {
    console.log('[4187] Testing contact-form...');
    await page.type('#fieldFirstName', OUTREACH.firstName, { delay: 20 });
    await page.type('#fieldLastName', OUTREACH.lastName, { delay: 20 });
    await page.type('#fieldEmail', OUTREACH.email, { delay: 20 });
    await page.type('#fieldSubject', OUTREACH.subject, { delay: 20 });
    await page.type('#fieldMessage', OUTREACH.message, { delay: 20 });

    const btn = await page.$('#contact-form button[type="submit"], #contact-form input[type="submit"]');
    if (btn) {
      console.log('[4187] Submitting...');
      await btn.click();
      await page.waitForTimeout(6000);
      const res = await page.evaluate(() => {
        return {
          url: window.location.href,
          text: document.body.innerText.slice(0, 500)
        };
      });
      console.log('[4187] Result:', JSON.stringify(res));
    }
  });

  // 9. Lead 4188: AW Mechanical Services
  await testLead(browser, 4188, 'https://awmechanicalservices.com/contact/', async (page) => {
    console.log('[4188] Checking contact page content...');
    const res = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log('[4188] Content:', res.text.slice(0, 500));
    console.log('[4188] Links:', JSON.stringify(res.links.slice(0, 10)));
  });

  // 10. Lead 4189: Hass Co LLC
  await testLead(browser, 4189, 'https://www.hassco.com/contact', async (page) => {
    console.log('[4189] Checking contact page content...');
    const res = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log('[4189] Content:', res.text.slice(0, 500));
    console.log('[4189] Links:', JSON.stringify(res.links.slice(0, 10)));
  });

  await browser.close();
}

main();
