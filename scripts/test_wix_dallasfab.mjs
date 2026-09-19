import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Precision CNC Machining & Manufacturing Capabilities Inquiry',
  message: `Hello, I am reaching out on behalf of Northeast Precision Machinery, Inc. We specialize in precision CNC machining, tooling, and custom components. We would like to learn more about your available production capacity. Thank you, Pamela Jameson`
};

async function inspectWixForm() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    await page.goto('https://www.dallasfab.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll form into view
    await page.evaluate(() => {
      document.querySelector('#comp-khdim069').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click inputs directly to trigger Wix focus/blur handlers
    await page.click('#input_comp-khdim07m');
    await page.type('#input_comp-khdim07m', profile.fullName, { delay: 20 });

    await page.click('#input_comp-khdim083');
    await page.type('#input_comp-khdim083', profile.email, { delay: 20 });

    await page.click('#input_comp-khdim0891');
    await page.type('#input_comp-khdim0891', profile.subject, { delay: 20 });

    await page.click('#textarea_comp-khdim08f1');
    await page.type('#textarea_comp-khdim08f1', profile.message, { delay: 10 });

    // Inspect form before clicking
    const preSubmit = await page.evaluate(() => {
      const f = document.querySelector('#comp-khdim069');
      return f.innerText;
    });
    console.log('Pre-submit form text:\n', preSubmit);

    // Real user mouse click on submit button
    const btn = await page.$('#comp-khdim069 button.wixui-button');
    const box = await btn.boundingBox();
    console.log('Submit button bounding box:', box);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    console.log('Clicked submit button via mouse coordinates.');

    // Wait up to 10 seconds checking every 1s for any DOM changes in the form
    for (let i = 1; i <= 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const postSubmit = await page.evaluate(() => {
        const f = document.querySelector('#comp-khdim069');
        return {
          text: f ? f.innerText : '',
          html: f ? f.innerHTML.slice(0, 300) : ''
        };
      });
      console.log(`[Second ${i}] Form text:\n`, postSubmit.text.replace(/\n+/g, ' | '));
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

inspectWixForm().catch(console.error);
