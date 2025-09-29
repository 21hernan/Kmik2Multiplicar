const { firebaseDB, firebaseRef, firebaseSet, firebaseOn, firebaseRemove } = window;

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Sala desde URL
const params = new URLSearchParams(window.location.search);
const roomCode = params.get('sala') || 'default-room';
const roomRef = firebaseRef(firebaseDB, `rooms/${roomCode}`);

// Elementos
const waitScreen = $('waitScreen');
const gameScreen = $('gameScreen');
const resultScreen = $('resultScreen');
const playersList = $('playersList');
const joinBtn = $('joinBtn');
const startBtn = $('startBtn');
const answerInput = $('answerInput');

let myName = '';
let players = [];
let questions = [];
let curQ = 0;
let timer = null;
let myAnswers = [];
let myCorrect = 0;
let myStartTime = 0;

/* ---------- unirse a la sala ---------- */
$('roomCode').textContent = roomCode;

joinBtn.onclick = () => {
  const raw = $('playerNameInput').value.trim() || 'Anónimo';
  myName = capitalize(raw);
  firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/players/${myName}`), { name: myName, ready: false });
  $('playerNameInput').disabled = true;
  joinBtn.disabled = true;
};

/* ---------- escuchar jugadores ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/players`), (snap) => {
  players = [];
  snap.forEach(child => players.push(child.val()));
  playersList.innerHTML = players.map(p => `<li>${p.name} ${p.ready ? '✅' : ''}</li>`).join('');
  if (players.length === 2 && players.every(p => p.ready)) {
    startBtn.classList.remove('hidden');
  }
});

/* ---------- marcar listo ---------- */
startBtn.onclick = () => {
  firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/players/${myName}/ready`), true);
};

/* ---------- escuchar inicio del juego ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/start`), (snap) => {
  if (snap.exists()) {
    questions = snap.val().questions;
    curQ = 0;
    hide('waitScreen');
    playTurn();
  }
});

/* ---------- turno del jugador ---------- */
function playTurn() {
  show('gameScreen');
  $('turnInfo').textContent = capitalize(myName);
  $('questionNumber').textContent = `Pregunta ${curQ + 1} de 10`;
  const [a, b] = questions[curQ];
  $('num1').textContent = a;
  $('num2').textContent = b;
  answerInput.value = '';
  answerInput.focus();
  myStartTime = Date.now();
  timer = setInterval(() => {
    const t = (Date.now() - myStartTime) / 1000;
    $('timer').textContent = `⏱ ${t.toFixed(2)} s`;
  }, 100);

  answerInput.onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ans = parseInt(this.value, 10) || 0;
      const [a, b] = questions[curQ];
      const ok = ans === a * b;
      myAnswers.push({ a, b, correct: a * b, given: ans, ok });
      if (ok) myCorrect++;
      clearInterval(timer);
      firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/answers/${myName}/${curQ}`), {
        answer: ans,
        correct: ok,
        time: (Date.now() - myStartTime) / 1000
      });
      curQ++;
      if (curQ < 10) {
        playTurn();
      } else {
        finishGame();
      }
    }
  };
}

/* ---------- terminar juego ---------- */
function finishGame() {
  hide('gameScreen');
  show('resultScreen');
  firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/finished/${myName}`), true);
  showResults();
}

/* ---------- mostrar resultados cuando ambos terminen ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/finished`), (snap) => {
  if (snap.size === 2) {
    showResults();
  }
});

function showResults() {
  firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/answers`), (snap) => {
    const data = snap.val();
    const p1Name = Object.keys(data)[0];
    const p2Name = Object.keys(data)[1];
    const p1Answers = Object.values(data[p1Name]);
    const p2Answers = Object.values(data[p2Name]);
    const p1Correct = p1Answers.filter(a => a.correct).length;
    const p2Correct = p2Answers.filter(a => a.correct).length;
    const p1Time = p1Answers.reduce((sum, a) => sum + a.time, 0);
    const p2Time = p2Answers.reduce((sum, a) => sum + a.time, 0);

    let winner, loser;
    if (p1Correct > p2Correct || (p1Correct === p2Correct && p1Time < p2Time)) {
      winner = { name: p1Name, correct: p1Correct, time: p1Time };
      loser = { name: p2Name, correct: p2Correct, time: p2Time };
    } else {
      winner = { name: p2Name, correct: p2Correct, time: p2Time };
      loser = { name: p1Name, correct: p1Correct, time: p1Time };
    }

    $('winnerInfo').innerHTML = `
      <div class="winner">${capitalize(winner.name)} – ${winner.correct}/10 en ${winner.time.toFixed(2)} s</div>
      <div class="loser">${capitalize(loser.name)} – ${loser.correct}/10 en ${loser.time.toFixed(2)} s</div>
    `;

    let detailRows = '<tr><th>Jugador</th><th>Operación</th><th>Respuesta</th><th>Tiempo</th><th>Resultado</th></tr>';
    [p1Name, p2Name].forEach((name, idx) => {
      const ans = Object.values(data[name]);
      ans.forEach((a, i) => {
        detailRows += `<tr>
                         <td>${capitalize(name)}</td>
                         <td>${questions[i][0]}×${questions[i][1]}</td>
                         <td>${a.answer}</td>
                         <td>${a.time.toFixed(2)} s</td>
                         <td>${a.correct ? '✓' : `✗ ${questions[i][0] * questions[i][1]}`}</td>
                       </tr>`;
      });
    });
    $('detailTable').innerHTML = detailRows;
  });
}

$('restartBtn').onclick = () => {
  location.reload();
};