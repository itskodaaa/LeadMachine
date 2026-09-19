import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testWix() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  // Test 3944
  console.log('--- Testing Wix Form #3944 Aluces ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.alucescorp.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll form into view
    await page.evaluate(() => {
      const f = document.querySelector('#comp-kf7u55ca');
      if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.click('#input_comp-kf7u55db');
    await page.type('#input_comp-kf7u55db', profile.fullName, { delay: 20 });

    await page.click('#input_comp-kf7u55do');
    await page.type('#input_comp-kf7u55do', profile.email, { delay: 20 });

    await page.click('#input_comp-kf7u55du');
    await page.type('#input_comp-kf7u55du', profile.phone, { delay: 20 });

    await page.click('#input_comp-kf7u55e0');
    await page.type('#input_comp-kf7u55e0', profile.subject, { delay: 20 });

    await page.click('#textarea_comp-kf7u55e5');
    await page.type('#textarea_comp-kf7u55e5', profile.message, { delay: 10 });

    const btn = await page.$('#comp-kf7u55ca button.wixui-button, div[id*="comp-kf7u55"] button');
    const box = await btn.boundingBox();
    console.log('3944 Submit button box:', box);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await btn.click();
    }

    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="form-message"], [class*="message"], [role="alert"], .wixui-form__message, #comp-kf7u55ca');
        return msg ? msg.innerText : '';
      });
      console.log(`3944 [Sec ${i}]:`, res.replace(/\n+/g, ' | '));
      if (/thanks for submitting|thank you|success/i.test(res)) {
        console.log('>>> 3944 CONFIRMED! <<<');
        break;
      }
    }
    await page.close();
  } catch (e) {
    console.log('3944 err:', e.message);
  }

  // Test 3949
  console.log('\n--- Testing Wix Form #3949 CONNECT ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.connecteng.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    await page.evaluate(() => {
      const f = document.querySelector('#comp-kq7zuqku');
      if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.click('#input_comp-kq7zuql2');
    await page.type('#input_comp-kq7zuql2', profile.firstName, { delay: 20 });

    await page.click('#input_comp-kq7zuql8');
    await page.type('#input_comp-kq7zuql8', profile.lastName, { delay: 20 });

    await page.click('#input_comp-kq7zuqlc');
    await page.type('#input_comp-kq7zuqlc', profile.email, { delay: 20 });

    await page.click('#input_comp-kq80rugc');
    await page.type('#input_comp-kq80rugc', profile.subject, { delay: 20 });

    await page.click('#textarea_comp-kq7zuqlk');
    await page.type('#textarea_comp-kq7zuqlk', profile.message, { delay: 10 });

    const btn = await page.$('#comp-kq7zuqku button.wixui-button, form#comp-kq7zuqku button');
    const box = await btn.boundingBox();
    console.log('3949 Submit button box:', box);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await btn.click();
    }

    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const msg = document.querySelector('[data-testid="form-message"], [class*="message"], [role="alert"], .wixui-form__message, #comp-kq7zuqku');
        return msg ? msg.innerText : '';
      });
      console.log(`3949 [Sec ${i}]:`, res.replace(/\n+/g, ' | '));
      if (/thanks for submitting|thank you|success/i.test(res)) {
        console.log('>>> 3949 CONFIRMED! <<<');
        break;
      }
    }
    await page.close();
  } catch (e) {
    console.log('3949 err:', e.message);
  }

  await browser.close();
}

testWix();
