import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function tryLaystromAndBraner() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Try Laystrom
  console.log('--- Testing Laystrom ---');
  const page1 = await browser.newPage();
  try {
    await page1.goto('https://www.laystrom.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    await page1.type('#et_pb_contact_name_0', 'Pamela Jameson', { delay: 30 });
    await page1.type('#et_pb_contact_email_0', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page1.type('#et_pb_contact_message_0', 'Hello, Northeast Precision Machinery provides precision CNC machining, custom fabrication, and equipment solutions. We would welcome the opportunity to connect with Laystrom Manufacturing regarding potential machining requirements or tooling support. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });
    
    // Submit button
    const submitBtn = await page1.$('button.et_pb_contact_submit');
    if (submitBtn) {
      console.log('Found Laystrom submit button, clicking...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const text = await page1.evaluate(() => document.body.innerText);
      const success = /thanks for contacting|message has been sent|thank you/i.test(text);
      console.log('Laystrom confirmation:', success);
      const contactMsg = await page1.evaluate(() => {
        const el = document.querySelector('.et-pb-contact-message');
        return el ? el.innerText : null;
      });
      console.log('Laystrom contact message:', contactMsg);
    } else {
      console.log('No submit button found for Laystrom');
    }
  } catch (e) {
    console.log('Error testing Laystrom:', e.message);
  }
  await page1.close();

  // 2. Try Braner
  console.log('\n--- Testing Braner ---');
  const page2 = await browser.newPage();
  try {
    await page2.goto('https://www.braner.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    await page2.type('#fname', 'Pamela', { delay: 30 });
    await page2.type('#lname', 'Jameson', { delay: 30 });
    await page2.type('#phone', '7085683708', { delay: 30 });
    await page2.type('#email', 'pamela.jameson@northeastprecision.com', { delay: 30 });
    await page2.type('#comments', 'Hello, Northeast Precision Machinery specializes in precision machining and equipment support. We would appreciate the opportunity to collaborate or assist with any upcoming machining or manufacturing requirements. Best regards, Pamela Jameson | 708-568-3708', { delay: 10 });
    
    const submitBtn2 = await page2.$('form[action*="contact"] input[type="submit"], form[action*="contact"] button');
    if (submitBtn2) {
      console.log('Found Braner submit button, clicking...');
      await Promise.all([
        page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(e => console.log('Navigation timeout/none:', e.message)),
        submitBtn2.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const text2 = await page2.evaluate(() => document.body.innerText);
      const success2 = /thank you|received|submitted|inquiry/i.test(text2);
      console.log('Braner current URL:', page2.url());
      console.log('Braner confirmation:', success2);
      console.log('Braner snippet:', text2.slice(0, 300));
    } else {
      console.log('No submit button found for Braner');
    }
  } catch (e) {
    console.log('Error testing Braner:', e.message);
  }
  await page2.close();

  await browser.close();
}

tryLaystromAndBraner();
