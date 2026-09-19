import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const urlsToCheck = [
  { id: 4489, url: 'https://p2penvironmental.com/contact/' },
  { id: 4490, url: 'https://www.newsomeengineering.com/contact-us/' },
  { id: 4491, url: 'https://pghwong.com' },
  { id: 4492, url: 'https://bce-eng.com/contact-us/' },
  { id: 4493, url: 'https://www.zoltanconsultinginc.com/contact/' },
  { id: 4494, url: 'https://cobbtool.com/contact/' },
  { id: 4496, url: 'https://www.arbisermachine.com/contact' },
  { id: 4496, url: 'https://www.arbisermachine.com/get-a-quote-1' },
  { id: 4497, url: 'https://www.machineshopatl.com/' },
  { id: 4498, url: 'https://www.precisionfabcncmachining.com/contact-us' }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors']
  });

  for (const item of urlsToCheck) {
    console.log(`\n========================================`);
    console.log(`Checking Lead #${item.id} -> ${item.url}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const details = await page.evaluate(() => {
        // forms
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          cls: f.className,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            cls: el.className,
            placeholder: el.placeholder,
            text: el.innerText
          }))
        }));

        // iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(ifm => ({
          src: ifm.src,
          id: ifm.id,
          cls: ifm.className
        }));

        // emails / phone
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const tels = Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href);

        // check visible text snippets
        const bodyText = document.body ? document.body.innerText.replace(/\s+/g, ' ').slice(0, 500) : '';

        return { forms, iframes, mailtos, tels, bodySnippet: bodyText };
      });

      console.log(`Lead #${item.id} result:`);
      console.log(`Forms (${details.forms.length}):`, JSON.stringify(details.forms, null, 2));
      console.log(`Iframes:`, details.iframes);
      console.log(`Mailtos:`, details.mailtos);
      console.log(`Tels:`, details.tels);
      console.log(`Body snippet:`, details.bodySnippet);

    } catch (e) {
      console.log(`Lead #${item.id} failed: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
