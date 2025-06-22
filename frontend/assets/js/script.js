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

        function showGames(grade) {
            document.getElementById("grade-selection").style.display = "none";
            document.getElementById("games-section").style.display = "block";
            document.getElementById("selected-grade").textContent = grade;

            const gamesList = gamesData[grade];
            const gamesContainer = document.getElementById("games-list");
            gamesContainer.innerHTML = "";

            gamesList.forEach(game => {
                const gameButton = document.createElement("button");
                gameButton.classList.add("game-button");

                const gameImage = document.createElement("img");
                gameImage.src = game.image;
                gameImage.alt = game.name;
                gameImage.style.width = "100px";

                const gameText = document.createElement("span");
                gameText.textContent = game.name;

                // Hap faqen përkatëse kur klikohet loja
                gameButton.addEventListener("click", () => {
                    let gameName = game.name
                        .toLowerCase()
                        .replace(/[ë]/g, 'e') // për ë → e
                        .replace(/[^a-z0-9]/g, ''); // heq hapësirat dhe karakteret e tjera

                    const gamePage = `${gameName}.html`;
                    window.location.href = gamePage;
                });

                gameButton.appendChild(gameImage);
                gameButton.appendChild(gameText);
                gamesContainer.appendChild(gameButton);
            });
        }

        function goBack() {
            document.getElementById("grade-selection").style.display = "block";
            document.getElementById("games-section").style.display = "none";
        }