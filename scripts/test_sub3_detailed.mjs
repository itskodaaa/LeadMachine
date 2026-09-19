import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(name, url) {
  console.log(`\n========================================`);
  console.log(`Investigating: ${name} (${url})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => {
      console.log(`Goto error: ${e.message}`);
      return null;
    });

    console.log(`URL: ${page.url()}`);
    console.log(`Status: ${resp ? resp.status() : 'N/A'}`);
    console.log(`Title: ${await page.title().catch(() => 'N/A')}`);

    const info = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.slice(0, 500) : '';
      const forms = Array.from(document.querySelectorAll('form')).map(f => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }));
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
        return { action: f.action, fields, buttons };
      });
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      const recaptchas = document.querySelectorAll('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]').length;
      return { snippet: text.replace(/\s+/g, ' '), forms, iframes, recaptchas };
    });

    console.log(`Snippet: ${info.snippet}`);
    console.log(`Forms: ${JSON.stringify(info.forms, null, 2)}`);
    console.log(`Captcha elements: ${info.recaptchas}`);
    console.log(`Iframes: ${info.iframes.slice(0, 5)}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await checkSite('3918 FreeDimension Contact', 'https://freedimension.net/contact');
  await checkSite('3919 HR CNC Contact', 'https://www.hrcnc.net/contact');
  await checkSite('3920 Prince Ind Contact', 'https://www.princeind.com/contact/');
  await checkSite('3921 Anchor Machine Contact', 'https://anchormachineshop.com/contact-us/');
  await checkSite('3921 Anchor Machine RFQ', 'https://anchormachineshop.com/request-quote/');
  await checkSite('3922 MAX Machine Lander', 'https://maxmachine.biz');
  await checkSite('3923 Catamount Machine', 'https://catmw.com');
  await checkSite('3925 Aztec Welding Contact', 'https://aztec-welding.com/contact-us/');
  await checkSite('3926 Dalane Machining', 'https://www.dalanemachining.com/');
  await checkSite('3927 Hernandez Contact', 'https://hernandezmashineshop.com/tampa-manufacturing-metal-parts');
  await checkSite('3928 Performance King', 'https://performanceking.com/');
}

run();
