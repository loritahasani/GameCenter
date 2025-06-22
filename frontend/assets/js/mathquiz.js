document.addEventListener('DOMContentLoaded', function() {
    const menu = document.getElementById('menu');
    const quizContainer = document.getElementById('quiz-container');

    let currentLevel = 1;
    let currentQuestion = 0;
    let score = 0;
    let totalScore = 0;

    const levels = {
        1: generateQuestions(),
        2: generateQuestions(),
        3: generateQuestions()
    };

    function generateQuestions() {
        const questions = [];
        for (let i = 0; i < 5; i++) {
            let a = Math.floor(Math.random() * 10) + 1;
            let b = Math.floor(Math.random() * 10) + 1;
            let isAddition = Math.random() > 0.5;

            let questionText = isAddition
                ? `Sa është ${a} + ${b}?`
                : `Sa është ${a + b} - ${b}?`;
            let correctAnswer = isAddition ? a + b : a;

            let wrongAnswer = correctAnswer + (Math.random() > 0.5 ? 1 : -1);
            if (wrongAnswer === correctAnswer) wrongAnswer += 2;

            let options = shuffle([correctAnswer, wrongAnswer]);

            questions.push({
                text: questionText,
                correct: correctAnswer,
                options: options
            });
        }
        return questions;
    }

    function startQuiz() {
        menu.style.display = "none";
        quizContainer.style.display = "block";
        currentLevel = 1;
        currentQuestion = 0;
        score = 0;
        totalScore = 0;
        showQuestion();
    }

    function showQuestion() {
        const levelQuestions = levels[currentLevel];
        const question = levelQuestions[currentQuestion];

        document.getElementById("level-title").innerText = `Niveli ${currentLevel}`;
        document.getElementById("question-text").innerText = question.text;
        document.getElementById("option0").innerText = question.options[0];
        document.getElementById("option1").innerText = question.options[1];
        document.getElementById("score-info").innerText = `Pyetja ${currentQuestion + 1} nga 5`;
    }

    function selectAnswer(index) {
        const question = levels[currentLevel][currentQuestion];
        const selected = question.options[index];
        const feedbackElement = document.getElementById("feedback");

        if (selected === question.correct) {
            feedbackElement.innerText = "Saktë!";
            feedbackElement.style.color = "lightgreen";
            score++;
            totalScore++;
        } else {
            feedbackElement.innerText = "Gabim!";
            feedbackElement.style.color = "red";
        }

        currentQuestion++;

        setTimeout(() => {
            feedbackElement.innerText = "";

            if (currentQuestion < 5) {
                showQuestion();
            } else {
                if (currentLevel < 3) {
                    feedbackElement.innerText = `Përfundove Nivelin ${currentLevel}. Vazhdojmë në Nivelin ${currentLevel + 1}`;
                    feedbackElement.style.color = "cyan";

                    setTimeout(() => {
                        currentLevel++;
                        currentQuestion = 0;
                        score = 0;
                        feedbackElement.innerText = "";
                        showQuestion();
                    }, 2000);
                } else {
                    feedbackElement.innerText = `Urime! I përfundove të gjitha nivelet! Piket: ${totalScore}`;
                    feedbackElement.style.color = "gold";

                    sendScoreToBackend("mathquiz", totalScore);

                    setTimeout(() => {
                        resetGame();
                    }, 4000);
                }
            }
        }, 1500);
    }

    function resetGame() {
        quizContainer.style.display = "none";
        menu.style.display = "block";
        levels[1] = generateQuestions();
        levels[2] = generateQuestions();
        levels[3] = generateQuestions();
        currentLevel = 1;
        currentQuestion = 0;
        score = 0;
        totalScore = 0;
        loadUserScores();
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function sendScoreToBackend(game, points) {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("Tokeni mungon! Nuk mund të ruaj pikët.");
            return;
        }

        fetch("http://localhost:5000/api/save-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ game: game, score: points })
        })
        .then(res => {
            if (res.status === 401) {
                alert("Sessioni skadoi. Ju lutem logohuni përsëri.");
                return;
            }
            return res.json();
        })
        .then(data => {
            if (data) {
                console.log("Pikët u ruajtën me sukses:", data);
            }
        })
        .catch(err => console.error("Gabim gjatë ruajtjes së pikëve:", err));
    }
}); 