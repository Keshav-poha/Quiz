let questions = [];
let current = 0;
let score = 0;
let timer = null;
let timeLeft = 90;
let userAnswers = [];
let userName = '';

const startBtn = document.getElementById('start-btn');
const quizDiv = document.getElementById('quiz');
const resultDiv = document.getElementById('result');
const questionImg = document.getElementById('question-img');
const timerDiv = document.getElementById('timer');
const optionBtns = document.querySelectorAll('.option-btn');
const modeToggle = document.getElementById('mode-toggle');
const mainContent = document.getElementById('main-content');
const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('username');
const nameSubmit = document.getElementById('name-submit');
const leaderboardDiv = document.getElementById('leaderboard');

function setTheme(dark) {
  document.body.classList.toggle('light', !dark);
  modeToggle.textContent = dark ? '🌙' : '☀️';
}

modeToggle.addEventListener('click', () => {
  setTheme(document.body.classList.contains('light'));
});

function showTypewriterText(element, text, cb) {
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text[i++];
      setTimeout(type, 18);
    } else if (cb) cb();
  }
  type();
}

function showQuestion() {
  if (current >= questions.length) {
    showResult();
    return;
  }
  const q = questions[current];
  questionImg.src = 'data:image/png;base64,' + q.image;
  questionImg.classList.remove('pop');
  setTimeout(() => questionImg.classList.add('pop'), 10);
  optionBtns.forEach(btn => {
    btn.classList.remove('selected', 'correct', 'incorrect');
    btn.disabled = false;
  });
  timeLeft = 90;
  updateTimer();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      clearInterval(timer);
      showCorrectAfterTimeout();
    }
  }, 1000);
}

function updateTimer() {
  timerDiv.textContent = `Time left: ${timeLeft}s`;
}

function showCorrectAfterTimeout() {
  const q = questions[current];
  userAnswers.push({
    selected: null,
    correct: q.correct
  });
  optionBtns.forEach(b => {
    b.disabled = true;
    if (b.getAttribute('data-option') === q.correct) {
      b.classList.add('correct');
    }
  });
  setTimeout(nextQuestion, 1500);
}

function nextQuestion() {
  current++;
  showQuestion();
}

optionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (timer) clearInterval(timer);
    const selected = btn.getAttribute('data-option');
    const correct = questions[current].correct;
    userAnswers.push({
      selected,
      correct
    });
    optionBtns.forEach(b => b.disabled = true);
    if (selected === correct) {
      btn.classList.add('correct');
      score++;
    } else {
      btn.classList.add('incorrect');
      optionBtns.forEach(b => {
        if (b.getAttribute('data-option') === correct) {
          b.classList.add('correct');
        }
      });
    }
    setTimeout(nextQuestion, 1500);
  });
});

function showResult() {
  quizDiv.classList.add('hidden');
  showTypewriterText(resultDiv, `Quiz complete!\n${userName}, your score: ${score} / ${questions.length}`, () => {
    setTimeout(showReview, 1200);
  });
  resultDiv.classList.remove('hidden');
  startBtn.textContent = 'Try Again';
  startBtn.classList.remove('hidden');

  // Save score to Netlify Function
  if (userName) {
    fetch('/.netlify/functions/save-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userName,
        score,
        total: questions.length,
        date: new Date().toISOString()
      })
    }).then(() => fetchLeaderboard());
  }
}

function fetchLeaderboard() {
  fetch('/.netlify/functions/save-score')
    .then(res => res.json())
    .then(scores => {
      if (!Array.isArray(scores) || scores.length === 0) {
        leaderboardDiv.innerHTML = '';
        leaderboardDiv.classList.add('hidden');
        return;
      }
      leaderboardDiv.innerHTML = '<h2>Leaderboard</h2>' +
        scores.slice(-10).reverse().map(s =>
          `<div class="score-row"><span class="score-name">${s.name}</span><span class="score-score">${s.score} / ${s.total}</span><span>${new Date(s.date).toLocaleString()}</span></div>`
        ).join('');
      leaderboardDiv.classList.remove('hidden');
    })
    .catch(() => {
      leaderboardDiv.innerHTML = '';
      leaderboardDiv.classList.add('hidden');
    });
}

function showReview() {
  let reviewDiv = document.getElementById('review');
  if (!reviewDiv) {
    reviewDiv = document.createElement('div');
    reviewDiv.id = 'review';
    mainContent.appendChild(reviewDiv);
  }
  reviewDiv.innerHTML = '<h2 class="typewriter">Review</h2>';
  questions.forEach((q, i) => {
    const ua = userAnswers[i];
    const isCorrect = ua.selected === q.correct;
    const card = document.createElement('div');
    card.className = 'review-card ' + (isCorrect ? 'correct' : 'incorrect');
    card.innerHTML = `
      <img class="review-img" src="data:image/png;base64,${q.image}" alt="Question ${i+1}" />
      <div class="review-answers">
        <span class="${ua.selected === q.correct ? 'correct' : 'your'}">Your: ${ua.selected ? ua.selected.toUpperCase() : 'None'}</span>
        <span class="correct">Correct: ${q.correct.toUpperCase()}</span>
      </div>
    `;
    reviewDiv.appendChild(card);
  });
  reviewDiv.classList.remove('hidden');
  fetchLeaderboard();
}

startBtn.addEventListener('click', () => {
  startBtn.classList.add('hidden');
  resultDiv.classList.add('hidden');
  let reviewDiv = document.getElementById('review');
  if (reviewDiv) reviewDiv.classList.add('hidden');
  current = 0;
  score = 0;
  userAnswers = [];
  quizDiv.classList.remove('hidden');
  showQuestion();
});

// Show name modal on load
window.addEventListener('DOMContentLoaded', () => {
  nameModal.style.display = 'flex';
  nameInput.focus();
  startBtn.classList.add('hidden');
});

// Handle name submit
nameSubmit.addEventListener('click', () => {
  const val = nameInput.value.trim();
  if (val.length > 0) {
    userName = val;
    nameModal.style.display = 'none';
    startBtn.classList.remove('hidden');
  } else {
    nameInput.focus();
    nameInput.style.borderColor = 'var(--incorrect)';
  }
});
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') nameSubmit.click();
});

// Load questions.json
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questions = data;
    startBtn.disabled = false;
  })
  .catch(() => {
    showTypewriterText(mainContent, 'Failed to load questions.', null);
    startBtn.disabled = true;
  });

// Set initial theme
setTheme(true);