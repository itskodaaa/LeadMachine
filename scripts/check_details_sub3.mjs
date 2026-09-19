import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkDetails() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Check 3305 contact page
  console.log('\n--- Checking 3305 https://idspower.com/contact-us/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder,
          aria: i.getAttribute('aria-label')
        })),
        captcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]')
      }));
      return { title: document.title, forms, text: document.body.innerText.slice(0, 500) };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) { console.log('3305 err:', e.message); }

  // Check 3300 contact page
  console.log('\n--- Checking 3300 https://www.mitek-us.com/contact/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.mitek-us.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder
        })),
        captcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]')
      }));
      return { title: document.title, forms, text: document.body.innerText.slice(0, 500) };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) { console.log('3300 err:', e.message); }

  // Check 3304 jmweld.com form fields
  console.log('\n--- Checking 3304 https://jmweld.com/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jmweld.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const fields = Array.from(form.querySelectorAll('input, textarea')).map(el => {
        const label = el.closest('label')?.innerText || document.querySelector(`label[for="${el.id}"]`)?.innerText || el.previousElementSibling?.innerText || '';
        return {
          tag: el.tagName,
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          ariaLabel: el.getAttribute('aria-label'),
          dataAid: el.getAttribute('data-aid'),
          label: label.trim()
        };
      });
      return { fields, html: form.innerHTML.slice(0, 1000) };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) { console.log('3304 err:', e.message); }

  // Check 3306 contact page text
  console.log('\n--- Checking 3306 https://www.toveyengineering.com/contact-us ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.toveyengineering.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    console.log('3306 Contact Page Text:', text.slice(0, 1000));
    await page.close();
  } catch (e) { console.log('3306 err:', e.message); }

  // Check 3303 gp.com contact page
  console.log('\n--- Checking 3303 https://www.gp.com/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.gp.com/about-us/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('3303 URL:', page.url());
    const info = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText.slice(0, 800),
      forms: document.querySelectorAll('form').length
    }));
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) { console.log('3303 err:', e.message); }

  // Test 3301 & 3302 curl / reachability
  await browser.close();
}

checkDetails();
