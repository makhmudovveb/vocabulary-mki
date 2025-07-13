import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm";

// Элементы DOM
const authModal = document.getElementById("authModal");
const quizPercentage = 75;
const quizCountDisplay = document.getElementById("quizCountDisplay");
const wordListBody = document.querySelector("#wordList tbody");
const loginInput = document.getElementById("login");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");
const sidebar = document.querySelector(".sidebar");
const greeting = document.getElementById("username");
const logoutBtn = document.getElementById("logoutBtn");
const userBlock = document.getElementById("userBlock");
const adminPanel = document.getElementById("adminPanel");
const adminStats = document.getElementById("adminStats");
const quizStats = document.getElementById("quizStats");
const clearStatsBtn = document.getElementById("clearStatsBtn");
const mainContent = document.querySelector(".main-content");
const levelSelect = document.getElementById("levelSelect");
const unitSelect = document.getElementById("unitSelect");
const startQuizBtn = document.getElementById("startQuiz");
const quizModal = document.getElementById("quizModal");
const quizTitle = document.getElementById("quizTitle");
const quizQuestion = document.getElementById("quizQuestion");
const userAnswer = document.getElementById("userAnswer");
const submitAnswerBtn = document.getElementById("submitAnswer");
const feedback = document.getElementById("feedback");
const timerDisplay = document.getElementById("timer");
const resultModal = document.getElementById("resultModal");
const resultCorrect = document.getElementById("resultCorrect");
const resultWrong = document.getElementById("resultWrong");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const overlay = document.getElementById("overlay");

let currentUser = null;
let quizData = [];
let currentQuestionIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let timer = null;
let timeLeft = 20;

function getUsers() {
  return JSON.parse(localStorage.getItem("quiz_users") || "{}");
}
function saveUsers(users) {
  localStorage.setItem("quiz_users", JSON.stringify(users));
}
function saveCurrentUser(login) {
  localStorage.setItem("quiz_current", login);
}
function getCurrentUser() {
  const login = localStorage.getItem("quiz_current");
  const users = getUsers();
  return users[login] ? { login, ...users[login] } : null;
}
function saveUserStats(login, stats) {
  const allStats = JSON.parse(localStorage.getItem("quiz_stats") || "{}");
  if (!allStats[login]) allStats[login] = [];
  allStats[login].push(stats);
  localStorage.setItem("quiz_stats", JSON.stringify(allStats));
}
function getUserStats(login) {
  const allStats = JSON.parse(localStorage.getItem("quiz_stats") || "{}");
  return allStats[login] || [];
}
const ADMIN_CREDENTIALS = {
  login: "mkiadmin",
  password: "secure123"
};

loginBtn.addEventListener("click", () => {
  const login = loginInput.value.trim().toLowerCase();
  const pass = passwordInput.value.trim();
  if (!login || !pass) return alert("Введите логин и пароль");
  const users = getUsers();
  if (login === ADMIN_CREDENTIALS.login) {
    if (pass !== ADMIN_CREDENTIALS.password) {
      return alert("Wrong password of administration");
    }
    users[login] = { pass, role: "admin" };
    saveUsers(users);
  } else {
    if (!users[login]) {
      users[login] = { pass, role: "user" };
      saveUsers(users);
    }
    if (users[login].pass !== pass) {
      return alert("Wrong password");
    }
  }
  currentUser = { login, ...users[login] };
  saveCurrentUser(login);
  loginInput.value = "";
  passwordInput.value = "";
  authModal.classList.add("hidden");
  showUserInterface();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("quiz_current");
  currentUser = null;
  userBlock.classList.add("hidden");
  adminPanel.classList.add("hidden");
  mainContent.classList.add("hidden");
  authModal.classList.remove("hidden");
});

togglePassword.addEventListener("change", () => {
  passwordInput.type = togglePassword.checked ? "text" : "password";
});

clearStatsBtn.addEventListener("click", () => {
  if (confirm("Do you really want to clear all the stats?")) {
    localStorage.removeItem("quiz_stats");
    renderAdminStats();
  }
});

function showUserInterface() {
  greeting.textContent = currentUser.login;
  userBlock.classList.remove("hidden");
  mainContent.classList.remove("hidden");
  if (currentUser.role === "admin") {
    adminPanel.classList.remove("hidden");
    renderAdminStats();
  } else {
    adminPanel.classList.add("hidden");
    renderUserStats();
  }
}

function renderUserStats() {
  quizStats.innerHTML = "";
  const stats = getUserStats(currentUser.login);
  if (stats.length === 0) {
    quizStats.innerHTML = "<li>There is no data on quizzes</li>";
    return;
  }
  stats.forEach((stat, idx) => {
    const li = document.createElement("li");
    li.textContent = `Quiz #${idx + 1}: ✅ ${stat.correct}, ❌ ${stat.wrong}`;
    quizStats.appendChild(li);
  });
}

function renderAdminStats() {
  adminStats.innerHTML = "";
  const allStats = JSON.parse(localStorage.getItem("quiz_stats") || "{}");
  if (Object.keys(allStats).length === 0) {
    adminStats.textContent = "There are no user statistics";
    return;
  }
  for (const [user, stats] of Object.entries(allStats)) {
    const div = document.createElement("div");
    div.innerHTML = `<h4>${user}</h4><ul>${stats.map((s, i) => `<li>Quiz ${i + 1}: ✅ ${s.correct}, ❌ ${s.wrong}, Level: ${s.level}, Unit: ${s.unit}</li>`).join("")}</ul>`;
    adminStats.appendChild(div);
  }
}

function deleteUserAccount(login) {
  const users = getUsers();
  if (users[login]?.role === "admin") {
    alert("You can't delete your admin account!");
    return;
  }
  if (users[login]) {
    delete users[login];
    saveUsers(users);
  }
  const stats = JSON.parse(localStorage.getItem("quiz_stats") || "{}");
  if (stats[login]) {
    delete stats[login];
    localStorage.setItem("quiz_stats", JSON.stringify(stats));
  }
  if (currentUser && currentUser.login === login) {
    logoutBtn.click();
  } else {
    renderAdminStats();
  }
}

function loadWords() {
  const level = levelSelect.value;
  const unit = unitSelect.value;
  if (!level || !unit) {
    startQuizBtn.disabled = true;
    wordListBody.innerHTML = "<tr><td colspan='2'>Select a level and unit</td></tr>";
    return;
  }
  const path = `./data/${level}/unit${unit}.json`;
  axios.get(path)
  .then(res => {
    const allWords = res.data.map(w => ({ word: w.en, translation: w.ru, unit: w.unit }));
    const count = Math.floor(allWords.length * quizPercentage / 100);
    function getRandomSubset(arr, n) {
      const shuffled = arr.slice().sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    }
    quizData = getRandomSubset(allWords, count);
    if (quizCountDisplay) {
      quizCountDisplay.textContent = `The quiz will have: ${quizData.length} words`;
    }
    startQuizBtn.disabled = quizData.length === 0;
    wordListBody.innerHTML = quizData.length > 0
      ? quizData.map(word => `<tr><td>${word.translation}</td><td>${word.word}</td></tr>`).join("")
      : "<tr><td colspan='2'>There are no words in this unit</td></tr>";
  })
  .catch(err => {
    console.error("Error loading words:", err);
    wordListBody.innerHTML = "<tr><td colspan='2'>Error loading words</td></tr>";
    startQuizBtn.disabled = true;
  });
}

levelSelect.addEventListener("change", () => {
  unitSelect.value = "";
  startQuizBtn.disabled = true;
  wordListBody.innerHTML = "<tr><td colspan='2'>Select unit</td></tr>";
});

unitSelect.addEventListener("change", () => {
  if (levelSelect.value && unitSelect.value) {
    loadWords();
  } else {
    wordListBody.innerHTML = "<tr><td colspan='2'>Select level and unit</td></tr>";
    startQuizBtn.disabled = true;
  } 
});

startQuizBtn.addEventListener("click", () => {
  if (!quizData || quizData.length === 0) return alert("There are no words for a quiz");
  quizData = quizData.sort(() => Math.random() - 0.5);
  currentQuestionIndex = 0;
  correctCount = 0;
  wrongCount = 0;
  startQuizBtn.disabled = true;
  levelSelect.disabled = true;
  unitSelect.disabled = true;
  userAnswer.value = "";
  feedback.textContent = "";
  openQuizModal();
  showQuestion();
  startTimer();
});

function openQuizModal() {
  quizModal.classList.remove("hidden");
  userAnswer.focus();
  mainContent.classList.add("blur-background");
  sidebar.classList.add("blur-background");
}

function closeQuizModal() {
  quizModal.classList.add("hidden");
  startQuizBtn.disabled = false;
  levelSelect.disabled = false;
  unitSelect.disabled = false;
  mainContent.classList.remove("blur-background");
  sidebar.classList.remove("blur-background");
}

function showQuestion() {
  const q = quizData[currentQuestionIndex];
  quizTitle.textContent = `Question ${currentQuestionIndex + 1} из ${quizData.length}`;
  quizQuestion.innerHTML = `Translate the word: <strong>${q.translation}</strong>`;
  userAnswer.value = "";
  feedback.textContent = "";
  userAnswer.focus();
  timeLeft = 20;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  timerDisplay.textContent = `00:${timeLeft.toString().padStart(2, "0")}`;
}

function startTimer() {
  clearInterval(timer);
  timeLeft = 20;
  updateTimerDisplay();
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timer);
      handleAnswer("");
    }
  }, 1000);
}

submitAnswerBtn.addEventListener("click", () => {
  handleAnswer(userAnswer.value.trim());
});

userAnswer.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitAnswerBtn.click();
  }
});

function handleAnswer(answer) {
  clearInterval(timer);
  const correctAnswer = quizData[currentQuestionIndex].word.toLowerCase();
  if (answer.toLowerCase() === correctAnswer) {
    correctCount++;
    feedback.textContent = "Correct!";
    feedback.className = "correct";
  } else {
    wrongCount++;
    feedback.textContent = `Wrong! Correct: ${correctAnswer}`;
    feedback.className = "wrong";
  }
  currentQuestionIndex++;
  if (currentQuestionIndex < quizData.length) {
    setTimeout(() => {
      showQuestion();
      startTimer();
    }, 1500);
  } else {
    setTimeout(() => {
      endQuiz();
    }, 1500);
  }
}

function endQuiz() {
  closeQuizModal();
  resultCorrect.textContent = correctCount;
  resultWrong.textContent = wrongCount;
  resultModal.classList.remove("hidden");
  saveUserStats(currentUser.login, {
    correct: correctCount,
    wrong: wrongCount,
    level: levelSelect.value,
    unit: unitSelect.value,
    date: new Date().toISOString(),
  });
  currentUser.role === "admin" ? renderAdminStats() : renderUserStats();
  startQuizBtn.disabled = false;
  levelSelect.disabled = false;
  unitSelect.disabled = false;
}

resultModal.querySelector("button").addEventListener("click", () => {
  resultModal.classList.add("hidden");
});

window.addEventListener("load", () => {
  currentUser = getCurrentUser();
  if (currentUser) {
    showUserInterface();
  } else {
    authModal.classList.remove("hidden");
    mainContent.classList.add("hidden");
    userBlock.classList.add("hidden");
    adminPanel.classList.add("hidden");
  }
});



// ✅ Показ/скрытие гамбургера с классом .hidden-hamburger

function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("active");
  hamburgerBtn.classList.add("hidden-hamburger");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
  hamburgerBtn.classList.remove("hidden-hamburger");
}

// При клике на гамбургер
hamburgerBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // Чтобы окно не закрылось мгновенно
  openSidebar();
});

// При клике на overlay
overlay.addEventListener("click", () => {
  closeSidebar();
});

// При клике вне сайдбара (на окне)
window.addEventListener("click", (e) => {
  if (
    window.innerWidth <= 768 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(e.target) &&
    !hamburgerBtn.contains(e.target)
  ) {
    closeSidebar();
  }
});