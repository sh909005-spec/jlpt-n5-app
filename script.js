document.addEventListener('DOMContentLoaded', () => {
    // Initialize fixed questions for listening
    const fixedGrids = document.querySelectorAll('.questions-grid[data-fixed]');
    fixedGrids.forEach(grid => {
        const numQuestions = parseInt(grid.getAttribute('data-fixed'), 10);
        for (let i = 0; i < numQuestions; i++) {
            grid.appendChild(createQuestionElement(grid.children.length + 1));
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
            
            // Generate Image
            generateImage();
    });
});

function createQuestionElement(index, defaultType = 'circle') {
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
    circleDiv.innerHTML = `
        <label class="omr-btn"><input type="radio" name="${qName}" value="1"><span>1</span></label>
        <label class="omr-btn"><input type="radio" name="${qName}" value="2"><span>2</span></label>
        <label class="omr-btn"><input type="radio" name="${qName}" value="3"><span>3</span></label>
        <label class="omr-btn"><input type="radio" name="${qName}" value="4"><span>4</span></label>
    `;
    
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
    
    // Inherit the type from the last question in the grid
    if (grid.children.length > 0) {
        const lastSelect = grid.lastElementChild.querySelector('.q-type-select');
        if (lastSelect) {
            defaultType = lastSelect.value;
        }
    }
    
    grid.appendChild(createQuestionElement(newIndex, defaultType));
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
