import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkLabels() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Toolcraft
  {
    console.log("=== Toolcraft ===");
    const page = await browser.newPage();
    await page.goto('https://aztoolcraft.com/#contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    const fields = await page.evaluate(() => {
      const form = document.querySelector('#gform_1');
      if (!form) return "No gform_1";
      return Array.from(form.querySelectorAll('.gfield')).map(gf => {
        const label = gf.querySelector('label')?.innerText || '';
        const inputs = Array.from(gf.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type
        }));
        return { label, inputs };
      });
    });
    console.log("Toolcraft fields:", JSON.stringify(fields, null, 2));
    await page.close();
  }

  // 2. Cupps
  {
    console.log("=== Cupps ===");
    const page = await browser.newPage();
    await page.goto('https://www.cuppsind.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    const fields = await page.evaluate(() => {
      const form = document.querySelector('#gform_1');
      if (!form) return "No gform_1";
      return Array.from(form.querySelectorAll('.gfield')).map(gf => {
        const label = gf.querySelector('label')?.innerText || '';
        const inputs = Array.from(gf.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type
        }));
        return { label, inputs };
      });
    });
    console.log("Cupps fields:", JSON.stringify(fields, null, 2));
    await page.close();
  }

  // 3. Kaplan
  {
    console.log("=== Kaplan ===");
    const page = await browser.newPage();
    await page.goto('https://kaplanmfg.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    const fields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return "No form";
      return Array.from(form.querySelectorAll('div, label')).map(el => el.innerText).filter(t => t && t.length < 50);
    });
    console.log("Kaplan form text:", fields);
    await page.close();
  }

  await browser.close();
}

checkLabels();
