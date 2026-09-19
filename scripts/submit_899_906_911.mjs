import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@northeastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Precision Engineering Collaboration Opportunities',
  message: 'Hello, I am reaching out on behalf of Northeast Precision Machinery to explore potential collaboration opportunities with your engineering team. We would welcome the chance to discuss upcoming projects, technical services, and potential synergy. Kindly arrange for a representative to contact us. Thank you.'
};

async function submit899(browser) {
  console.log('\n==============================================');
  console.log('Submitting Lead #899: The SolidWorks Expert...');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.thesolidworksexpert.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wix inputs: name, email, subject, message
    const nameSel = '#input_comp-loewez7x2';
    const emailSel = '#input_comp-loewez801';
    const subjSel = '#input_comp-loewez813';
    const msgSel = '#textarea_comp-loewez83';

    await page.waitForSelector(nameSel, { timeout: 10000 });
    
    // Type with delay
    await page.click(nameSel);
    await page.type(nameSel, OUTREACH.fullName, { delay: 30 });

    await page.click(emailSel);
    await page.type(emailSel, OUTREACH.email, { delay: 30 });

    await page.click(subjSel);
    await page.type(subjSel, OUTREACH.subject, { delay: 30 });

    await page.click(msgSel);
    await page.type(msgSel, OUTREACH.message, { delay: 10 });

    console.log('Form 899 populated. Clicking submit...');
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (submitBtn) {
      await submitBtn.asElement().click();
    }

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        const msg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')?.innerText;
        const match = text.match(/(thank you|thanks for submitting|received|sent|success)/i);
        return {
          msg,
          hasMatch: !!match,
          matchSnippet: match ? match[0] : null
        };
      });
      console.log(`Sec ${i+1}:`, res);
      if (res.msg || res.hasMatch) {
        console.log('✅ Confirmed submission on Lead #899!');
        break;
      }
    }

  } catch (err) {
    console.log('Error submitting #899:', err.message);
  } finally {
    await page.close();
  }
}

async function submit906(browser) {
  console.log('\n==============================================');
  console.log('Submitting Lead #906: NY Building Systems Consultant Inc....');
  const page = await browser.newPage();
  try {
    await page.goto('https://nybscinc.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    // The contact form is form with inputs name, email, telephone, company, message
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    await page.click('input[name="name"]');
    await page.type('input[name="name"]', OUTREACH.fullName, { delay: 30 });

    await page.click('input[name="email"]');
    await page.type('input[name="email"]', OUTREACH.email, { delay: 30 });

    await page.click('input[name="telephone"]');
    await page.type('input[name="telephone"]', OUTREACH.phone, { delay: 30 });

    await page.click('input[name="company"]');
    await page.type('input[name="company"]', OUTREACH.company, { delay: 30 });

    await page.click('textarea[name="message"]');
    await page.type('textarea[name="message"]', OUTREACH.message, { delay: 10 });

    console.log('Form 906 populated. Clicking submit...');
    // The submit button is input[type="submit"] inside the form
    const formHandle = await page.evaluateHandle(() => {
      const f = document.querySelector('input[name="telephone"]')?.closest('form');
      return f;
    });

    await page.evaluate(f => {
      const btn = f.querySelector('input[type="submit"], button');
      if (btn) btn.click();
      else f.submit();
    }, formHandle);

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        const alert = document.querySelector('.alert, .success, [role="alert"], .message')?.innerText;
        const match = text.match(/(thank you|message has been sent|received|successfully|in touch)/i);
        return {
          alert,
          hasMatch: !!match,
          matchSnippet: match ? match[0] : null
        };
      });
      console.log(`Sec ${i+1}:`, res);
      if (res.alert || res.hasMatch) {
        console.log('✅ Confirmed submission on Lead #906!');
        break;
      }
    }

  } catch (err) {
    console.log('Error submitting #906:', err.message);
  } finally {
    await page.close();
  }
}

async function submit911(browser) {
  console.log('\n==============================================');
  console.log('Submitting Lead #911: Precision Engineering Design...');
  const page = await browser.newPage();
  try {
    await page.goto('https://precisionengineeringpc.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Contact Form 7
    await page.waitForSelector('input[name="your-name"]', { timeout: 10000 });

    await page.click('input[name="your-name"]');
    await page.type('input[name="your-name"]', OUTREACH.fullName, { delay: 30 });

    await page.click('input[name="your-email"]');
    await page.type('input[name="your-email"]', OUTREACH.email, { delay: 30 });

    // Note: leave input[name="website"] alone if it's honeypot or check if required
    const isWebsiteVisible = await page.evaluate(() => {
      const el = document.querySelector('input[name="website"]');
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (isWebsiteVisible) {
      await page.type('input[name="website"]', 'https://northeastprecision.com', { delay: 30 });
    }

    await page.click('textarea[name="your-message"]');
    await page.type('textarea[name="your-message"]', OUTREACH.message, { delay: 10 });

    console.log('Form 911 populated. Clicking submit...');
    await page.click('.wpcf7-submit, input[type="submit"]');

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        const output = document.querySelector('.wpcf7-response-output')?.innerText;
        const match = text.match(/(thank you|message was sent|received|successfully)/i);
        return {
          output,
          hasMatch: !!match,
          matchSnippet: match ? match[0] : null
        };
      });
      console.log(`Sec ${i+1}:`, res);
      if (res.output || res.hasMatch) {
        console.log('✅ Confirmed submission on Lead #911!');
        break;
      }
    }

  } catch (err) {
    console.log('Error submitting #911:', err.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  await submit899(browser);
  await submit906(browser);
  await submit911(browser);

  await browser.close();
}

run();
