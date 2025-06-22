// API Configuration
const API_BASE_URL = 'https://gjeniu-i-vogel-backend.onrender.com/api';

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
        loginMessage.innerText = "Cannot connect to server. Please make sure the server is running.";
    });

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
                        for (const attempt of gameScores) {
                            if (attempt.score) {
                                displayScore += attempt.score;
                            }
                        }
                    } else if (typeof gameScores === 'number') {
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
                for (const gameScores of Object.values(data.scores)) {
                    if (Array.isArray(gameScores)) {
                        for (const attempt of gameScores) {
                            if (attempt.score) {
                                total += attempt.score;
                            }
                        }
                    } else if (typeof gameScores === 'number') {
                        total += gameScores;
                    }
                }
            }
            fillProfileModal(user, { total });
        });
    });
}

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

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    if (window.location.pathname.includes('/games/')) {
        window.location.href = "../index.html";
    } else {
        window.location.href = "index.html";
    }
}

function goBackToGames() {
    console.log('goBackToGames called');
    localStorage.setItem('forceShowGames', 'true');
    if (window.location.pathname.includes('/games/')) {
        console.log('In game file, redirecting to index.html');
        window.location.replace("../index.html?t=" + Date.now());
    } else {
        console.log('In main directory, reloading');
        window.location.reload(true);
    }
}

function register() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;
    const school = document.getElementById("reg-school").value;
    const registerMessage = document.getElementById("register-message");

    if (!name || !email || !password || !school || !role) {
        registerMessage.innerText = "Ju lutem plotësoni të gjitha fushat e kërkuara.";
        return;
    }

    const registrationData = { name, email, password, role, school };

    if (role === 'student') {
        const teacherId = document.getElementById("reg-teacher").value;
        if (!teacherId) {
            registerMessage.innerText = "Ju lutem zgjidhni një mësues.";
            return;
        }
        registrationData.teacher_id = teacherId;
    } else if (role === 'teacher') {
        const classLevel = document.getElementById("reg-teacher-class").value;
        if (!classLevel) {
            registerMessage.innerText = "Ju lutem zgjidhni një klasë.";
            return;
        }
        registrationData.class_level = classLevel;
    }

    registerMessage.innerText = "Duke u regjistruar...";

    fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(registrationData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            registerMessage.innerText = data.error;
        } else {
            alert(data.message);
            toggleForms();
        }
    })
    .catch(err => {
        console.error('Registration failed:', err);
        registerMessage.innerText = 'Regjistrimi dështoi. Ju lutem provoni përsëri.';
    });
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
