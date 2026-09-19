import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  subject: 'Precision CNC Machining Inquiry',
  message: 'We are expanding our machining partner network and would like to discuss capabilities.'
};

async function checkWix() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('wix') || u.includes('form') || u.includes('contact')) {
      if (res.request().method() === 'POST') {
        console.log(`[POST REQUEST]: ${u} -> status: ${res.status()}`);
        try {
          console.log(`   Response text: ${(await res.text()).slice(0, 200)}`);
        } catch (_) {}
      }
    }
  });

  await page.goto('https://www.dallasfab.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Set values and dispatch events
  const fillResult = await page.evaluate((prof) => {
    function setReactValue(el, val) {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const nameInp = document.querySelector('#input_comp-khdim07m');
    const emailInp = document.querySelector('#input_comp-khdim083');
    const subjInp = document.querySelector('#input_comp-khdim0891');
    const msgInp = document.querySelector('#textarea_comp-khdim08f1');

    if (!nameInp || !emailInp || !msgInp) return 'inputs not found';

    setReactValue(nameInp, prof.fullName);
    setReactValue(emailInp, prof.email);
    if (subjInp) setReactValue(subjInp, prof.subject);
    setReactValue(msgInp, prof.message);

    return {
      name: nameInp.value,
      email: emailInp.value,
      valid: document.querySelector('#comp-khdim069').checkValidity()
    };
  }, profile);

  console.log('Fill result:', fillResult);

  // Click submit button
  const btn = await page.$('#comp-khdim069 button.wixui-button');
  await btn.click();
  console.log('Clicked submit button.');

  await new Promise(r => setTimeout(r, 6000));

  const postState = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="notification"], [class*="success"], [class*="error"], [id*="notification"]'))
      .map(el => ({ tag: el.tagName, class: el.className, text: el.innerText }));
    return {
      alerts,
      formText: document.querySelector('#comp-khdim069') ? document.querySelector('#comp-khdim069').innerText : 'no form'
    };
  });

  console.log('Post state:', JSON.stringify(postState, null, 2));
  await browser.close();
}

checkWix().catch(console.error);
