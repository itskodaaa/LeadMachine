import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@northeastprecision.com',
  message: 'Hello, I am reaching out to explore potential business collaboration and structural engineering services for our upcoming commercial facility projects. Could someone from your team please get in touch? Thank you.'
};

async function testGodaddyForm() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://qnspc.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    const nameSel = 'input[data-aid="CONTACT_FORM_NAME"]';
    const emailSel = 'input[data-aid="CONTACT_FORM_EMAIL"]';
    const msgSel = 'textarea[data-aid="CONTACT_FORM_MESSAGE"]';
    const btnSel = 'button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]';

    await page.waitForSelector(nameSel, { timeout: 10000 });
    await page.click(nameSel);
    await page.type(nameSel, OUTREACH.fullName, { delay: 40 });

    await page.click(emailSel);
    await page.type(emailSel, OUTREACH.email, { delay: 40 });

    await page.click(msgSel);
    await page.type(msgSel, OUTREACH.message, { delay: 10 });

    console.log('Filled form 837. Clicking submit button...');
    await page.click(btnSel);

    // Wait and observe network / DOM updates
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await page.evaluate(() => {
        const text = document.body.innerText;
        const msg = document.querySelector('[data-ux="AlertMessage"], [role="alert"], [data-aid="CONTACT_FORM_SUCCESS_MESSAGE"], .alert')?.innerText;
        return {
          hasThankYou: text.includes('Thank') || text.includes('thank') || text.includes('sent') || text.includes('received'),
          alertMsg: msg,
          btnText: document.querySelector('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]')?.innerText
        };
      });
      console.log(`Sec ${i+1}:`, status);
      if (status.hasThankYou || status.alertMsg) break;
    }

    await page.screenshot({ path: 'screenshots/837_godaddy_result.png' });

  } catch (err) {
    console.log('Error 837 test:', err.message);
  } finally {
    await browser.close();
  }
}

testGodaddyForm();
