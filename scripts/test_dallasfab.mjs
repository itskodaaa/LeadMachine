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

async function testDallasFab() {
  console.log('\n--- Diagnosing Dallas Fabrication Form & Submit Button ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('wix') && (u.includes('submission') || u.includes('form') || u.includes('contact') || u.includes('submit'))) {
      try {
        console.log(`[NET RESPONSE]: ${res.status()} ${u.slice(0, 80)}`);
        const text = await res.text();
        console.log(`  -> Body: ${text.slice(0, 150)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://www.dallasfab.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('#comp-khdim069') || document.querySelector('form');
      if (!f) return null;
      const buttons = Array.from(f.querySelectorAll('button, input[type="submit"], [role="button"]')).map(b => ({
        tag: b.tagName,
        type: b.getAttribute('type'),
        id: b.id,
        text: b.innerText,
        classes: b.className
      }));
      return {
        formId: f.id,
        buttons
      };
    });
    console.log('Form buttons in DOM:', JSON.stringify(formDetails, null, 2));

    // Also look for all submit buttons on the whole page
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'))
        .filter(b => /submit|send/i.test(b.innerText) || /submit/i.test(b.type))
        .map(b => ({ id: b.id, text: b.innerText, tag: b.tagName, class: b.className }));
    });
    console.log('All submit-like buttons on page:', JSON.stringify(allButtons, null, 2));

    // Autofill
    await page.type('#input_comp-khdim07m', profile.fullName, { delay: 20 });
    await page.type('#input_comp-khdim083', profile.email, { delay: 20 });
    if (await page.$('#input_comp-khdim0891')) {
      await page.type('#input_comp-khdim0891', profile.subject, { delay: 20 });
    }
    if (await page.$('#textarea_comp-khdim08f1')) {
      await page.type('#textarea_comp-khdim08f1', profile.message, { delay: 10 });
    }

    // Click the submit button
    const btnHandle = await page.evaluateHandle(() => {
      const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => /submit/i.test(b.innerText));
      return btn;
    });

    if (btnHandle) {
      console.log('Found button, clicking via evaluate...');
      await page.evaluate(btn => btn.click(), btnHandle);
      await new Promise(r => setTimeout(r, 6000));

      const postSubmitMessages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-aid*="notification"], [id*="notification"], [role="alert"], [class*="message"], [class*="success"]'))
          .map(el => el.innerText.trim())
          .filter(t => t.length > 0);
      });
      console.log('Post-submit messages found:', postSubmitMessages);

      const pageText = await page.evaluate(() => document.body.innerText);
      const matched = pageText.match(/(?:thanks|thank you|submitted|received|message has been sent)[^\n.!]*/i);
      console.log('Page text match:', matched ? matched[0] : 'No match found');
    }

  } catch (e) {
    console.error('DallasFab Error:', e.message);
  } finally {
    await browser.close();
  }
}

testDallasFab().catch(console.error);
