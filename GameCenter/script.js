// Array of games with images for each grade
document.getElementById("show-signup").addEventListener("click", function() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("signup-section").style.display = "block";
});

document.getElementById("show-login").addEventListener("click", function() {
    document.getElementById("signup-section").style.display = "none";
    document.getElementById("login-section").style.display = "block";
}); 
const gamesData = {
    1: [
        { name: "Crossword", image: "crossword.jpg" },
        { name: "Memory Game", image: "memory-game.png" },
        { name: "Math Quiz", image: "math-quiz.png" }
    ],
    2: [
        { name: "Word Search", image: "word-search.png" },
        { name: "Puzzle Game", image: "puzzle-game.png" },
        { name: "Math Quiz", image: "math-quiz.png" }
    ],
    3: [
        { name: "Crossword", image: "crossword.png" },
        { name: "Memory Game", image: "memory-game.png" },
        { name: "Math Challenge", image: "math-challenge.png" }
    ],
    4: [
        { name: "Math Quiz", image: "math-quiz.png" },
        { name: "Puzzle Game", image: "puzzle-game.png" },
        { name: "Trivia", image: "trivia.png" }
    ],
    5: [
        { name: "Crossword", image: "crossword.png" },
        { name: "Math Quiz", image: "math-quiz.png" },
        { name: "Memory Challenge", image: "memory-challenge.png" }
    ]
};

// Function to display games for selected grade
function showGames(grade) {
    // Hide the grade selection and show the game section
    document.getElementById("grade-selection").style.display = "none";
    document.getElementById("games-section").style.display = "block";
    
    // Update the grade displayed on the page
    document.getElementById("selected-grade").textContent = grade;

    // Get the list of games for the selected grade
    const gamesList = gamesData[grade];
    const gamesContainer = document.getElementById("games-list");
    gamesContainer.innerHTML = ""; // Clear previous games list

    // Dynamically create the game buttons with images
    gamesList.forEach(game => {
        const gameButton = document.createElement("button");
        gameButton.classList.add("game-button");

        // Create image for the game
        const gameImage = document.createElement("img");
        gameImage.src = game.image;
        gameImage.alt = game.name;

        // Create the game name text
        const gameText = document.createElement("span");
        gameText.textContent = game.name;

        // Append image and text to the button
        gameButton.appendChild(gameImage);
        gameButton.appendChild(gameText);

        // Add the button to the container
        gamesContainer.appendChild(gameButton);
    });
}

// Function to go back to the grade selection
function goBack() {
    document.getElementById("grade-selection").style.display = "block";
    document.getElementById("games-section").style.display = "none";
}
