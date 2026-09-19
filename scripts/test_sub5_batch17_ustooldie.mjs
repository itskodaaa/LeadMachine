import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testUsToolDie() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('dialog', async d => {
    console.log('ALERT:', d.message());
    await d.accept();
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('api.emailjs.com') || url.includes('emailjs')) {
      console.log('EMAILJS Response:', res.status(), url);
      try {
        const text = await res.text();
        console.log('EMAILJS Response Body:', text);
      } catch (e) {}
    }
  });

  await page.goto('https://ustooldie.com/', { waitUntil: 'networkidle2' });

  // Fill using react-safe native value setter
  await page.evaluate(() => {
    const nameInput = document.getElementById('Name');
    const emailInput = document.getElementById('Email');
    const msgInput = document.getElementById('Message');

    function setVal(el, val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                     Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setVal(nameInput, 'Pamela Jameson');
    setVal(emailInput, 'pamela.jameson@nortiheastprecision.com');
    setVal(msgInput, 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson');
  });

  console.log('Values set in DOM. Clicking submit button...');
  const submitSuccess = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) {
      btn.scrollIntoView();
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked:', submitSuccess);

  await new Promise(r => setTimeout(r, 6000));

  const afterState = await page.evaluate(() => {
    return {
      text: document.body.innerText.substring(0, 500).replace(/\s+/g, ' '),
      nameVal: document.getElementById('Name')?.value,
      emailVal: document.getElementById('Email')?.value,
      msgVal: document.getElementById('Message')?.value
    };
  });
  console.log('After submit state:', afterState);

  await page.close();
  await browser.close();
}

testUsToolDie().catch(console.error);
