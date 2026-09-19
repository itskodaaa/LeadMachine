import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Precision CNC Machining & Manufacturing Capabilities Inquiry',
  message: `Hello,\n\nI am reaching out on behalf of Northeast Precision Machinery, Inc. We specialize in precision CNC machining, tooling, and custom components for industrial applications.\n\nWe are currently expanding our supplier and machining partner network and would like to learn more about your available production capacity, equipment capabilities, and standard lead times. Could you please direct me to the appropriate person on your quoting or engineering team to discuss potential subcontract or partnership opportunities?\n\nThank you,\nPamela Jameson\nNortheast Precision Machinery, Inc.\nPhone: 708-568-3708\nEmail: pamela.jameson@nortiheastprecision.com`
};

async function testLead1697() {
  console.log('\n--- Testing Lead #1697: The Morgan Corporation ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php')) {
      try {
        console.log(`[#1697 AJAX]: ${res.status()} -> ${await res.text()}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://morgancorporation.net/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector('#form-field-name', { timeout: 8000 });
    await page.type('#form-field-name', profile.fullName, { delay: 20 });
    await page.type('#form-field-email', profile.email, { delay: 20 });
    if (await page.$('#form-field-field_5ce848c')) {
      await page.type('#form-field-field_5ce848c', profile.phone, { delay: 20 });
    }
    await page.type('#form-field-message', profile.message, { delay: 10 });

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form.elementor-form button[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const el = document.querySelector('.elementor-message, .elementor-message-success');
      return el ? el.innerText : null;
    });
    console.log(`[#1697 Result]: ${confirmation}`);
  } catch (e) {
    console.error(`[#1697 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1722() {
  console.log('\n--- Testing Lead #1722: Euromextool, Inc. ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wpcf7') || res.url().includes('feedback')) {
      try {
        console.log(`[#1722 WPCF7]: ${res.status()} -> ${await res.text()}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://www.euromextool.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to trigger lazy scripts if any
    await page.mouse.move(200, 200);
    await page.mouse.wheel({ deltaY: 300 });
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('input[name="your-name"]', { timeout: 8000 });
    await page.type('input[name="your-name"]', profile.fullName, { delay: 20 });
    await page.type('input[name="your-email"]', profile.email, { delay: 20 });
    if (await page.$('input[name="tel-125"]')) {
      await page.type('input[name="tel-125"]', profile.phone, { delay: 20 });
    }
    await page.type('textarea[name="your-message"]', profile.message, { delay: 10 });

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const el = document.querySelector('.wpcf7-response-output');
      return el ? el.innerText : null;
    });
    console.log(`[#1722 Result]: ${confirmation}`);
  } catch (e) {
    console.error(`[#1722 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1705() {
  console.log('\n--- Testing Lead #1705: JB Manufacturing ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    await page.goto('https://jb-mfg.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector('#et_pb_contact_name_0', { timeout: 8000 });
    await page.type('#et_pb_contact_name_0', profile.fullName, { delay: 20 });
    await page.type('#et_pb_contact_email_0', profile.email, { delay: 20 });
    await page.type('#et_pb_contact_message_0', profile.message, { delay: 10 });

    // Solve math captcha
    const mathSolved = await page.evaluate(() => {
      const captchaSpan = document.querySelector('.et_pb_contact_captcha_question');
      if (!captchaSpan) return null;
      const text = captchaSpan.innerText.trim();
      const match = text.match(/(\d+)\s*\+\s*(\d+)/);
      if (match) {
        const sum = parseInt(match[1], 10) + parseInt(match[2], 10);
        return { text, sum };
      }
      return { text, sum: null };
    });
    console.log('Math captcha info:', mathSolved);

    if (mathSolved && mathSolved.sum !== null) {
      await page.type('input[name="et_pb_contact_captcha_0"]', mathSolved.sum.toString(), { delay: 20 });
    }

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form.et_pb_contact_form button[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const resultText = await page.evaluate(() => {
      const box = document.querySelector('.et-pb-contact-message');
      return box ? box.innerText : document.body.innerText.match(/(?:thanks|thank you|submitted|received)[^\n.!]*/i);
    });
    console.log(`[#1705 Result]:`, resultText);
  } catch (e) {
    console.error(`[#1705 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testLead1697();
  await testLead1722();
  await testLead1705();
}

run().catch(console.error);
