import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSyms() {
  console.log('\n================== SYMS HTML INSPECT ==================');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('https://syms-e.com/sub/contact.php.html', { waitUntil: 'networkidle2' });
  const formHtml = await page.evaluate(() => {
    const f = document.querySelector('#frm');
    return f ? f.outerHTML : 'no form found';
  });
  console.log('SYMS #frm outerHTML:\n', formHtml);
  await browser.close();
}

async function checkClyde() {
  console.log('\n================== CLYDE HTML INSPECT ==================');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('https://clyde-industries.com/about-us/#contact', { waitUntil: 'networkidle2' });
  const formHtml = await page.evaluate(() => {
    const f = document.querySelector('.wpcf7-form');
    return f ? f.outerHTML : 'no wpcf7-form found';
  });
  console.log('Clyde .wpcf7-form outerHTML (first 1500 chars):\n', formHtml.substring(0, 1500));
  await browser.close();
}

async function checkWeiser() {
  console.log('\n================== WEISER HTML INSPECT ==================');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('https://www.weiser-engineering.com/', { waitUntil: 'networkidle2' });
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return 'no form';
    return {
      outerHTML: form.outerHTML.substring(0, 1000),
      buttons: Array.from(form.querySelectorAll('button, input[type="submit"]')).map(b => ({
        tag: b.tagName,
        type: b.type,
        id: b.id,
        text: b.innerText,
        classes: b.className,
        outerHTML: b.outerHTML
      }))
    };
  });
  console.log('Weiser form info:', JSON.stringify(formInfo, null, 2));
  await browser.close();
}

async function checkOthers() {
  console.log('\n================== CHECKING 4468, 4471, 4473, 4474, 4476 ==================');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // 4468 Thomas & Hutton
  const p1 = await browser.newPage();
  await p1.goto('https://www.thomasandhutton.com/contact/', { waitUntil: 'networkidle2' });
  const tHutton = await p1.evaluate(() => {
    return {
      title: document.title,
      text: document.body.innerText.substring(0, 1000),
      forms: document.querySelectorAll('form').length,
      mailtos: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href)
    };
  });
  console.log('Thomas & Hutton contact page:', tHutton);
  await p1.close();

  // 4471 HTS 3D
  const p2 = await browser.newPage();
  await p2.goto('https://hts-3d.com/contact/', { waitUntil: 'networkidle2' });
  const hts = await p2.evaluate(() => {
    return {
      title: document.title,
      text: document.body.innerText.substring(0, 1000),
      forms: document.querySelectorAll('form').length,
      mailtos: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href)
    };
  });
  console.log('HTS 3D contact page:', hts);
  await p2.close();

  // 4473 Selco USA
  const p3 = await browser.newPage();
  await p3.goto('https://selcousa.com/contact/', { waitUntil: 'networkidle2' });
  const selco = await p3.evaluate(() => {
    return {
      title: document.title,
      text: document.body.innerText.substring(0, 1000),
      forms: Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.substring(0, 300)),
      mailtos: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href)
    };
  });
  console.log('Selco contact page:', selco);
  await p3.close();

  // 4474 Skyline
  const p4 = await browser.newPage();
  try {
    await p4.goto('https://www.skyline-ec.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Skyline www url:', p4.url(), 'title:', await p4.title());
  } catch (e) {
    console.log('Skyline www error:', e.message);
  }
  await p4.close();

  // 4476 Techwood
  const p5 = await browser.newPage();
  await p5.goto('https://techwoodengineering.com/', { waitUntil: 'networkidle2' });
  const techwood = await p5.evaluate(() => {
    return {
      title: document.title,
      text: document.body.innerText.substring(0, 1000),
      mailtos: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href),
      links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }))
    };
  });
  console.log('Techwood info:', techwood);
  await p5.close();

  await browser.close();
}

async function main() {
  await checkSyms();
  await checkClyde();
  await checkWeiser();
  await checkOthers();
}

main();
