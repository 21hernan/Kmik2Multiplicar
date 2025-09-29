const { firebaseDB, firebaseRef, firebaseSet, firebaseOn, firebaseRemove } = window;

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Sala desde URL
const params = new URLSearchParams(window.location.search);
const roomCode = params.get('sala') || 'default-room';


const roomRef = firebaseRef(firebaseDB, `https://duelo-multiplicar-default-rtdb.firebaseio.com/rooms/${roomCode}`);

// Elementos
const nameScreen = document.getElementById('nameScreen');
const waitScreen = document.getElementById('waitScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');
const playersList = document.getElementById('playersList');
const saveBtn = document.getElementById('saveBtn');
const readyBtn = document.getElementById('readyBtn');
const answerInput = document.getElementById('answerInput');

let myName = '';
let players = [];
let questions = [];
let curQ = 0;
let timer = null;
let myAnswers = [];
let myCorrect = 0;
let myStartTime = 0;

/* ---------- mostrar código de sala ---------- */
document.getElementById('roomCode').textContent = roomCode;

/* ---------- guardar mi nombre ---------- */
saveBtn.onclick = () => {
  const raw = document.getElementById('playerNameInput').value.trim() || 'Anónimo';
  myName = capitalize(raw);
  localStorage.setItem('playerName', myName);
  firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/players/${myName}`), { name: myName, ready: false });
  nameScreen.classList.add('hidden');
  waitScreen.classList.remove('hidden');
};

document.getElementById('playerNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveBtn.click();
});

/* ---------- escuchar jugadores ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/players`), (snap) => {
  players = [];
  snap.forEach(child => players.push(child.val()));
  playersList.innerHTML = players.map(p => `<li>${p.name} ${p.ready ? '✅' : ''}</li>`).join('');
  if (players.length === 2) {
    readyBtn.classList.remove('hidden');
  }
});

/* ---------- marcar listo ---------- */
readyBtn.onclick = () => {
  firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/players/${myName}/ready`), true);
};

/* ---------- cuando ambos estén listos, el primero que lo vea genera las preguntas ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/players`), (snap) => {
  const list = [];
  snap.forEach(child => list.push(child.val()));
  if (list.length === 2 && list.every(p => p.ready)) {
    // Solo el primero que lo vea crea las preguntas (evita duplicados)
    firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/start`), (startSnap) => {
      if (!startSnap.exists()) {
        const qs = [];
        const seen = new Set();
        while (qs.length < 10) {
          const a = Math.floor(Math.random() * 8) + 2;
          const b = Math.floor(Math.random() * 8) + 2;
          const key = [a, b].sort().join('×');
          if (!seen.has(key)) { seen.add(key); qs.push([a, b]); }
        }
        firebaseSet(firebaseRef(firebaseDB, `rooms/${roomCode}/start`), { questions: qs });
      }
    });
  }
});

/* ---------- cuando existan las preguntas, empezar ---------- */
firebaseOn(firebaseRef(firebaseDB, `rooms/${roomCode}/start`), (snap) => {
  if (snap.exists()) {
    questions = snap.val().questions;
    curQ = 0;
    waitScreen.classList.add('hidden');
    playTurn();
  }
});

/* ---------- turno del jugador ---------- */
function playTurn() {
  show('gameScreen');
  document.getElementById('turnInfo').textContent = capitalize(myName);
  document.getElementById('questionNumber').textContent = `Pregunta ${curQ + 1} de 10`;
  const [a, b] = questions[curQ];
  document.getElementById('num1').textContent = a;
  document.getElementById('num2').textContent = b;
  answerInput.value = '';
  answerInput.focus();
  myStartTime = Date.now();
  timer = setInterval(() => {
    const t = (Date.now() - myStartTime) / 1000;
    document.getElementById('timer').textContent = `⏱ ${t.toFixed(2)} s`;
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

    document.getElementById('winnerInfo').innerHTML = `
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
    document.getElementById('detailTable').innerHTML = detailRows;
  });
}

document.getElementById('restartBtn').onclick = () => {
  location.reload();
};