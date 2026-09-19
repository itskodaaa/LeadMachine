import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(name, url) {
  console.log(`\n========================================\nChecking ${name}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
      console.log('goto error:', e.message);
      return null;
    });
    if (resp) {
      console.log(`Status: ${resp.status()}`);
    }
    console.log(`Final URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
    console.log(`Body excerpt: ${bodyText.replace(/\n+/g, ' ')}`);

    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder
      }))
    })));
    console.log(`Forms found:`, JSON.stringify(forms, null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await checkSite('4673 Contact page', 'https://artisticlightinginstalls.com/contact/');
  await checkSite('4674 AZ DC Electric', 'https://azdcelectric.com');
  await checkSite('4674 AZ DC Electric www', 'https://www.azdcelectric.com');
  await checkSite('4677 Unique Electrical', 'https://uniqueelectrical.com');
  await checkSite('4677 Unique Electrical www', 'https://www.uniqueelectrical.com');
  await checkSite('4682 Winsupply', 'https://www.winsupplyinc.com');
  await checkSite('4682 Winsupply http', 'http://www.winsupplyinc.com');
}

main().catch(console.error);
