const puppeteer = require('puppeteer');

setTimeout(async () => {
    console.log('Fetching page with puppeteer...');
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('http://localhost:4200');
        await new Promise(r => setTimeout(r, 4000));
        
        await browser.close();
        console.log('Done waiting.');
    } catch(e) {
        console.log('Puppeteer fetch error:', e);
    }
    process.exit(0);
}, 100);
