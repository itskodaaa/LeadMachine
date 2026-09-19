import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkEpeAndSme() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });

  // 1. SME
  console.log('--- Checking SME Homepage and Navigation ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sme-usa.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('SME Current URL:', page.url());
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      })).filter(l => l.href.includes('sme-usa.com') && l.text.length > 0);
    });
    console.log('SME links count:', links.length);
    console.log('SME links sample:', links.filter(l => l.text.toLowerCase().includes('contact') || l.href.includes('contact') || l.text.toLowerCase().includes('about') || l.href.includes('location')));
    await page.close();
  } catch (e) { console.log('SME err:', e.message); }

  // 2. EPE Consulting
  console.log('--- Checking EPE Consulting /contact ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://epeconsulting.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('EPE Current URL:', page.url());
    const epeData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        id: f.id,
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
          tag: i.tagName,
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder
        }))
      }));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]');
      const hasHubspot = !!document.querySelector('.hs-form, iframe[src*="hubspot"]');
      return { forms, iframes, hasRecaptcha, hasHubspot, bodySnippet: document.body.innerText.slice(0, 500) };
    });
    console.log('EPE Data:', JSON.stringify(epeData, null, 2));
    await page.close();
  } catch (e) { console.log('EPE err:', e.message); }

  await browser.close();
}

checkEpeAndSme();
