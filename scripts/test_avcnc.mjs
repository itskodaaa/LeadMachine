import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testAvcnc() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('secureserver.net') || url.includes('messages') || url.includes('contact')) {
      console.log(`[API Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[API Body] ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://avcnc.net/ ...');
    await page.goto('https://avcnc.net/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill GoDaddy form using React-friendly input setting
    const fillSuccess = await page.evaluate(() => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ? Object.getOwnPropertyDescriptor(element, 'value').set : null;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value') ? Object.getOwnPropertyDescriptor(prototype, 'value').set : null;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const form = document.querySelector('form.x-el-form');
      if (!form) return { ok: false, error: 'no form' };

      const inputs = Array.from(form.querySelectorAll('input[type="text"]:not([name="_app_id"]), input[type="email"]'));
      const textarea = form.querySelector('textarea');
      const submitBtn = form.querySelector('button, [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

      if (inputs.length < 2 || !textarea || !submitBtn) {
        return { ok: false, inputsCount: inputs.length, hasTextarea: !!textarea, hasBtn: !!submitBtn };
      }

      setNativeValue(inputs[0], 'Pamela Jameson');
      setNativeValue(inputs[1], 'pamela.jameson@northeastprecision.com');
      setNativeValue(textarea, 'Hello, Northeast Precision Machinery specializes in precision machining, custom CNC fabrication, and tooling solutions. We would welcome the opportunity to discuss manufacturing requirements or support upcoming projects. Best regards, Pamela Jameson | 708-568-3708');

      return { ok: true };
    });

    console.log('Fill result:', fillSuccess);

    if (fillSuccess.ok) {
      await new Promise(r => setTimeout(r, 1000));
      console.log('Clicking GoDaddy submit button...');
      const btn = await page.$('form.x-el-form button, form.x-el-form [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 6000));

        const result = await page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText : '';
          const hasConfirm = /thank you|we will be in touch|message sent|thanks for reaching out/i.test(bodyText);
          const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MSG"], [data-aid="CONTACT_FORM_SUCCESS_MSG_REND"]');
          return {
            hasConfirm,
            successText: successEl ? successEl.innerText : null
          };
        });

        console.log('Submission result on avcnc.net:', JSON.stringify(result, null, 2));
      }
    }
  } catch (e) {
    console.error('Error on avcnc.net:', e);
  } finally {
    await browser.close();
  }
}

testAvcnc();
