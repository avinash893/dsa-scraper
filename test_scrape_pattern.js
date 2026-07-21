import { chromium } from 'playwright';

async function test() {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://takeuforward.org/pattern/pattern-1-rectangular-star-pattern/';
    
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for code blocks
    console.log("Waiting for code block or pre...");
    await page.waitForSelector('.code-block, pre', { timeout: 10000 });
    
    // Query DOM details
    const result = await page.evaluate(() => {
        const details = Array.from(document.querySelectorAll('details'));
        const info = [];
        for (const det of details) {
            const summary = det.querySelector('summary');
            if (!summary) continue;
            const summaryText = summary.innerText.trim();
            const codeBlocks = Array.from(det.querySelectorAll('.code-block'));
            const preBlocks = Array.from(det.querySelectorAll('pre'));
            info.push({
                summary: summaryText,
                codeBlocksCount: codeBlocks.length,
                preBlocksCount: preBlocks.length,
                firstPreSnippet: preBlocks.length > 0 ? preBlocks[0].innerText.substring(0, 100) : 'none'
            });
        }
        return info;
    });
    
    console.log("Evaluation result:", JSON.stringify(result, null, 2));
    await browser.close();
}

test().catch(console.error);
