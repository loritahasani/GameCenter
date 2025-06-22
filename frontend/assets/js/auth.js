// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : 'https://gjeniu-i-vogel-backend.onrender.com/api';

// Authentication functions
let token = localStorage.getItem("token");

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
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
            const scoresContainer = document.getElementById('scores-container');
            if (scoresContainer) {
                scoresContainer.style.display = 'block';
                loadScores();
            }
        } else {
            if (menu) menu.style.display = "block";
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
        const scoresContainer = document.getElementById('scores-container');
        if (scoresContainer) {
            scoresContainer.style.display = "none";
        }
    }

    // Test server connection
    fetch(`${API_BASE_URL}/test`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error("Server error:", data.error);
                if (loginMessage) {
                    loginMessage.innerText = "Server error: " + data.error;
                }
            }
        })
        .catch(err => {
            console.error("Server connection error:", err);
            if (loginMessage) {
                loginMessage.innerText = "Cannot connect to server. Please make sure the server is running.";
            }
        });
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

    console.log('Attempting login with email:', email);
    console.log('API_BASE_URL:', API_BASE_URL);

    try {
        console.log('Sending login request to:', `${API_BASE_URL}/login`);
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json();
            console.log('Error response data:', errorData);
            message.innerText = errorData.error || `Gabim në server (${response.status})!`;
            message.style.color = 'red';
            return;
        }

        const data = await response.json();
        console.log('Response data:', data);

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
    } catch (error) {
        console.error('Login error details:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            message.innerText = 'Nuk mund të lidhet me serverin. Kontrolloni lidhjen e internetit!';
        } else {
            message.innerText = 'Gabim në lidhje me serverin!';
        }
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
    const container = document.getElementById('class-buttons-container');
    if (!container) return;
    
    container.innerHTML = '';
    classData.forEach(classInfo => {
        const button = document.createElement('div');
        button.className = 'class-card';
        button.innerHTML = `
            <img src="${classInfo.image}" alt="${classInfo.label}">
            <h3>${classInfo.label}</h3>
        `;
        button.onclick = () => selectClass(classInfo.grade);
        container.appendChild(button);
    });
}

// Teacher panel functions
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
    
    // Load assignments when assignments tab is opened
    if (tabName === 'assignments-tab') {
        loadAssignments();
    }
    // Load student assignments when student assignments tab is opened
    if (tabName === 'student-assignments-tab') {
        loadStudentAssignments();
    }
}

function loadScores() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    fetch(`${API_BASE_URL}/get-scores`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        const listDiv = document.getElementById('students-list');
        const detailDiv = document.getElementById('student-detail');
        const modalBg = document.getElementById('student-detail-modal-bg');
        if (listDiv) listDiv.innerHTML = '';
        if (detailDiv) detailDiv.style.display = 'none';
        if (modalBg) modalBg.style.display = 'none';
        if (detailDiv) detailDiv.innerHTML = '';
        
        if (data.students && data.students.length > 0) {
            let table = '<table class="scores-table"><thead><tr><th>Emri</th><th>Email</th><th>Detaje</th></tr></thead><tbody>';
            data.students.forEach(student => {
                table += `<tr><td>${student.name}</td><td>${student.email || ''}</td><td><button class='btn btn-primary btn-small' onclick=\"showStudentDetail('${student._id}')\">Shiko</button></td></tr>`;
            });
            table += '</tbody></table>';
            if (listDiv) listDiv.innerHTML = table;
        } else {
            if (listDiv) listDiv.innerHTML = '<p>Nuk ka nxënës të regjistruar.</p>';
        }
    })
    .catch(err => {
        console.error('Error loading scores:', err);
        if (err.message === 'Failed to load scores') {
            localStorage.removeItem('token');
            window.location.reload();
        }
    });
}

function loadAssignments() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    fetch(`${API_BASE_URL}/assignments`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(assignments => {
        const assignmentsList = document.getElementById('assignments-list');
        if (!assignmentsList) return;
        
        if (assignments.length > 0) {
            let html = '<div style="display: grid; gap: 15px;">';
            assignments.forEach(assignment => {
                const date = new Date(assignment.created_at).toLocaleDateString('sq-AL');
                const deadline = assignment.deadline ? new Date(assignment.deadline).toLocaleString('sq-AL') : 'Nuk ka';
                html += `
                    <div class="assignment-item">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h4>${assignment.title}</h4>
                                <p>${assignment.description}</p>
                                <small>Krijuar më: ${date}</small><br>
                                <small>Afati: <strong>${deadline}</strong></small>
                            </div>
                            <div class="assignment-actions">
                                <button onclick="openEditAssignmentModal('${assignment._id}')" class="btn btn-warning btn-small">
                                    Ndrysho
                                </button>
                                <button onclick="viewSubmissions('${assignment._id}')" class="btn btn-info btn-small">
                                    Shiko Dorëzimet
                                </button>
                                <button onclick="deleteAssignment('${assignment._id}', '${assignment.title}')" class="btn btn-danger btn-small">
                                    Fshi
                                </button>
                            </div>
                        </div>
                        <div id="submissions-${assignment._id}" class="submissions-container" style="display:none; margin-top: 15px;"></div>
                    </div>
                `;
            });
            html += '</div>';
            assignmentsList.innerHTML = html;
        } else {
            assignmentsList.innerHTML = '<p>Nuk ka ende detyra të shtuara.</p>';
        }
    })
    .catch(err => {
        console.error('Error loading assignments:', err);
        const assignmentsList = document.getElementById('assignments-list');
        if (assignmentsList) {
            assignmentsList.innerHTML = '<p style="color: red;">Gabim në ngarkimin e detyrave.</p>';
        }
    });
}

// Initialize teacher panel when page loads
if (window.location.pathname.includes('teachers.html')) {
    window.onload = function() {
        const token = localStorage.getItem('token');
        if (token) {
            const loginContainer = document.getElementById('login-container');
            const teacherPanel = document.getElementById('teacher-panel-container');
            if (loginContainer) loginContainer.style.display = 'none';
            if (teacherPanel) teacherPanel.style.display = 'block';
            loadScores();
        }
    };
}