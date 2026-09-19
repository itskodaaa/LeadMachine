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

async function testSingle(id, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  
  page.on('dialog', async d => {
    console.log(`[${id} Dialog]: ${d.message()}`);
    await d.dismiss();
  });

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('feedback') || u.includes('form') || u.includes('lead') || u.includes('wp-json')) {
      try {
        const text = await res.text();
        console.log(`[${id} Network Response]: ${u} -> status ${res.status()} -> ${text.slice(0, 200)}`);
      } catch (_) {}
    }
  });

  console.log(`\n================== Inspecting #${id} (${url}) ==================`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('goto err:', e.message));

  if (id === 4743) {
    // ElectricMan
    const details = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        id: i.id,
        val: i.value,
        checked: i.checked,
        outer: i.outerHTML.slice(0, 150)
      }));
      return inputs;
    });
    console.log('4743 inputs:', details);
  }

  if (id === 4745) {
    // ProVision Electric
    const details = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        action: form?.action,
        html: form?.innerHTML.slice(0, 800)
      };
    });
    console.log('4745 form HTML:', details);
  }

  if (id === 4748) {
    // Powerhouse Electric
    const details = await page.evaluate(() => {
      const recaptcha = document.querySelector('.wpcf7-recaptcha, iframe[src*="recaptcha"], input[name="_wpcf7_recaptcha_response"]');
      const form = document.querySelector('form.wpcf7-form');
      return {
        recaptcha: !!recaptcha,
        recaptchaHtml: recaptcha?.outerHTML,
        action: form?.action
      };
    });
    console.log('4748 form:', details);
  }

  if (id === 4750) {
    // Bledsoe
    const details = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        action: form?.action,
        inputs: Array.from(form?.querySelectorAll('input, select, textarea') || []).map(i => ({
          name: i.name,
          type: i.type,
          req: i.required,
          placeholder: i.placeholder
        }))
      };
    });
    console.log('4750 form:', details);
  }

  if (id === 4751) {
    // Texoma
    const details = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, [data-aid]')).map(el => ({
        tag: el.tagName,
        type: el.type,
        aid: el.getAttribute('data-aid'),
        aria: el.getAttribute('aria-label'),
        placeholder: el.placeholder
      }));
      return inputs;
    });
    console.log('4751 inputs:', details);
  }

  await browser.close();
}

async function main() {
  await testSingle(4743, 'https://www.electricmaninc.com/contact-us/');
  await testSingle(4745, 'https://provisionelectric.com/contact');
  await testSingle(4748, 'https://www.powerhouse-electric.com/contact/');
  await testSingle(4750, 'https://bledsoeelectrical.com/contact');
  await testSingle(4751, 'https://www.texomaelectricservice.com/free-estimate');
}

main();
