import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testFocus() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Paradigm (#4430)
  console.log('--- FOCUS: PARADIGM (#4430) ---');
  try {
    const page = await browser.newPage();
    page.on('response', async res => {
      if (res.url().includes('contact') || res.url().includes('form') || res.url().includes('message') || res.url().includes('api')) {
        try {
          const status = res.status();
          const text = await res.text();
          if (text.length < 500) {
            console.log(`[Paradigm Res ${status}] ${res.url()}:`, text);
          }
        } catch (e) {}
      }
    });

    await page.goto('https://paradigmeng.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#input1', PROFILE.name);
    await page.type('#input2', PROFILE.email);
    await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', PROFILE.message);

    console.log('Clicking Paradigm submit...');
    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body.innerText;
        const msg = document.querySelector('[data-aid="CONTACT_FORM_CONFIRMATION_MESSAGE_REND"]');
        return {
          hasThankYou: /thank you/i.test(text),
          confirmationMsg: msg ? msg.innerText : null,
          bodySnippet: text.slice(0, 500)
        };
      });
      console.log('Paradigm confirmation:', confirmation);
    }
    await page.close();
  } catch (e) {
    console.log('Paradigm error:', e.message);
  }

  // 2. ICE (#4429)
  console.log('\n--- FOCUS: ICE (#4429) ---');
  try {
    const page = await browser.newPage();
    page.on('response', async res => {
      if (res.url().includes('contact-forms') || res.url().includes('wpcf7')) {
        try {
          console.log(`[ICE CF7 Res ${res.status()}] ${res.url()}:`, await res.text());
        } catch (e) {}
      }
    });

    await page.goto('https://iceagents.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="your-name"]', PROFILE.name);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('input[name="your-subject"]', PROFILE.subject);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('Submitting ICE form...');
    await page.evaluate(() => {
      const btn = document.querySelector('form.wpcf7-form input[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 8000));

    const iceRes = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return {
        status: out ? out.innerText : 'none',
        cls: out ? out.className : 'none',
        html: out ? out.outerHTML : 'none'
      };
    });
    console.log('ICE CF7 output:', iceRes);
    await page.close();
  } catch (e) {
    console.log('ICE error:', e.message);
  }

  // 3. Dynabal (#4433)
  console.log('\n--- FOCUS: DYNABAL (#4433) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dynabal.com/contact.html', { waitUntil: 'domcontentloaded' });
    const dyna = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const formIndex = html.indexOf('<form');
      return {
        formSnippet: formIndex !== -1 ? html.slice(formIndex, formIndex + 300) : 'No <form tag found in innerHTML',
        text: document.body.innerText
      };
    });
    console.log('Dynabal snippet:', dyna.formSnippet);
    console.log('Dynabal text preview:', dyna.text.slice(0, 300));
    await page.close();
  } catch (e) {
    console.log('Dynabal error:', e.message);
  }

  await browser.close();
}

testFocus();
