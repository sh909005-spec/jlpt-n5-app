document.addEventListener('DOMContentLoaded', () => {
    // Initialize fixed questions for listening
    const fixedGrids = document.querySelectorAll('.questions-grid[data-fixed]');
    fixedGrids.forEach(grid => {
        const numQuestions = parseInt(grid.getAttribute('data-fixed'), 10);
        const optionsCount = parseInt(grid.getAttribute('data-options') || '4', 10);
        for (let i = 0; i < numQuestions; i++) {
            grid.appendChild(createQuestionElement(grid.children.length + 1, 'circle', optionsCount));
        }
    });

    // Initialize one question for dynamic grids
    const dynamicGrids = document.querySelectorAll('.questions-grid:not([data-fixed])');
    dynamicGrids.forEach(grid => {
        grid.appendChild(createQuestionElement(1));
    });

    const form = document.getElementById('jlptForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            vocab: getSectionData('vocabSection'),
            grammar: getSectionData('grammarSection'),
            reading: getSectionData('readingSection'),
            listening: getSectionData('listeningSection')
        };

        // Local calculation logic (ported from backend)
        const calculateScores = (section) => {
            let score = 0;
            let max = 0;
            for (let mondai in section) {
                score += section[mondai].correct * section[mondai].mark;
                max += section[mondai].total * section[mondai].mark;
            }
            return { score, max };
        };
        
        const vocab = calculateScores(data.vocab);
        const grammar = calculateScores(data.grammar);
        const reading = calculateScores(data.reading);
        const listening = calculateScores(data.listening);
        
        const lang_score = vocab.score + grammar.score + reading.score;
        const lang_max = vocab.max + grammar.max + reading.max; // Should be 120 visually
        
        const list_score = listening.score;
        const list_max = listening.max; // Should be 60 visually
        
        const total_score = lang_score + list_score;
        
        const getRefGrade = (score, max) => {
            if (max === 0) return 'C';
            const pct = score / max;
            if (pct >= 0.67) return 'A';
            if (pct >= 0.34) return 'B';
            return 'C';
        };
        
        let passed = false;
        if (total_score >= 80 && lang_score >= 38 && list_score >= 19) {
            passed = true;
        }
        
        const result = {
            lang_score: parseFloat(lang_score.toFixed(2)),
            lang_max: 120, // Fixed layout
            list_score: parseFloat(list_score.toFixed(2)),
            list_max: 60, // Fixed layout
            total_score: parseFloat(total_score.toFixed(2)),
            total_max: 180, // Fixed layout
            vocab_ref: getRefGrade(vocab.score, vocab.max),
            grammar_ref: getRefGrade(grammar.score, grammar.max),
            reading_ref: getRefGrade(reading.score, reading.max),
            passed: passed
        };
            
            // Update certificate HTML
            updateCertificate(result);
            
            // Show certificate wrapper
            document.getElementById('certificate-wrapper').style.display = 'flex';
            
            // Update name
            const nameInput = document.getElementById('examineeName').value.trim();
            const nameContainer = document.getElementById('cert-name-container');
            const nameDisplay = document.getElementById('cert-name-display');
            if (nameInput) {
                nameDisplay.innerText = nameInput;
                nameContainer.style.display = 'block';
            } else {
                nameContainer.style.display = 'none';
            }
            
            // Save report to localStorage
            const modelTestInput = document.getElementById('modelTestNum') ? document.getElementById('modelTestNum').value.trim() : '';
            const reportData = {
                id: Date.now(),
                date: new Date().toLocaleDateString(),
                name: nameInput || 'Anonymous',
                modelTest: modelTestInput || 'N/A',
                score: result.total_score,
                max: result.total_max,
                passed: result.passed
            };
            saveReport(reportData);
            
            // Generate Image
            generateImage();
    });
});

function createQuestionElement(index, defaultType = 'circle', optionsCount = 4) {
    const row = document.createElement('div');
    row.className = 'question-row';
    
    // 1. Question Number
    const numDiv = document.createElement('div');
    numDiv.className = 'q-num';
    numDiv.innerText = index;
    
    // 2. Type Selector (small)
    const typeDiv = document.createElement('div');
    typeDiv.className = 'q-type';
    const typeSelect = document.createElement('select');
    typeSelect.className = 'q-type-select';
    typeSelect.innerHTML = `
        <option value="circle" ${defaultType === 'circle' ? 'selected' : ''}>OMR</option>
        <option value="text" ${defaultType === 'text' ? 'selected' : ''}>Text</option>
    `;
    typeDiv.appendChild(typeSelect);
    
    // 3. Input Area (Bubbles / Text)
    const inputArea = document.createElement('div');
    inputArea.className = 'q-input-area';
    
    const circleDiv = document.createElement('div');
    circleDiv.className = 'q-bubbles';
    const qName = `q-${Math.random().toString(36).substr(2, 9)}`;
    let bubblesHTML = '';
    for(let i=1; i<=optionsCount; i++) {
        bubblesHTML += `<label class="omr-btn"><input type="radio" name="${qName}" value="${i}"><span>${i}</span></label>`;
    }
    circleDiv.innerHTML = bubblesHTML;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'q-text';
    textDiv.style.display = defaultType === 'text' ? 'flex' : 'none';
    textDiv.innerHTML = `<input type="text" class="omr-text" placeholder="Text...">`;
    
    // Initial display logic
    if (defaultType === 'text') {
        circleDiv.style.display = 'none';
    } else {
        circleDiv.style.display = 'flex';
    }
    
    inputArea.appendChild(circleDiv);
    inputArea.appendChild(textDiv);
    
    // Type change listener
    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'circle') {
            circleDiv.style.display = 'flex';
            textDiv.style.display = 'none';
        } else {
            circleDiv.style.display = 'none';
            textDiv.style.display = 'block';
        }
    });

    // 4. Grading Area (Correct Checkbox)
    const gradingDiv = document.createElement('div');
    gradingDiv.className = 'q-correct-box';
    const correctCheck = document.createElement('input');
    correctCheck.type = 'checkbox';
    correctCheck.className = 'correct-checkbox';
    correctCheck.title = 'Mark as Correct';
    gradingDiv.appendChild(correctCheck);
    
    row.appendChild(numDiv);
    row.appendChild(typeDiv);
    row.appendChild(inputArea);
    row.appendChild(gradingDiv);

    return row;
}

window.addQuestion = function(mondaiId) {
    const grid = document.querySelector(`#${mondaiId} .questions-grid`);
    const newIndex = grid.children.length + 1;
    let defaultType = 'circle';
    const optionsCount = parseInt(grid.getAttribute('data-options') || '4', 10);
    
    // Inherit the type from the last question in the grid
    if (grid.children.length > 0) {
        const lastSelect = grid.lastElementChild.querySelector('.q-type-select');
        if (lastSelect) {
            defaultType = lastSelect.value;
        }
    }
    
    grid.appendChild(createQuestionElement(newIndex, defaultType, optionsCount));
};

window.removeQuestion = function(mondaiId) {
    const grid = document.querySelector(`#${mondaiId} .questions-grid`);
    if (grid.children.length > 0) {
        grid.removeChild(grid.lastChild);
    }
};

function getSectionData(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return {};
    
    const data = {};
    const mondais = section.querySelectorAll('.mondai-container');
    
    mondais.forEach((mondai, index) => {
        const id = mondai.id;
        const markInput = mondai.querySelector('.mark-input');
        const mark = parseFloat(markInput.value) || 0;
        
        const checkboxes = mondai.querySelectorAll('.correct-checkbox');
        const total = checkboxes.length;
        let correct = 0;
        
        checkboxes.forEach(cb => {
            if (cb.checked) correct++;
        });
        
        data[id] = { mark, total, correct };
    });
    
    return data;
}

function updateCertificate(result) {
    // Passed / Failed
    const statusEl = document.getElementById('cert-passed-status');
    if (result.passed) {
        statusEl.innerText = '合格 / Passed';
        statusEl.className = 'status-passed';
    } else {
        statusEl.innerText = '不合格 / Failed';
        statusEl.className = 'status-failed';
    }
    
    // Scores
    document.getElementById('cert-lang-score').innerText = `${result.lang_score} / ${result.lang_max}`;
    document.getElementById('cert-list-score').innerText = `${result.list_score} / ${result.list_max}`;
    document.getElementById('cert-total-score').innerText = `${result.total_score} / ${result.total_max}`;
    
    // References
    document.getElementById('cert-vocab-ref').innerText = result.vocab_ref;
    document.getElementById('cert-grammar-ref').innerText = result.grammar_ref;
    document.getElementById('cert-reading-ref').innerText = result.reading_ref;
}

function generateImage() {
    const certElement = document.getElementById('certificate');
    
    html2canvas(certElement, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff'
    }).then(canvas => {
        // Create download link
        const link = document.createElement('a');
        link.download = 'JLPT_N5_Result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Optionally, append canvas to view on page
        // const wrapper = document.getElementById('certificate-wrapper');
        // wrapper.innerHTML = ''; 
        // wrapper.appendChild(canvas);
        
        // Hide wrapper again if we only want download, but let's keep it visible
    });
}

// Report functionality
function saveReport(reportData) {
    let reports = JSON.parse(localStorage.getItem('jlpt_reports') || '[]');
    reports.push(reportData);
    localStorage.setItem('jlpt_reports', JSON.stringify(reports));
}

window.toggleReportsModal = function() {
    const modal = document.getElementById('reports-modal');
    if (modal.style.display === 'none') {
        loadReports();
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

function loadReports() {
    const tbody = document.getElementById('reports-tbody');
    const noMsg = document.getElementById('no-reports-msg');
    const table = document.querySelector('.reports-table');
    let reports = JSON.parse(localStorage.getItem('jlpt_reports') || '[]');
    
    tbody.innerHTML = '';
    
    if (reports.length === 0) {
        noMsg.style.display = 'block';
        table.style.display = 'none';
    } else {
        noMsg.style.display = 'none';
        table.style.display = 'table';
        
        // Sort by id descending (newest first)
        reports.sort((a, b) => b.id - a.id);
        
        reports.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${r.name}</td>
                <td>${r.modelTest}</td>
                <td>${r.score} / ${r.max}</td>
                <td style="color: ${r.passed ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: bold;">
                    ${r.passed ? 'Passed' : 'Failed'}
                </td>
                <td><button class="btn-delete" onclick="deleteReport(${r.id})">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.deleteReport = function(id) {
    if(confirm('Are you sure you want to delete this report?')) {
        let reports = JSON.parse(localStorage.getItem('jlpt_reports') || '[]');
        reports = reports.filter(r => r.id !== id);
        localStorage.setItem('jlpt_reports', JSON.stringify(reports));
        loadReports();
    }
};
