import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(id, name, urls) {
  console.log(`\n========================================`);
  console.log(`Checking Lead #${id}: ${name}`);
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  for (const url of urls) {
    try {
      console.log(`Trying URL: ${url}`);
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log(`Response status: ${res ? res.status() : 'no res'}`);
      console.log(`Final URL: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);
      const bodySnippet = await page.evaluate(() => (document.body ? document.body.innerText.slice(0, 500) : 'NO BODY'));
      console.log(`Body snippet: ${bodySnippet.replace(/\n+/g, ' ')}`);

      // All forms
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => i.name || i.id || i.placeholder)
        }));
      });
      console.log(`Forms found:`, forms);

      // Email links or mailto
      const mailtos = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      });
      console.log(`Mailtos:`, mailtos);

      // Links with contact
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|about|touch/i.test(a.innerText || '') || /contact/i.test(a.href))
          .map(a => ({ text: a.innerText.trim(), href: a.href }));
      });
      console.log(`Contact Links:`, contactLinks);
      break;
    } catch (e) {
      console.log(`Failed URL ${url}: ${e.message}`);
    }
  }
  await browser.close();
}

async function run() {
  await checkSite(4149, 'United Engineers, Inc.', ['http://unitede.com', 'https://unitede.com', 'https://www.unitede.com']);
  await checkSite(4153, 'DEC', ['http://decorp.com', 'https://decorp.com', 'https://www.decorp.com']);
  await checkSite(4154, 'Fabric Estimating LLC', ['https://www.fabricestimating.us/', 'https://www.fabricestimating.us/#contact']);
  await checkSite(4155, 'Stanford Engineering, LLC', ['https://www.stanfordeng.com/contact-us', 'https://www.stanfordeng.com/']);
  await checkSite(4157, 'MOMENTUM STRUCTURAL ENGINEERING LLC', ['http://msetexas.com', 'https://msetexas.com', 'https://www.msetexas.com']);
}

run();
