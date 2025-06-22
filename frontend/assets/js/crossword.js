document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('menu').style.display = 'block';
        if (typeof fetchUserProfileAndScores === 'function') {
            fetchUserProfileAndScores();
        }
    }
});

const crosswordData = {
    gridSize: 7,
    clues: [
        { number: 1, direction: 'across', row: 1, col: 2, clue: "Mjet transporti hekurudhor (4)", answer: "TREN" },
        { number: 2, direction: 'across', row: 3, col: 2, clue: "Ndjenja per te pire uje (4)", answer: "ETJE" },
        { number: 3, direction: 'across', row: 4, col: 0, clue: "Kryeqyteti i Shqipërisë (6)", answer: "TIRANA" },
        { number: 4, direction: 'down',   row: 0, col: 3, clue: "Burim ndriçimi (5)", answer: "DRITA" },
    ]
};

let activeClue = null;
let currentDirection = 'across';

function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('crossword-section').style.display = 'block';
    renderCrossword();
}

function renderCrossword() {
    const grid = document.getElementById('grid');
    const acrossCluesContainer = document.getElementById('across-clues');
    const downCluesContainer = document.getElementById('down-clues');

    grid.innerHTML = '';
    acrossCluesContainer.innerHTML = '<h3>Horizontalisht</h3>';
    downCluesContainer.innerHTML = '<h3>Vertikalisht</h3>';
    grid.style.gridTemplateColumns = `repeat(${crosswordData.gridSize}, 40px)`;

    const gridMap = Array(crosswordData.gridSize).fill(null).map(() => Array(crosswordData.gridSize).fill(null));

    crosswordData.clues.forEach(clue => {
        const { direction, row, col, answer, number } = clue;
        if (direction === 'across') {
            for (let i = 0; i < answer.length; i++) {
                if(gridMap[row] && gridMap[row][col + i] !== undefined) {
                    gridMap[row][col + i] = { clueNumber: number, direction: 'across' };
                }
            }
        } else {
            for (let i = 0; i < answer.length; i++) {
                 if(gridMap[row + i] && gridMap[row + i][col] !== undefined) {
                    gridMap[row + i][col] = { clueNumber: number, direction: 'down' };
                }
            }
        }
    });

    for (let r = 0; r < crosswordData.gridSize; r++) {
        for (let c = 0; c < crosswordData.gridSize; c++) {
            const cellData = gridMap[r][c];
            const cell = document.createElement('div');
            if (cellData) {
                cell.className = 'crossword-cell-new';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const input = document.createElement('input');
                input.maxLength = 1;
                input.id = `cell-${r}-${c}`;
                
                const clueForInput = crosswordData.clues.find(clue => 
                    (clue.direction === 'across' && clue.row === r && c >= clue.col && c < clue.col + clue.answer.length) ||
                    (clue.direction === 'down' && clue.col === c && r >= clue.row && r < clue.row + clue.answer.length)
                );
                if(clueForInput) input.dataset.clue = clueForInput.number;


                cell.appendChild(input);

                const clueForCellNumber = crosswordData.clues.find(clue => clue.row === r && clue.col === c);
                if (clueForCellNumber) {
                    const numberSpan = document.createElement('span');
                    numberSpan.className = 'cell-number-new';
                    numberSpan.textContent = clueForCellNumber.number;
                    cell.appendChild(numberSpan);
                }
                
                input.addEventListener('focus', () => handleCellFocus(r, c));
                input.addEventListener('input', () => handleInput(r, c));
                input.addEventListener('keydown', (e) => handleKeyDown(e, r, c));

            } else {
                cell.className = 'black-cell-new';
            }
            grid.appendChild(cell);
        }
    }
    
    crosswordData.clues.forEach(clue => {
        const clueElement = document.createElement('div');
        clueElement.className = 'clue-new';
        clueElement.textContent = `${clue.number}. ${clue.clue}`;
        clueElement.dataset.clueNumber = clue.number;
        clueElement.dataset.clueDirection = clue.direction;
        clueElement.addEventListener('click', () => handleClueClick(clue.number, clue.direction));

        if (clue.direction === 'across') {
            acrossCluesContainer.appendChild(clueElement);
        } else {
            downCluesContainer.appendChild(clueElement);
        }
    });

    document.getElementById('result').textContent = '';
    document.getElementById('restart-button').style.display = 'none';
    document.getElementById('check-button').disabled = false;
}

function handleCellFocus(row, col) {
    const input = document.getElementById(`cell-${row}-${col}`);
    if(!input || !input.dataset.clue) return;

    const clueNumber = input.dataset.clue;
    const acrossClue = crosswordData.clues.find(c => c.direction === 'across' && c.number == clueNumber);
    const downClue = crosswordData.clues.find(c => c.direction === 'down' && c.number == clueNumber);
    
    if (acrossClue && downClue) {
        if (activeClue && activeClue.number == clueNumber) {
             currentDirection = (currentDirection === 'across') ? 'down' : 'across';
        } 
    } else if (acrossClue) {
        currentDirection = 'across';
    } else if (downClue) {
        currentDirection = 'down';
    }
    
    highlightWord(row, col, true);
}

function handleClueClick(clueNumber, direction) {
    const clue = crosswordData.clues.find(c => c.number === clueNumber && c.direction === direction);
    if (clue) {
        currentDirection = direction;
        const input = document.getElementById(`cell-${clue.row}-${clue.col}`);
        if (input) {
            input.focus();
        }
    }
}

function handleInput(row, col) {
    const input = document.getElementById(`cell-${row}-${col}`);
    if (input.value.length === 1) {
        let nextRow = row;
        let nextCol = col;
        if (currentDirection === 'across') {
            nextCol++;
        } else {
            nextRow++;
        }
        const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
        if (nextInput && !nextInput.disabled) {
            nextInput.focus();
        }
    }
}

function handleKeyDown(e, r, c) {
    let newRow = r;
    let newCol = c;
    
    if (e.key === 'ArrowRight') newCol++;
    else if (e.key === 'ArrowLeft') newCol--;
    else if (e.key === 'ArrowDown') newRow++;
    else if (e.key === 'ArrowUp') newRow--;
    else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        switchDirection(r,c);
        return;
    } else {
        return; 
    }

    const nextInput = document.getElementById(`cell-${newRow}-${newCol}`);
    if (nextInput) {
        e.preventDefault();
        nextInput.focus();
    }
}

function switchDirection(row, col) {
    const acrossClue = crosswordData.clues.find(c => c.direction === 'across' && row === c.row && col >= c.col && col < c.col + c.answer.length);
    const downClue = crosswordData.clues.find(c => c.direction === 'down' && col === c.col && row >= c.row && row < c.row + c.answer.length);

    if (acrossClue && downClue) {
        currentDirection = (currentDirection === 'across') ? 'down' : 'across';
        highlightWord(row, col, true);
    }
}

function highlightWord(row, col, focus) {
    document.querySelectorAll('.crossword-cell-new.highlight').forEach(cell => cell.classList.remove('highlight'));
    document.querySelectorAll('.clue-new.highlight-clue').forEach(clue => clue.classList.remove('highlight-clue'));

    let clueToHighlight;

    if (currentDirection === 'across') {
        clueToHighlight = crosswordData.clues.find(c => c.direction === 'across' && c.row === row && col >= c.col && col < c.col + c.answer.length);
    } else { // 'down'
        clueToHighlight = crosswordData.clues.find(c => c.direction === 'down' && c.col === col && row >= c.row && row < c.row + c.answer.length);
    }

    if (!clueToHighlight) {
         clueToHighlight = crosswordData.clues.find(c => (c.direction === 'across' && c.row === row && col >= c.col && col < c.col + c.answer.length) || (c.direction === 'down' && c.col === col && row >= c.row && row < c.row + c.answer.length));
         if(clueToHighlight) currentDirection = clueToHighlight.direction;
    }

    if (clueToHighlight) {
        activeClue = clueToHighlight;
        const { answer, direction, row: startRow, col: startCol, number } = clueToHighlight;
        for (let i = 0; i < answer.length; i++) {
            const r = direction === 'across' ? startRow : startRow + i;
            const c = direction === 'across' ? startCol + i : startCol;
            const cellElement = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
            if (cellElement) cellElement.classList.add('highlight');
        }
        const clueElement = document.querySelector(`.clue-new[data-clue-number='${number}'][data-clue-direction='${direction}']`);
        if(clueElement) clueElement.classList.add('highlight-clue');
    }
    if (focus) {
        document.getElementById(`cell-${row}-${col}`).focus();
    }
}

function checkAnswers() {
    let allCorrect = true;
    let score = 0;
    
    crosswordData.clues.forEach(clue => {
        let isCorrect = true;
        const { answer, direction, row, col } = clue;
        for (let i = 0; i < answer.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            const input = document.getElementById(`cell-${r}-${c}`);
            if (input.value.toUpperCase() !== answer[i]) {
                isCorrect = false;
            }
        }

        for (let i = 0; i < answer.length; i++) {
             const r = direction === 'across' ? row : row + i;
             const c = direction === 'across' ? col + i : col;
             const input = document.getElementById(`cell-${r}-${c}`);
             if(input.disabled) continue;
             if (isCorrect) {
                input.style.color = 'green';
             } else {
                input.style.color = 'red';
                allCorrect = false;
             }
        }
        if(isCorrect) score += 5;
    });

    const result = document.getElementById('result');
    if (allCorrect) {
        result.textContent = "Urime! I zgjidhe të gjitha fjalët saktë.";
        result.style.color = "green";
        document.getElementById('restart-button').style.display = 'inline-block';
        document.getElementById('check-button').disabled = true;
        if (typeof sendScoreToBackend === 'function') {
            sendScoreToBackend('crossword', score);
        }
    } else {
        result.textContent = "Disa përgjigje janë gabim. Provo përsëri!";
        result.style.color = "red";
    }
}

function revealWord() {
    if (!activeClue) return;
    const { answer, direction, row, col } = activeClue;
    for (let i = 0; i < answer.length; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        const input = document.getElementById(`cell-${r}-${c}`);
        input.value = answer[i];
        input.style.color = '#3e68ff';
        input.disabled = true;
    }
    checkAnswers();
}

function revealAll() {
    crosswordData.clues.forEach(clue => {
        const { answer, direction, row, col } = clue;
        for (let i = 0; i < answer.length; i++) {
            const r = direction === 'across' ? row : row + i;
            const c = direction === 'across' ? col + i : col;
            const input = document.getElementById(`cell-${r}-${c}`);
            input.value = answer[i];
            input.style.color = '#3e68ff';
            input.disabled = true;
        }
    });
    document.getElementById('check-button').disabled = true;
    document.getElementById('result').textContent = "Të gjitha fjalët u zbuluan.";
    document.getElementById('result').style.color = "#3e68ff";
}
