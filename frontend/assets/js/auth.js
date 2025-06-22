// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : 'https://gjeniu-i-vogel-backend.onrender.com/api';

// Authentication functions
let token = localStorage.getItem("token");
const loginContainer = document.getElementById("login-container");
const menu = document.getElementById("menu");
const loginMessage = document.getElementById("login-message");

// Redirect në index.html nëse nuk ka token, përveç në index.html vetë
if (!localStorage.getItem('token') && !window.location.pathname.endsWith('index.html')) {
    window.location.href = 'index.html';
}

// Check if user is already logged in
if (token) {
    // User is logged in, keep login container hidden
    if (window.location.pathname.includes('teachers.html')) {
        document.getElementById('scores-container').style.display = 'block';
        loadScores();
    } else {
        menu.style.display = "block";
        loadUserScores();
        showProfileIconIfLoggedIn();
        if (typeof loadGames === 'function') {
            loadGames();
        }
    }
} else {
    // User is not logged in, show login form
    if (loginContainer) {
        loginContainer.style.display = "block";
    }
    if (menu) menu.style.display = "none";
    if (document.getElementById('scores-container')) {
        document.getElementById('scores-container').style.display = "none";
    }
}

// Test server connection
fetch(`${API_BASE_URL}/test`)
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Server error:", data.error);
            loginMessage.innerText = "Server error: " + data.error;
        }
    })
    .catch(err => {
        console.error("Server connection error:", err);
        if (loginMessage) {
            loginMessage.innerText = "Cannot connect to server. Please make sure the server is running.";
        }
    });

// Update all fetch calls to use API_BASE_URL
async function login() {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('login-message');

    if (!email || !password) {
        message.innerText = 'Ju lutem plotësoni të gjitha fushat!';
        message.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('name', data.name);
            
            if (data.role === 'teacher') {
                window.location.href = 'teachers.html';
            } else {
                document.body.classList.remove('auth-view');
                document.body.classList.add('games-view');
                loadUserProfile();
                loadGames();
            }
        } else {
            message.innerText = data.error || 'Gabim gjatë login-it!';
            message.style.color = 'red';
        }
    } catch (error) {
        message.innerText = 'Gabim në lidhje me serverin!';
        message.style.color = 'red';
    }
}

function loadUserScores() {
    if (!token) return;

    fetch(`${API_BASE_URL}/get-scores`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to load scores');
        }
        return res.json();
    })
    .then(data => {
        if (data.scores) {
            const scoresDiv = document.getElementById("my-scores");
            if (scoresDiv) {
                scoresDiv.innerHTML = "";
                
                for (const [game, gameScores] of Object.entries(data.scores)) {
                    const scoreElement = document.createElement("p");
                    let displayScore = 0;
                    
                    if (Array.isArray(gameScores)) {
                        // If it's an array of attempts, sum all scores
                        for (const attempt of gameScores) {
                            if (attempt.score) {
                                displayScore += attempt.score;
                            }
                        }
                    } else if (typeof gameScores === 'number') {
                        // If it's a single number (old format)
                        displayScore = gameScores;
                    }
                    
                    scoreElement.textContent = `${game}: ${displayScore} pikë`;
                    scoresDiv.appendChild(scoreElement);
                }
            }
        }
    })
    .catch(err => {
        console.error("Error loading scores:", err);
        if (err.message === 'Failed to load scores') {
            localStorage.removeItem("token");
            window.location.reload();
        }
    });
}

function sendScoreToBackend(game, points) {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("Tokeni mungon! Nuk mund të ruaj pikët.");
        return;
    }

    fetch(`${API_BASE_URL}/save-score`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ game, score: points })
    })
    .then(res => {
        if (res.status === 401) {
            alert("Sessioni skadoi. Ju lutem logohuni përsëri.");
            localStorage.removeItem("token");
            window.location.href = "../index.html";
            return;
        }
        if (!res.ok) {
            throw new Error('Failed to save score');
        }
        return res.json();
    })
    .then(data => {
        if (data) {
            console.log("Pikët u ruajtën me sukses:", data);
            loadUserScores();
        }
    })
    .catch(err => {
        console.error("Gabim gjatë ruajtjes së pikëve:", err);
        if (err.message === 'Failed to save score') {
            alert("Nuk u ruajtën pikët. Provo përsëri!");
        }
    });
}

// PROFILI: Shfaq/Fsheh ikonën dhe modalin e profilit
function showProfileIconIfLoggedIn() {
    const token = localStorage.getItem('token');
    const icon = document.getElementById('profile-icon');
    if (token && icon) {
        icon.style.display = 'block';
    } else if (icon) {
        icon.style.display = 'none';
    }
}

function fillProfileModal(user, scores) {
    document.getElementById('profile-username').innerText = user?.name || '';
    document.getElementById('profile-email').innerText = user?.email || '';
    document.getElementById('profile-score').innerText = scores?.total || 0;
}

// Merr të dhënat e përdoruesit nga backend-i
function fetchUserProfileAndScores() {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        fetch(`${API_BASE_URL}/get-scores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            let total = 0;
            if (data.scores) {
                // Handle new score structure where scores are arrays of attempts
                for (const gameScores of Object.values(data.scores)) {
                    if (Array.isArray(gameScores)) {
                        // If it's an array of attempts, sum all scores
                        for (const attempt of gameScores) {
                            if (attempt.score) {
                                total += attempt.score;
                            }
                        }
                    } else if (typeof gameScores === 'number') {
                        // If it's a single number (old format)
                        total += gameScores;
                    }
                }
            }
            fillProfileModal(user, { total });
        });
    });
}

// Event listeners për profilin
window.addEventListener('DOMContentLoaded', function() {
    showProfileIconIfLoggedIn();
    const icon = document.getElementById('profile-icon');
    const modal = document.getElementById('profile-modal');
    if (icon && modal) {
        icon.onclick = function(e) {
            fetchUserProfileAndScores();
            modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
            e.stopPropagation();
        };
        document.body.addEventListener('click', function(e) {
            if (modal.style.display === 'block' && !modal.contains(e.target) && e.target !== icon && !icon.contains(e.target)) {
                modal.style.display = 'none';
            }
        });
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('userClass');
    if (window.location.pathname.includes('/games/')) {
        window.location.href = "../index.html";
    } else {
        window.location.href = "index.html";
    }
}

// Go back to games list function
function goBackToGames() {
    console.log('goBackToGames called');
    
    // Set a simple flag in localStorage
    localStorage.setItem('forceShowGames', 'true');
    
    // Check if we're in a game file (in games/ directory)
    if (window.location.pathname.includes('/games/')) {
        console.log('In game file, redirecting to index.html');
        // If we're in a game file, go back to index.html with timestamp to prevent caching
        window.location.replace("../index.html?t=" + Date.now());
    } else {
        console.log('In main directory, reloading');
        // If we're in the main directory, just reload to show games
        window.location.reload(true); // Force reload from server
    }
}

async function register() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;
    const school = document.getElementById("reg-school").value;
    const teacherId = document.getElementById("reg-teacher").value;
    const teacherClass = document.getElementById("reg-teacher-class").value;
    const message = document.getElementById("register-message");

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role, school, teacher_id: teacherId, teacher_class: teacherClass })
        });
        const data = await response.json();
        if (response.ok) {
            message.innerText = data.message;
            message.style.color = "green";
            document.getElementById("verify-email").value = email;
            document.getElementById("register-container").style.display = "none";
            document.getElementById("verify-container").style.display = "block";
        } else {
            message.innerText = data.error || "Regjistrimi dështoi.";
            message.style.color = "red";
        }
    } catch (error) {
        message.innerText = "Gabim në lidhje me serverin.";
        message.style.color = "red";
    }
}

function toggleForms() {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        registerContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    }
}

function populateClassButtons() {
    // Implementation of populateClassButtons function
} 