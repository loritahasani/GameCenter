document.addEventListener('DOMContentLoaded', function() {
const menu = document.getElementById('menu');
const quizContainer = document.getElementById('quiz-container');
let currentLevel = 1;
let currentQuestion = 0;
let score = 0;
let totalScore = 0;
let questions = [];

function generateQuestions(level) {
    const qs = [];
    for (let i = 0; i < 5; i++) {
        let a, b, isAddition, text, correct, wrong;
        if (level === 1) {
            a = Math.floor(Math.random() * 20) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            isAddition = Math.random() > 0.4;
        } else if (level === 2) {
            a = Math.floor(Math.random() * 10) + 2;
            b = Math.floor(Math.random() * 10) + 2;
            isAddition = Math.random() > 0.5;
        } else {
            a = Math.floor(Math.random() * 20) + 10;
            b = Math.floor(Math.random() * 10) + 1;
            isAddition = Math.random() > 0.5;
        }

        if (isAddition) {
            if (level === 2) { // Multiplication for level 2
                text = `Sa është ${a} × ${b}?`;
                correct = a * b;
                wrong = correct + (Math.random() > 0.5 ? 3 : -3);
            } else {
                text = `Sa është ${a} + ${b}?`;
                correct = a + b;
                wrong = correct + (Math.random() > 0.5 ? 2 : -2);
            }
        } else {
            const max = Math.max(a, b);
            const min = Math.min(a, b);
            text = `Sa është ${max} - ${min}?`;
            correct = max - min;
            wrong = correct + (Math.random() > 0.5 ? 1 : -1);
        }
        if (wrong === correct) wrong += 2;
        const options = shuffle([correct, wrong]);
        qs.push({ text, options, correct });
    }
    return qs;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz() {
    menu.style.display = 'none';
    quizContainer.style.display = 'block';
    currentLevel = 1;
    currentQuestion = 0;
    score = 0;
    totalScore = 0;
    questions = generateQuestions(currentLevel);
    showQuestion();
}

function showQuestion() {
    const q = questions[currentQuestion];
    document.getElementById('level-title').innerText = `Niveli ${currentLevel}`;
    document.getElementById('question-text').innerText = q.text;
    document.getElementById('option0').innerText = q.options[0];
    document.getElementById('option1').innerText = q.options[1];
    document.getElementById('score-info').innerText = `Pyetja ${currentQuestion + 1} nga ${questions.length}`;
    document.getElementById('feedback').innerText = '';
}

window.startQuiz = startQuiz;
window.selectAnswer = function(index) {
    const q = questions[currentQuestion];
    const selected = q.options[index];
    const feedbackElement = document.getElementById('feedback');
    if (selected === q.correct) {
        feedbackElement.innerText = 'Saktë!';
        feedbackElement.style.color = 'lightgreen';
        score += 3;
        totalScore += 3;
    } else {
        feedbackElement.innerText = 'Gabim!';
        feedbackElement.style.color = 'red';
    }
    currentQuestion++;
    setTimeout(() => {
        feedbackElement.innerText = '';
        if (currentQuestion < questions.length) {
            showQuestion();
        } else {
            if (currentLevel < 3) {
                feedbackElement.innerText = `Përfundove Nivelin ${currentLevel}. Vazhdojmë në Nivelin ${currentLevel + 1}`;
                feedbackElement.style.color = 'cyan';
                setTimeout(() => {
                    currentLevel++;
                    currentQuestion = 0;
                    score = 0;
                    feedbackElement.innerText = '';
                    questions = generateQuestions(currentLevel);
                    showQuestion();
                }, 2000);
            } else {
                feedbackElement.innerText = `Urime! I përfundove të gjitha nivelet! Pikët: ${totalScore}`;
                feedbackElement.style.color = 'gold';
                sendScoreToBackend('mathquiz2', totalScore);
                setTimeout(() => {
                    quizContainer.style.display = 'none';
                    menu.style.display = 'block';
                    loadUserScores && loadUserScores();
                }, 4000);
            }
        }
    }, 1200);
};

// Style the entire quiz-question section with a lighter blue background
const quizSection = document.querySelector('.quiz-question');
if (quizSection) {
    quizSection.style.background = '#3b6cb7';
    quizSection.style.borderRadius = '14px';
    quizSection.style.padding = '2rem 1.5rem';
    quizSection.style.margin = '2rem auto';
    quizSection.style.color = 'white';
    quizSection.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
}
}); 