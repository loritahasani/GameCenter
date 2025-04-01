
const gamesData = {
    1: [
        { name: "Word Search" , image:"word.png"},
        { name: "Memory Game", image:"memory.jpg" },
        { name: "Math Quiz", image:"math.jpg" }
    ],
    2: [
        { name: "Word Search", image: "word.png" },
        { name: "Memory Game", image: "memory.jpg" },
        { name: "Math Quiz", image: "math.jpg" }
    ],
    3: [
        { name: "Crossword", image: "crossword.jpg" },
        { name: "Memory Game", image: "memory.jpg" },
        { name: "Math Quiz", image: "math.jpg" }
    ],
    4: [
        { name: "Math Quiz", image: "math.jpg" },
        { name: "Memory Game", image: "memory.jpg" },
        { name: "Crossword", image: "crossword.jpg" }
    ],
    5: [
        { name: "Përemri", image: "peremri.jpg" },
        { name: "Math Quiz", image: "math.jpg" },
        { name: "Memory Game", image: "memory.jpg" }
    ]
};

// Function to display games for selected grade
function showGames(grade) {
    console.log("showGames function called for grade:", grade); // Debugging

    // Hide grade selection, show games section
    document.getElementById("grade-selection").style.display = "none";
    document.getElementById("games-section").style.display = "block";

    // Update the grade title
    document.getElementById("selected-grade").textContent = grade;

    // Get the games list
    const gamesList = gamesData[grade];
    const gamesContainer = document.getElementById("games-list");

    // Check if games list is found
    if (!gamesList) {
        console.error("No games found for grade:", grade);
        return;
    }

    // Clear previous games
    gamesContainer.innerHTML = "";

    // Dynamically create buttons for each game
    gamesList.forEach(game => {
        console.log("Adding game:", game.name); // Debugging

        const gameButton = document.createElement("button");
        gameButton.classList.add("game-button");

        // Create image
        const gameImage = document.createElement("img");
        gameImage.src = game.image;
        gameImage.alt = game.name;
        gameImage.style.width = "100px"; // Ensure image is visible

        // Create text
        const gameText = document.createElement("span");
        gameText.textContent = game.name;

        // Append elements
        gameButton.appendChild(gameImage);
        gameButton.appendChild(gameText);

        // Add the button to the container
        gamesContainer.appendChild(gameButton);
    });
}

// Function to go back
function goBack() {
    document.getElementById("grade-selection").style.display = "block";
    document.getElementById("games-section").style.display = "none";
}
