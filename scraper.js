import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DATA_FILE = './parsed_sheet.json';

// Load the database
export function loadDatabase() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading database file, returning empty array', e);
            return [];
        }
    }
    return [];
}

// Save the database
export function saveDatabase(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Scrape a single article URL
export async function scrapeArticle(page, url) {
    console.log(`Navigating to ${url}...`);
    
    // Go to URL and wait for page to be loaded
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check if Cloudflare is present
    const isCloudflare = await page.evaluate(() => {
        return document.title.includes('Cloudflare') || !!document.querySelector('#challenge-running') || !!document.querySelector('#cf-challenge-stage');
    });
    
    if (isCloudflare) {
        console.log('Cloudflare detected! Waiting for user to bypass captcha in headful browser...');
        // Wait up to 5 minutes for the user to bypass captcha
        await page.waitForFunction(() => {
            return !document.title.includes('Cloudflare') && !document.querySelector('#challenge-running') && !document.querySelector('#cf-challenge-stage');
        }, { timeout: 300000 });
        console.log('Bypassed Cloudflare successfully!');
    }
    
    // Give it a second to render JavaScript hydration
    await page.waitForTimeout(1500);
    
    // Wait for code blocks to render if it's a coding problem page
    const hasCodeTabs = await page.evaluate(() => {
        return !!document.querySelector('.code-tabs') || !!document.querySelector('.code-content') || Array.from(document.querySelectorAll('summary')).some(s => s.innerText.trim() === 'Code');
    });
    
    if (hasCodeTabs) {
        await page.waitForSelector('.code-block', { state: 'attached', timeout: 10000 }).catch(() => {});
    }

    // Extract approaches and code blocks using browser DOM query
    const result = await page.evaluate(() => {
        const detailsElements = Array.from(document.querySelectorAll('details'));
        const data = {};
        
        if (detailsElements.length > 0) {
            let currentApproach = 'General';

            for (const details of detailsElements) {
                const summary = details.querySelector('summary');
                if (!summary) continue;

                const summarySpan = summary.querySelector('span');
                const summaryText = (summarySpan ? summarySpan.textContent : summary.textContent).replace(/[\r\n\t]/g, ' ').trim();
                console.log('Evaluator: Found Details summaryText = "' + summaryText + '"');
                
                // Clone details and remove summary to get clean text
                const clone = details.cloneNode(true);
                const cloneSummary = clone.querySelector('summary');
                if (cloneSummary) cloneSummary.remove();
                const detailsContentText = clone.innerText.trim();

                if (summaryText === 'Examples') {
                    data['Examples'] = {
                        title: 'Examples',
                        description: detailsContentText
                    };
                } else if (summaryText === 'Video Explanation') {
                    data['Video Explanation'] = {
                        title: 'Video Explanation',
                        description: detailsContentText
                    };
                } else if (
                    summaryText.toLowerCase().includes('approach') || 
                    summaryText.toLowerCase().includes('force') || 
                    summaryText.toLowerCase().includes('better') || 
                    summaryText.toLowerCase().includes('optimal') || 
                    summaryText.toLowerCase().includes('naive')
                ) {
                    currentApproach = summaryText;
                    
                    // Extract code blocks nested inside the approach details block (for standard page layout)
                    const codeBlocks = Array.from(details.querySelectorAll('.code-block'));
                    const codes = {};
                    for (const block of codeBlocks) {
                        const lang = block.getAttribute('data-lang') || 'unknown';
                        const codeEl = block.querySelector('code, pre');
                        if (codeEl) {
                            codes[lang] = codeEl.textContent.trim();
                        }
                    }
                    
                    data[currentApproach] = {
                        title: currentApproach,
                        description: detailsContentText,
                        code: codes,
                        complexity: ''
                    };
                } else if (summaryText === 'Code') {
                    console.log('Found Code details block. Querying .code-block elements inside details...');
                    const codeBlocks = Array.from(details.querySelectorAll('.code-block'));
                    console.log('Number of code blocks found: ' + codeBlocks.length);
                    const codes = {};
                    for (const block of codeBlocks) {
                        const lang = block.getAttribute('data-lang') || 'unknown';
                        const codeEl = block.querySelector('code, pre');
                        console.log('  Block data-lang: ' + lang + ', code/pre element found: ' + (!!codeEl));
                        if (codeEl) {
                            codes[lang] = codeEl.textContent.trim();
                            console.log('    Scraped code text length: ' + codes[lang].length);
                        }
                    }
                    
                    // Fallback: if no .code-block elements are found, try pre blocks
                    if (Object.keys(codes).length === 0) {
                        const preBlocks = Array.from(details.querySelectorAll('pre'));
                        for (const pre of preBlocks) {
                            let lang = 'unknown';
                            const codeTag = pre.querySelector('code');
                            if (codeTag && codeTag.getAttribute('lang')) {
                                lang = codeTag.getAttribute('lang');
                            } else if (pre.getAttribute('class') && pre.getAttribute('class').includes('language-')) {
                                const match = pre.getAttribute('class').match(/language-(\w+)/);
                                if (match) lang = match[1];
                            }
                            const text = codeTag ? codeTag.textContent : pre.textContent;
                            codes[lang] = text.trim();
                        }
                    }

                    if (!data[currentApproach]) {
                        data[currentApproach] = { title: currentApproach, code: {}, complexity: '' };
                    }
                    data[currentApproach].code = codes;
                } else if (summaryText === 'Complexity Analysis') {
                    if (!data[currentApproach]) {
                        data[currentApproach] = { title: currentApproach, code: {}, complexity: '' };
                    }
                    data[currentApproach].complexity = detailsContentText;
                }
            }
        }
        
        // Fallback for conceptual tutorials or pages with no details tags
        if (Object.keys(data).length === 0) {
            const preBlocks = Array.from(document.querySelectorAll('pre'));
            let snippetCount = 1;
            
            for (const pre of preBlocks) {
                let lang = 'unknown';
                const codeTag = pre.querySelector('code');
                if (codeTag && codeTag.getAttribute('lang')) {
                    lang = codeTag.getAttribute('lang');
                } else if (pre.getAttribute('class') && pre.getAttribute('class').includes('language-')) {
                    const match = pre.getAttribute('class').match(/language-(\w+)/);
                    if (match) lang = match[1];
                }
                
                const text = codeTag ? codeTag.innerText : pre.innerText;
                const codeText = text.trim();
                
                // Only capture blocks that look like actual code snippets (not headers or very short text)
                if (codeText.length > 20) {
                    const approachName = `Snippet ${snippetCount}`;
                    data[approachName] = {
                        title: approachName,
                        description: `Conceptual tutorial code snippet #${snippetCount}`,
                        code: { [lang]: codeText },
                        complexity: 'N/A (Conceptual Tutorial)'
                    };
                    snippetCount++;
                }
            }
        }
        
        return data;
    });

    return result;
}

// Scraper loop orchestrator
export class ScraperOrchestrator {
    constructor(broadcastCallback) {
        this.broadcast = broadcastCallback; // Function to notify Web UI
        this.isRunning = false;
        this.isPaused = false;
        this.browser = null;
        this.page = null;
        this.db = loadDatabase();
    }

    log(message, type = 'info') {
        console.log(`[Scraper] [${type.toUpperCase()}] ${message}`);
        this.broadcast({
            type: 'log',
            data: { message, type, timestamp: new Date().toISOString() }
        });
    }

    sendProgress() {
        // Calculate progress stats
        let total = 0;
        let scraped = 0;
        
        for (const category of this.db) {
            for (const sub of category.subcategories) {
                for (const prob of sub.problems) {
                    total++;
                    if (prob.scraped) {
                        scraped++;
                    }
                }
            }
        }

        this.broadcast({
            type: 'progress',
            data: { total, scraped, percent: total > 0 ? Math.round((scraped / total) * 100) : 0 }
        });
    }

    async stop() {
        this.log('Stopping scraper...');
        this.isRunning = false;
        this.isPaused = false;
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {}
            this.browser = null;
            this.page = null;
        }
        this.broadcast({ type: 'status', data: { status: 'idle' } });
        this.log('Scraper stopped.');
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.log('Scraping paused.');
            this.broadcast({ type: 'status', data: { status: 'paused' } });
        }
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.log('Scraping resumed.');
            this.broadcast({ type: 'status', data: { status: 'running' } });
        }
    }

    async start(selectedProblems = null) {
        if (this.isRunning) {
            this.log('Scraper is already running!', 'warning');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.db = loadDatabase(); // Refresh db
        
        this.broadcast({ type: 'status', data: { status: 'running' } });
        this.log('Launching browser (headful mode)...');

        try {
            this.browser = await chromium.launch({
                headless: false,
                args: ['--disable-blink-features=AutomationControlled']
            });
            const context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            this.page = await context.newPage();
            
            // Forward browser console logs to Node terminal
            this.page.on('console', msg => {
                this.log(`[Browser Console] ${msg.text()}`);
            });
            
            // Bypass webdriver detection
            await this.page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });

            this.log('Browser launched successfully. Starting crawler loop...');

            // Build a flat queue of problems to scrape
            const queue = [];
            for (const category of this.db) {
                for (const sub of category.subcategories) {
                    for (const prob of sub.problems) {
                        // If selectedProblems is provided, scrape only those in the list
                        if (selectedProblems) {
                            if (selectedProblems.includes(prob.problem_id)) {
                                queue.push({ category, subcategory: sub, problem: prob });
                            }
                        } else if (!prob.scraped && prob.article && prob.article !== null) {
                            // By default, scrape unscraped problems with valid article URLs
                            queue.push({ category, subcategory: sub, problem: prob });
                        }
                    }
                }
            }

            this.log(`Queue size: ${queue.length} problems to scrape.`);
            this.sendProgress();

            for (let i = 0; i < queue.length; i++) {
                // Check if stopped
                if (!this.isRunning) break;

                // Handle pause loop
                while (this.isPaused && this.isRunning) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (!this.isRunning) break;

                const { problem, subcategory, category } = queue[i];
                this.log(`[${i + 1}/${queue.length}] Scraping: "${problem.problem_name}" in ${subcategory.subcategory_name}...`);

                this.broadcast({
                    type: 'current_problem',
                    data: { problem_id: problem.problem_id, problem_name: problem.problem_name }
                });

                let targetUrl = problem.article;
                
                // If the URL is the patterns landing page, resolve the actual pattern URL dynamically
                if (targetUrl.includes('must-do-pattern-problems-before-starting-dsa')) {
                    const patternId = problem.problem_name.toLowerCase().replace('pattern', '').trim();
                    this.log(`Resolving individual page URL for Pattern ${patternId}...`);
                    
                    try {
                        // Navigate to the pattern list page to resolve the link
                        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                        
                        // Wait for table checkboxes to render (React hydration)
                        await this.page.waitForSelector('input[id^="pattern_"]', { timeout: 8000 }).catch(() => {});
                        
                        // Get the link matching the pattern ID
                        const resolvedUrl = await this.page.evaluate((id) => {
                            const cb = document.querySelector(`#pattern_${id}`);
                            if (cb) {
                                const tr = cb.closest('tr');
                                if (tr) {
                                    const a = tr.querySelector('a[href*="/pattern/"]');
                                    if (a) return a.href;
                                }
                            }
                            return null;
                        }, patternId);
                        
                        if (resolvedUrl) {
                            this.log(`Resolved Pattern ${patternId} to: ${resolvedUrl}`);
                            targetUrl = resolvedUrl;
                        } else {
                            this.log(`Could not resolve individual URL for Pattern ${patternId}, using landing page instead.`, 'warning');
                        }
                    } catch (resolveErr) {
                        this.log(`Error resolving pattern URL: ${resolveErr.message}. Falling back to landing page.`, 'warning');
                    }
                }

                try {
                    const result = await scrapeArticle(this.page, targetUrl);
                    
                    // Update DB in-memory
                    problem.solutions = result;
                    problem.scraped = true;
                    problem.scraped_at = new Date().toISOString();
                    
                    // Save database after each success to prevent loss
                    saveDatabase(this.db);
                    
                    this.log(`Successfully scraped "${problem.problem_name}"`, 'success');
                    this.sendProgress();
                } catch (err) {
                    this.log(`Failed to scrape "${problem.problem_name}": ${err.message}`, 'error');
                }

                // Random delay to avoid Cloudflare triggers (2-4 seconds)
                const delay = 2000 + Math.random() * 2000;
                this.log(`Waiting ${Math.round(delay/1000)}s before next request...`);
                await new Promise(r => setTimeout(r, delay));
            }

            this.log('Scraper run finished.');
        } catch (e) {
            this.log(`Fatal scraper error: ${e.message}`, 'error');
        } finally {
            await this.stop();
        }
    }
}
