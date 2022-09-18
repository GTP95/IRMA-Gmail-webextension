// @ts-check
const { test, expect, chromium } = require('@playwright/test');

// Data to log in to Google
const email=""
const password=""

/**
 * Google detects Playwright and prevents login. To circumvent Google's detection, I have to use this function.
 * Code adapted from https://stackoverflow.com/questions/65139098/how-to-login-to-google-account-with-playwright
 * Unfortunately it doesn't work anymore...
 *
 * @param email
 * @param password
 * @returns {Promise<void>}
 */
async function logInToGoogle(email, password) {
    const browser = await chromium.launch({
        headless: false,
        args: ["--disable-dev-shm-usage"],
    });
    const context = await browser.newContext({});
    const page = await context.newPage();
    const navigationPromise = page.waitForNavigation({
        waitUntil: "domcontentloaded",
    });
    await page.setDefaultNavigationTimeout(0);
    await page.goto(
        "https://accounts.google.com/signin/v2/identifier?hl=en&flowName=GlifWebSignIn&flowEntry=ServiceLogin"
    );
    await navigationPromise;
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', email);
    await page.click("#identifierNext");
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.type('input[type="password"]', password);
    await page.waitForSelector("#passwordNext", { visible: true });
    await page.click("#passwordNext");
    await navigationPromise;
    //you are in
}

test('Send encrypted email', async ({ page }) => {
    await logInToGoogle(email, password)
    await page.goto('https://mail.google.com/mail/u/0/#inbox');


});