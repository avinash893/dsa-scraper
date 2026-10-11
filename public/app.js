// App Global State
let dsaSheet = [];
let selectedProblems = new Set();
let solvedProblems = new Set(JSON.parse(localStorage.getItem('solvedProblems') || '[]'));
let activeProblem = null;
let currentLanguage = 'cpp';
let ws = null;

// DOM Elements
const sheetTreeEl = document.getElementById('sheet-explorer-tree');
const searchInput = document.getElementById('search-input');
const filterInfo = document.getElementById('filter-info');
const selectAllCheckbox = document.getElementById('select-all-problems');
const selectionCountText = document.getElementById('selection-count');
const scrapeSelectedBtn = document.getElementById('btn-scrape-selected');
const scrapeSelectedText = document.getElementById('btn-sel-count');

const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnResume = document.getElementById('btn-resume');
const btnStop = document.getElementById('btn-stop');
const btnExport = document.getElementById('btn-export');
const btnRandom = document.getElementById('btn-random');
const btnClearConsole = document.getElementById('btn-clear-console');
const consoleOutput = document.getElementById('console-output');

const statusIndicator = document.getElementById('status-indicator');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');

const viewerEmptyState = document.getElementById('viewer-empty-state');
const viewerContentState = document.getElementById('viewer-content-state');
const viewProbName = document.getElementById('view-problem-name');
const viewProbDifficulty = document.getElementById('view-problem-difficulty');
const viewProbCategory = document.getElementById('view-problem-category');
const linkLeetcode = document.getElementById('link-leetcode');
const linkArticle = document.getElementById('link-article');
const btnToggleSolved = document.getElementById('btn-toggle-solved');
const approachSelect = document.getElementById('approach-select');
const langTabsContainer = document.getElementById('lang-tabs-container');
const codeDisplay = document.getElementById('code-display');
const complexityDisplay = document.getElementById('complexity-display');
const btnCopyCode = document.getElementById('btn-copy-code');

// Initialize the Application
async function init() {
    setupEventListeners();
    await fetchSheetData();
    connectWebSocket();
}

// Fetch Striver Sheet JSON Database from Backend or Static File
async function fetchSheetData() {
    try {
        let response;
        try {
            response = await fetch('./api/sheet');
            if (!response.ok) throw new Error('API not available');
        } catch {
            response = await fetch('./parsed_sheet.json');
        }
        dsaSheet = await response.json();
        renderExplorerTree();
        updateFilterInfo();
    } catch (e) {
        console.error('Error fetching sheet data:', e);
        logToConsole(`Error: Failed to fetch sheet data: ${e.message}`, 'error');
    }
}

// Connect to WebSocket Server for Real-Time Updates
function connectWebSocket() {
    if (window.location.hostname.includes('github.io')) {
        logToConsole('[System] Running on GitHub Pages. Problem explorer, solutions, and random practice are active!', 'success');
        return;
    }

    const loc = window.location;
    const wsUri = (loc.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + loc.host;
    
    ws = new WebSocket(wsUri);
    
    ws.onopen = () => {
        logToConsole('[System] Connected to server feed.', 'success');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWSMessage(message);
    };
    
    ws.onclose = () => {
        logToConsole('[System] Connection to server feed closed. Reconnecting in 3s...', 'warning');
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
    };
}

// Handle WebSocket updates
function handleWSMessage(msg) {
    const { type, data } = msg;
    
    switch (type) {
        case 'status':
            updateStatusUI(data.status);
            break;
            
        case 'progress':
            updateProgressUI(data);
            break;
            
        case 'current_problem':
            highlightActiveScraping(data.problem_id);
            break;
            
        case 'log':
            logToConsole(data.message, data.type);
            break;
    }
}

// Log utility for the UI terminal
function logToConsole(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Update Scraper Status Badge & Toggle Action Buttons Disabled State
function updateStatusUI(status) {
    statusIndicator.className = `status-badge status-${status}`;
    statusIndicator.querySelector('.status-label').innerText = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (status === 'running') {
        btnStart.disabled = true;
        btnPause.disabled = false;
        btnPause.style.display = 'inline-flex';
        btnResume.style.display = 'none';
        btnStop.disabled = false;
    } else if (status === 'paused') {
        btnStart.disabled = true;
        btnPause.style.display = 'none';
        btnResume.style.display = 'inline-flex';
        btnResume.disabled = false;
        btnStop.disabled = false;
    } else { // idle
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnPause.style.display = 'inline-flex';
        btnResume.style.display = 'none';
        btnStop.disabled = true;
        
        // Refresh DB data to show scraped checkmarks immediately
        fetchSheetData();
    }
}

// Update progress bar
function updateProgressUI(data) {
    const { total, scraped, percent } = data;
    progressText.innerText = `${scraped} / ${total} (${percent}%)`;
    progressFill.style.width = `${percent}%`;
}

// Highlight the problem currently being scraped
function highlightActiveScraping(problemId) {
    document.querySelectorAll('.problem-item').forEach(el => {
        el.classList.remove('scraping-active');
    });
    const el = document.querySelector(`.problem-item[data-id="${problemId}"]`);
    if (el) {
        el.classList.add('scraping-active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Setup Interactive UI Listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', filterTree);
    
    // Checkbox select all
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
    
    // Scraper API controls
    btnStart.addEventListener('click', () => triggerScraperAction('start'));
    btnPause.addEventListener('click', () => triggerScraperAction('pause'));
    btnResume.addEventListener('click', () => triggerScraperAction('resume'));
    btnStop.addEventListener('click', () => triggerScraperAction('stop'));
    
    // Selected scraping action
    scrapeSelectedBtn.addEventListener('click', () => triggerScraperAction('start', Array.from(selectedProblems)));
    
    // Export files
    btnExport.addEventListener('click', exportFiles);
    
    // Random practice question picker
    btnRandom.addEventListener('click', pickRandomQuestion);
    
    // Solved Toggle button inside viewer
    btnToggleSolved.addEventListener('click', () => {
        if (activeProblem) {
            toggleSolvedState(activeProblem.problem_id);
        }
    });
    
    // Clear Console
    btnClearConsole.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
        logToConsole('[System] Console logs cleared.');
    });

    // Copy Code
    btnCopyCode.addEventListener('click', copyCodeToClipboard);
    
    // Approach select change
    approachSelect.addEventListener('change', (e) => {
        renderCodeContent();
    });
    
    // Lang tabs select
    langTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentLanguage = e.target.getAttribute('data-lang');
            renderCodeContent();
        }
    });
}

// Trigger scraper action on backend
async function triggerScraperAction(action, problems = null) {
    if (window.location.hostname.includes('github.io')) {
        logToConsole(`[Notice] Scraper crawler controls require running locally with Node.js. All 474 problems and solutions are already pre-scraped and fully accessible here!`, 'warning');
        return;
    }

    try {
        let endpoint = `/api/${action}`;
        let options = { method: 'POST' };
        
        if (action === 'start') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({ problems });
        }
        
        const res = await fetch(endpoint, options);
        const data = await res.json();
        
        if (!data.success) {
            logToConsole(`Error: ${data.error || 'Request failed'}`, 'error');
        }
    } catch (e) {
        logToConsole(`Error: Failed to perform action: ${e.message}`, 'error');
    }
}

// Helper to sanitize path names
function sanitizeExportName(name) {
    if (!name) return '';
    return name
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
}

// Export solution files as a downloadable ZIP package
function exportFiles() {
    logToConsole('[Exporter] Triggering solution ZIP download...');
    
    // If running on GitHub Pages (or static mode) and JSZip is available, build zip client-side
    if (window.location.hostname.includes('github.io') && typeof JSZip !== 'undefined') {
        logToConsole('[Exporter] Generating ZIP archive in browser...', 'info');
        try {
            const zip = new JSZip();
            const extensionMap = {
                'cpp': '.cpp', 'c++': '.cpp', 'java': '.java',
                'python': '.py', 'py': '.py', 'javascript': '.js',
                'js': '.js', 'c#': '.cs', 'csharp': '.cs'
            };

            let fileCount = 0;
            dsaSheet.forEach((category, catIdx) => {
                const catName = `${String(catIdx + 1).padStart(2, '0')}. ${sanitizeExportName(category.category_name)}`;
                category.subcategories.forEach((sub, subIdx) => {
                    const subName = `${String(subIdx + 1).padStart(2, '0')}. ${sanitizeExportName(sub.subcategory_name)}`;
                    sub.problems.forEach((prob) => {
                        if (prob.scraped && prob.solutions) {
                            const probName = sanitizeExportName(prob.problem_name);
                            const folderPath = `${catName}/${subName}/${probName}`;
                            Object.entries(prob.solutions).forEach(([approachName, approachDetails]) => {
                                if (approachDetails && approachDetails.code) {
                                    Object.entries(approachDetails.code).forEach(([lang, codeText]) => {
                                        const ext = extensionMap[lang.toLowerCase()] || `.${lang}`;
                                        const sanitizedApproach = sanitizeExportName(approachName);
                                        zip.file(`${folderPath}/${sanitizedApproach}${ext}`, codeText);
                                        fileCount++;
                                    });
                                }
                            });
                        }
                    });
                });
            });

            if (fileCount === 0) {
                logToConsole('[Exporter] No scraped solutions found to export.', 'warning');
                return;
            }

            zip.generateAsync({ type: 'blob' }).then((content) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = 'striver_dsa_solutions.zip';
                a.click();
                logToConsole(`[Exporter] Successfully exported ${fileCount} files into striver_dsa_solutions.zip!`, 'success');
            }).catch(err => {
                logToConsole(`[Exporter] Failed to build ZIP: ${err.message}`, 'error');
            });
            return;
        } catch (err) {
            logToConsole(`[Exporter] Client-side ZIP error: ${err.message}`, 'error');
        }
    }

    try {
        // Trigger browser's native file download via backend
        window.location.href = './api/export-zip';
        logToConsole('[Exporter] Download started.', 'success');
    } catch (e) {
        logToConsole(`[Exporter] Error: Request failed: ${e.message}`, 'error');
    }
}

// Render dynamic collapsible explorer tree
function renderExplorerTree() {
    sheetTreeEl.innerHTML = '';
    
    if (dsaSheet.length === 0) {
        sheetTreeEl.innerHTML = '<div class="loading-state"><span>No data available. Scrape data to populate.</span></div>';
        return;
    }

    dsaSheet.forEach((category) => {
        const catNode = document.createElement('div');
        catNode.className = 'tree-node-category';
        catNode.setAttribute('data-name', category.category_name.toLowerCase());
        
        const catHeader = document.createElement('div');
        catHeader.className = 'tree-node-header';
        
        const arrow = document.createElement('span');
        arrow.className = 'tree-node-arrow';
        arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>`;
        
        const title = document.createElement('span');
        title.className = 'tree-node-title';
        title.innerText = category.category_name;
        
        const count = document.createElement('span');
        count.className = 'tree-node-count';
        
        // Count total problems in category
        let totalCount = 0;
        category.subcategories.forEach(sub => totalCount += sub.problems.length);
        count.innerText = totalCount;
        
        // Category Checkbox
        const catLabel = document.createElement('label');
        catLabel.className = 'checkbox-container';
        catLabel.style.marginRight = '8px';
        
        const catCheckbox = document.createElement('input');
        catCheckbox.type = 'checkbox';
        catCheckbox.addEventListener('change', () => {
            category.subcategories.forEach(sub => {
                sub.problems.forEach(prob => {
                    if (catCheckbox.checked) {
                        selectedProblems.add(prob.problem_id);
                    } else {
                        selectedProblems.delete(prob.problem_id);
                    }
                });
            });
            updateSelectionUI();
        });
        
        const catCheckmark = document.createElement('span');
        catCheckmark.className = 'checkmark';
        
        catLabel.appendChild(catCheckbox);
        catLabel.appendChild(catCheckmark);
        
        catHeader.appendChild(arrow);
        catHeader.appendChild(catLabel);
        catHeader.appendChild(title);
        catHeader.appendChild(count);
        catNode.appendChild(catHeader);
        
        // Expand / Collapse Category Node
        catHeader.addEventListener('click', (e) => {
            if (e.target.closest('.checkbox-container') || e.target.type === 'checkbox') return;
            catNode.classList.toggle('expanded');
        });
        
        const subList = document.createElement('div');
        subList.className = 'tree-children-subcategories';
        
        category.subcategories.forEach((sub) => {
            const subNode = document.createElement('div');
            subNode.className = 'tree-node-subcategory';
            subNode.setAttribute('data-name', sub.subcategory_name.toLowerCase());
            
            const subHeader = document.createElement('div');
            subHeader.className = 'tree-node-header';
            
            const subArrow = document.createElement('span');
            subArrow.className = 'tree-node-arrow';
            subArrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>`;
            
            // Subcategory Checkbox
            const subLabel = document.createElement('label');
            subLabel.className = 'checkbox-container';
            subLabel.style.marginRight = '8px';
            
            const subCheckbox = document.createElement('input');
            subCheckbox.type = 'checkbox';
            subCheckbox.addEventListener('change', () => {
                sub.problems.forEach(prob => {
                    if (subCheckbox.checked) {
                        selectedProblems.add(prob.problem_id);
                    } else {
                        selectedProblems.delete(prob.problem_id);
                    }
                });
                updateSelectionUI();
            });
            
            const subCheckmark = document.createElement('span');
            subCheckmark.className = 'checkmark';
            
            subLabel.appendChild(subCheckbox);
            subLabel.appendChild(subCheckmark);
            
            const subTitle = document.createElement('span');
            subTitle.className = 'tree-node-title';
            subTitle.innerText = sub.subcategory_name;
            
            const subCount = document.createElement('span');
            subCount.className = 'tree-node-count';
            subCount.innerText = sub.problems.length;
            
            subHeader.appendChild(subArrow);
            subHeader.appendChild(subLabel);
            subHeader.appendChild(subTitle);
            subHeader.appendChild(subCount);
            subNode.appendChild(subHeader);
            
            // Expand / Collapse Subcategory Node
            subHeader.addEventListener('click', (e) => {
                if (e.target.closest('.checkbox-container') || e.target.type === 'checkbox') return;
                subNode.classList.toggle('expanded');
            });
            
            const probList = document.createElement('div');
            probList.className = 'tree-children-problems';
            
            sub.problems.forEach((prob) => {
                const probItem = document.createElement('div');
                probItem.className = `problem-item ${prob.scraped ? 'scraped' : ''}`;
                probItem.setAttribute('data-id', prob.problem_id);
                probItem.setAttribute('data-name', prob.problem_name.toLowerCase());
                
                // Active highlight
                if (activeProblem && activeProblem.problem_id === prob.problem_id) {
                    probItem.classList.add('active');
                }
                
                // Checkbox for selection
                const label = document.createElement('label');
                label.className = 'checkbox-container';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = selectedProblems.has(prob.problem_id);
                checkbox.addEventListener('change', () => {
                    toggleProblemSelection(prob.problem_id, checkbox.checked);
                });
                
                const checkmark = document.createElement('span');
                checkmark.className = 'checkmark';
                
                label.appendChild(checkbox);
                label.appendChild(checkmark);
                probItem.appendChild(label);
                
                // Status dot
                const statusDot = document.createElement('span');
                statusDot.className = 'problem-status';
                probItem.appendChild(statusDot);
                
                // Title
                const probTitle = document.createElement('span');
                probTitle.className = 'problem-title';
                probTitle.innerText = prob.problem_name;
                probItem.appendChild(probTitle);
                
                // Solved status icon button
                const isSolved = solvedProblems.has(prob.problem_id);
                if (isSolved) {
                    probItem.classList.add('is-solved');
                }
                
                const solvedIcon = document.createElement('span');
                solvedIcon.className = `solved-status-icon ${isSolved ? 'solved' : ''}`;
                solvedIcon.title = isSolved ? 'Mark as unsolved' : 'Mark as solved';
                solvedIcon.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                
                solvedIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSolvedState(prob.problem_id);
                });
                probItem.appendChild(solvedIcon);
                
                // Difficulty
                const diffBadge = document.createElement('span');
                diffBadge.className = `badge difficulty-${prob.difficulty.toLowerCase()}`;
                diffBadge.innerText = prob.difficulty;
                probItem.appendChild(diffBadge);
                
                probList.appendChild(probItem);
                
                // Click on problem item to view details
                probTitle.addEventListener('click', () => loadProblemViewer(prob, category.category_name));
                diffBadge.addEventListener('click', () => loadProblemViewer(prob, category.category_name));
            });
            
            subNode.appendChild(probList);
            subList.appendChild(subNode);
        });
        
        catNode.appendChild(subList);
        sheetTreeEl.appendChild(catNode);
    });
    
    updateAllCheckboxStates();
}

// Handle checkbox selection toggle for a specific problem
function toggleProblemSelection(problemId, isChecked) {
    if (isChecked) {
        selectedProblems.add(problemId);
    } else {
        selectedProblems.delete(problemId);
    }
    updateSelectionUI();
}

// Toggle Select All checkbox
function toggleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    
    document.querySelectorAll('.problem-item input[type="checkbox"]').forEach(cb => {
        cb.checked = isChecked;
        const problemId = cb.closest('.problem-item').getAttribute('data-id');
        if (isChecked) {
            selectedProblems.add(problemId);
        } else {
            selectedProblems.delete(problemId);
        }
    });
    
    updateSelectionUI();
}

// Update UI based on selected problems count
function updateSelectionUI() {
    const count = selectedProblems.size;
    if (count > 0) {
        selectionCountText.innerText = `${count} problem(s) selected`;
        scrapeSelectedBtn.style.display = 'inline-flex';
        scrapeSelectedText.innerText = count;
    } else {
        selectionCountText.innerText = 'All unscraped problems queue';
        scrapeSelectedBtn.style.display = 'none';
    }
    
    updateAllCheckboxStates();
}

// Update checked and indeterminate states of category, subcategory, and problem checkboxes
function updateAllCheckboxStates() {
    // 1. Update individual problem checkboxes in the DOM
    document.querySelectorAll('.problem-item').forEach(item => {
        const id = item.getAttribute('data-id');
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb) {
            cb.checked = selectedProblems.has(id);
        }
    });

    // 2. Update category & subcategory checkboxes in the DOM
    dsaSheet.forEach(category => {
        // Collect all problem IDs in this category
        const catProbIds = [];
        category.subcategories.forEach(sub => {
            sub.problems.forEach(p => catProbIds.push(p.problem_id));
        });
        
        // Find category node
        const catNode = document.querySelector(`.tree-node-category[data-name="${category.category_name.toLowerCase()}"]`);
        if (catNode) {
            const catCheckbox = catNode.querySelector('.tree-node-header input[type="checkbox"]');
            if (catCheckbox) {
                const catAllChecked = catProbIds.every(id => selectedProblems.has(id));
                const catSomeChecked = catProbIds.some(id => selectedProblems.has(id));
                catCheckbox.checked = catAllChecked && catProbIds.length > 0;
                catCheckbox.indeterminate = catSomeChecked && !catAllChecked;
            }
        }
        
        // Process subcategories
        category.subcategories.forEach(sub => {
            const subProbIds = sub.problems.map(p => p.problem_id);
            const subNode = document.querySelector(`.tree-node-subcategory[data-name="${sub.subcategory_name.toLowerCase()}"]`);
            if (subNode) {
                const subCheckbox = subNode.querySelector('.tree-node-header input[type="checkbox"]');
                if (subCheckbox) {
                    const allChecked = subProbIds.every(id => selectedProblems.has(id));
                    const someChecked = subProbIds.some(id => selectedProblems.has(id));
                    subCheckbox.checked = allChecked && subProbIds.length > 0;
                    subCheckbox.indeterminate = someChecked && !allChecked;
                }
            }
        });
    });
}

// Filter explorer tree based on search query
function filterTree() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        // Show everything
        document.querySelectorAll('.tree-node-category, .tree-node-subcategory, .problem-item').forEach(el => {
            el.style.display = '';
        });
        updateFilterInfo();
        return;
    }
    
    let visibleCount = 0;
    
    dsaSheet.forEach(cat => {
        let catHasVisible = false;
        
        cat.subcategories.forEach(sub => {
            let subHasVisible = false;
            
            sub.problems.forEach(prob => {
                const isMatch = prob.problem_name.toLowerCase().includes(query) || 
                                prob.difficulty.toLowerCase().includes(query);
                
                const itemEl = document.querySelector(`.problem-item[data-id="${prob.problem_id}"]`);
                if (itemEl) {
                    if (isMatch) {
                        itemEl.style.display = '';
                        subHasVisible = true;
                        visibleCount++;
                    } else {
                        itemEl.style.display = 'none';
                    }
                }
            });
            
            const subNodeEl = document.querySelector(`.tree-node-subcategory[data-name="${sub.subcategory_name.toLowerCase()}"]`);
            if (subNodeEl) {
                if (subHasVisible) {
                    subNodeEl.style.display = '';
                    subNodeEl.classList.add('expanded');
                    catHasVisible = true;
                } else {
                    subNodeEl.style.display = 'none';
                }
            }
        });
        
        const catNodeEl = document.querySelector(`.tree-node-category[data-name="${cat.category_name.toLowerCase()}"]`);
        if (catNodeEl) {
            if (catHasVisible) {
                catNodeEl.style.display = '';
                catNodeEl.classList.add('expanded');
            } else {
                catNodeEl.style.display = 'none';
            }
        }
    });
    
    filterInfo.innerText = `Found ${visibleCount} matches`;
}

// Update filter counts
function updateFilterInfo() {
    let total = 0;
    dsaSheet.forEach(cat => {
        cat.subcategories.forEach(sub => {
            total += sub.problems.length;
        });
    });
    filterInfo.innerText = `Total ${total} problems`;
}

// Load problem in right viewer panel
function loadProblemViewer(problem, categoryName) {
    activeProblem = problem;
    
    // Update solved status button state
    updateSolvedButtonState(problem.problem_id);
    
    // Highlight in explorer list
    document.querySelectorAll('.problem-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.problem-item[data-id="${problem.problem_id}"]`);
    if (el) el.classList.add('active');
    
    // Toggle viewer states
    viewerEmptyState.style.display = 'none';
    viewerContentState.style.display = 'block';
    
    // Title, Category & Difficulty
    viewProbName.innerText = problem.problem_name;
    viewProbCategory.innerText = categoryName;
    
    viewProbDifficulty.className = `badge difficulty-${problem.difficulty.toLowerCase()}`;
    viewProbDifficulty.innerText = problem.difficulty;
    
    // External links
    if (problem.leetcode && problem.leetcode !== null) {
        linkLeetcode.href = problem.leetcode;
        linkLeetcode.style.display = 'inline-flex';
    } else {
        linkLeetcode.style.display = 'none';
    }
    
    if (problem.article && problem.article !== null) {
        linkArticle.href = problem.article;
        linkArticle.style.display = 'inline-flex';
    } else {
        linkArticle.style.display = 'none';
    }
    
    // Render approach select dropdown
    approachSelect.innerHTML = '';
    
    if (problem.scraped && problem.solutions && Object.keys(problem.solutions).length > 0) {
        // Problem has solution code scraped
        let approachCount = 0;
        
        Object.entries(problem.solutions).forEach(([approachName, details]) => {
            if (approachName === 'Examples' || approachName === 'Video Explanation') return;
            
            const option = document.createElement('option');
            option.value = approachName;
            option.innerText = approachName;
            approachSelect.appendChild(option);
            approachCount++;
        });
        
        if (approachCount === 0) {
            // Fallback: solution might only be raw code
            const option = document.createElement('option');
            option.value = 'General';
            option.innerText = 'General Solution';
            approachSelect.appendChild(option);
        }
        
        approachSelect.disabled = false;
        renderCodeContent();
    } else {
        // Problem is not scraped yet
        const option = document.createElement('option');
        option.value = 'none';
        option.innerText = 'Not Scraped Yet';
        approachSelect.appendChild(option);
        approachSelect.disabled = true;
        
        codeDisplay.innerText = '// This problem has not been scraped yet.\n// Click "Start Scraper" above to crawl solutions.';
        complexityDisplay.innerText = 'Time Complexity: Unknown\nSpace Complexity: Unknown';
    }
}

// Render code content in viewer based on current language and approach selection
function renderCodeContent() {
    if (!activeProblem || !activeProblem.solutions) return;
    
    const selectedApproach = approachSelect.value;
    const approachData = activeProblem.solutions[selectedApproach];
    
    // Update language tabs based on languages available in this approach
    langTabsContainer.innerHTML = '';
    
    if (approachData && approachData.code && Object.keys(approachData.code).length > 0) {
        const availableLangs = Object.keys(approachData.code);
        
        // Render tabs
        availableLangs.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${lang === currentLanguage ? 'active' : ''}`;
            btn.setAttribute('data-lang', lang);
            
            // Format lang string nicely
            let langLabel = lang.toUpperCase();
            if (lang === 'cpp') langLabel = 'C++';
            if (lang === 'javascript') langLabel = 'JS';
            if (lang === 'python') langLabel = 'Python';
            
            btn.innerText = langLabel;
            langTabsContainer.appendChild(btn);
        });
        
        // If currentLanguage is not available in the new approach, switch to first available
        if (!availableLangs.includes(currentLanguage)) {
            currentLanguage = availableLangs[0];
            // Highlight new active tab
            setTimeout(() => {
                const newTab = langTabsContainer.querySelector(`[data-lang="${currentLanguage}"]`);
                if (newTab) newTab.classList.add('active');
            }, 0);
        }
        
        const codeText = approachData.code[currentLanguage];
        codeDisplay.innerText = codeText || '// No code solution for this language.';
        
        // Complexity
        complexityDisplay.innerText = approachData.complexity || 'Complexity analysis not available.';
    } else {
        codeDisplay.innerText = '// No code solutions available for this approach.';
        complexityDisplay.innerText = 'Complexity analysis not available.';
    }
}

// Copy current code text to clipboard
function copyCodeToClipboard() {
    const codeText = codeDisplay.innerText;
    if (!codeText) return;
    
    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = btnCopyCode.innerHTML;
        btnCopyCode.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <span style="color: var(--color-success)">Copied!</span>`;
        setTimeout(() => {
            btnCopyCode.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code: ', err);
    });
}

// Pick a random question from the Striver sheet for practice
function pickRandomQuestion() {
    if (dsaSheet.length === 0) {
        logToConsole("No sheet data loaded yet.", "warning");
        return;
    }
    
    // 1. Gather all problems from all categories
    const allProblems = [];
    dsaSheet.forEach(cat => {
        cat.subcategories.forEach(sub => {
            sub.problems.forEach(prob => {
                // Ensure the problem has at least one valid external link
                const hasValidLink = (prob.leetcode && prob.leetcode.trim() !== '') || 
                                     (prob.article && prob.article.trim() !== '') ||
                                     (prob.link && prob.link.trim() !== '');
                if (hasValidLink) {
                    allProblems.push({
                        problem: prob,
                        category: cat.category_name,
                        subcategory: sub.subcategory_name
                    });
                }
            });
        });
    });
    
    if (allProblems.length === 0) {
        logToConsole("No valid questions found for practice.", "error");
        return;
    }
    
    // 2. Prioritize unsolved questions
    let candidates = allProblems.filter(item => !solvedProblems.has(item.problem.problem_id));
    if (candidates.length === 0) {
        // If all are solved, pick from any problem
        candidates = allProblems;
        logToConsole("Outstanding! You've solved all questions! Picking from the full list again.", "success");
    }
    
    // 3. Choose a random question
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    const { problem, category, subcategory } = chosen;
    
    logToConsole(`🎲 Practice: Selected random question: "${problem.problem_name}" under ${category} -> ${subcategory}`, "info");
    
    // 4. Locate DOM elements and expand ancestors
    const catNode = document.querySelector(`.tree-node-category[data-name="${category.toLowerCase()}"]`);
    if (catNode && !catNode.classList.contains('expanded')) {
        catNode.classList.add('expanded');
    }
    
    const subNode = document.querySelector(`.tree-node-subcategory[data-name="${subcategory.toLowerCase()}"]`);
    if (subNode && !subNode.classList.contains('expanded')) {
        subNode.classList.add('expanded');
    }
    
    // 5. Select and view the problem
    loadProblemViewer(problem, category);
    
    // 6. Scroll the tree item into view smoothly
    setTimeout(() => {
        const itemEl = document.querySelector(`.problem-item[data-id="${problem.problem_id}"]`);
        if (itemEl) {
            itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary subtle flash highlight
            itemEl.style.transition = 'background-color 0.3s ease';
            itemEl.style.backgroundColor = 'hsla(280, 75%, 55%, 0.2)';
            setTimeout(() => {
                itemEl.style.backgroundColor = '';
            }, 1000);
        }
    }, 150);
}

// Toggle solved status of a problem
function toggleSolvedState(problemId) {
    const isSolved = solvedProblems.has(problemId);
    if (isSolved) {
        solvedProblems.delete(problemId);
    } else {
        solvedProblems.add(problemId);
    }
    
    // Persist to localStorage
    localStorage.setItem('solvedProblems', JSON.stringify(Array.from(solvedProblems)));
    
    // Update Solved Button in Viewer if active
    if (activeProblem && activeProblem.problem_id === problemId) {
        updateSolvedButtonState(problemId);
    }
    
    // Update individual problem row in the explorer tree
    const itemEl = document.querySelector(`.problem-item[data-id="${problemId}"]`);
    if (itemEl) {
        const iconEl = itemEl.querySelector('.solved-status-icon');
        if (isSolved) {
            itemEl.classList.remove('is-solved');
            if (iconEl) {
                iconEl.classList.remove('solved');
                iconEl.title = 'Mark as solved';
            }
        } else {
            itemEl.classList.add('is-solved');
            if (iconEl) {
                iconEl.classList.add('solved');
                iconEl.title = 'Mark as unsolved';
            }
        }
    }
    
    logToConsole(`Updated solved status for problem ID ${problemId}.`, "info");
}

// Update the Solve Toggle button styling in the viewer panel
function updateSolvedButtonState(problemId) {
    const isSolved = solvedProblems.has(problemId);
    const span = btnToggleSolved.querySelector('span');
    const svg = btnToggleSolved.querySelector('svg');
    if (isSolved) {
        btnToggleSolved.classList.add('btn-solved-active');
        if (span) span.innerText = 'Solved!';
        if (svg) svg.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4" stroke="currentColor"/>';
    } else {
        btnToggleSolved.classList.remove('btn-solved-active');
        if (span) span.innerText = 'Mark Solved';
        if (svg) svg.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke="currentColor"/>';
    }
}

// Start application
window.addEventListener('load', init);
