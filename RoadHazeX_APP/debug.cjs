const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for the login screen or home screen
    await new Promise(r => setTimeout(r, 2000));
    console.log("Current URL after load:", page.url());

    // Evaluate the page text to see if we're on login or home
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if (bodyHTML.includes("Sign in with Google")) {
        console.log("Page is on Login Screen, can't easily click to Report without auth.");
    } else {
        // Find the report hazard button (usually "Report Hazard")
        console.log("Looking for report hazard button...");
        try {
            // Find an element containing "Report" or "Report Hazard"
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a, div'));
                const reportBtn = buttons.find(b => b.innerText && b.innerText.includes('Report Hazard'));
                if (reportBtn) {
                    reportBtn.click();
                    console.log("Clicked Report Hazard");
                } else {
                    console.log("Could not find Report Hazard button");
                }
            });
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.log("Error clicking:", e.message);
        }
    }

    await browser.close();
})();
