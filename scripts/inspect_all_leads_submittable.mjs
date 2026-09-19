import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function check3418(browser) {
  console.log('\n=============================================');
  console.log('--- 3418: Hardin & Associates Consulting ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://hactexas.com/contact', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const elements = await page.evaluate(() => {
      const f = document.querySelector('#demo-form');
      if (!f) return 'No form';
      return Array.from(f.querySelectorAll('button, input, a, div[class*="btn"], span[class*="btn"]')).map(el => ({
        tag: el.tagName,
        type: el.type,
        cls: el.className,
        id: el.id,
        text: el.innerText
      }));
    });
    console.log('Elements in #demo-form:', elements);
  } catch (e) {
    console.error('3418 error:', e.message);
  } finally {
    await page.close();
  }
}

async function check3422(browser) {
  console.log('\n=============================================');
  console.log('--- 3422: Magee Machine & Manufacturing Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.mageemachine.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    const btn = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).map(x => ({
        id: x.id,
        text: x.innerText,
        testid: x.getAttribute('data-testid')
      }));
      return b;
    });
    console.log('Buttons on Magee:', btn);
  } catch (e) {
    console.error('3422 error:', e.message);
  } finally {
    await page.close();
  }
}

async function check3423(browser) {
  console.log('\n=============================================');
  console.log('--- 3423: Keith and Company, Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://keithmachine.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    const inputs = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return 'No form';
      return Array.from(f.querySelectorAll('input, textarea, button, label')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        text: el.innerText
      }));
    });
    console.log('Inputs/labels on Keith machine:', inputs);
  } catch (e) {
    console.error('3423 error:', e.message);
  } finally {
    await page.close();
  }
}

async function check3425(browser) {
  console.log('\n=============================================');
  console.log('--- 3425: Microspace Instruments Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mspace.com/request-for-quote', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    const inputs = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return 'No form';
      return Array.from(f.querySelectorAll('input, textarea, button, label')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        text: el.innerText
      }));
    });
    console.log('Inputs/labels on Microspace:', inputs);
  } catch (e) {
    console.error('3425 error:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await check3418(browser);
  await check3422(browser);
  await check3423(browser);
  await check3425(browser);

  await browser.close();
}

main();
