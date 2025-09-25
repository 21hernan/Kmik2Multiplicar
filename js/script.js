const $ = id => document.getElementById(id);
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/* ---------- datos de ambos jugadores ---------- */
const players = [
  { name: '', answers: [], correct: 0, tStart: 0, tEnd: 0 },
  { name: '', answers: [], correct: 0, tStart: 0, tEnd: 0 }
];
let curPlayer = 0;   // 0 o 1
let questions = [], curQ = 0, timer = null;

/* ---------- generar 10 preguntas iguales ---------- */
function rnd(n = 10) {
  const seen = new Set(), out = [];
  while (out.length < n) {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    const key = [a, b].sort().join('×');
    if (!seen.has(key)) { seen.add(key); out.push([a, b]); }
  }
  return out;
}

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

/* ---------- pedir nombres ---------- */
$('saveP1Btn').onclick = () => {
  const raw = $('p1NameInput').value.trim() || 'Jugador 1';
  players[0].name = capitalize(raw);
  hide('nameP1Screen');
  show('nameP2Screen');
  $('p2NameInput').focus();
};
$('p1NameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('saveP1Btn').click();
});

$('saveP2Btn').onclick = () => {
  const raw = $('p2NameInput').value.trim() || 'Jugador 2';
  players[1].name = capitalize(raw);
  hide('nameP2Screen');
  startDuel();
};
$('p2NameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('saveP2Btn').click();
});

/* ---------- inicio del duelo ---------- */
function startDuel() {
  questions = rnd();
  curQ = 0;
  curPlayer = 0;
  players[0].answers = [];
  players[0].correct = 0;
  players[1].answers = [];
  players[1].correct = 0;
  showPrep();
}

function showPrep() {
  hide('gameScreen');
  hide('resultScreen');
  show('prepScreen');
  $('prepText').textContent = `Turno de ${players[curPlayer].name}`;
  $('readyBtn').focus();
}

$('readyBtn').onclick = () => {
  hide('prepScreen');
  playTurn();
};

/* ---------- turno de un jugador ---------- */
function playTurn() {
  show('gameScreen');
  $('turnInfo').textContent = players[curPlayer].name;
  $('questionNumber').textContent = `Pregunta ${curQ + 1} de 10`;
  const [a, b] = questions[curQ];
  $('num1').textContent = a;
  $('num2').textContent = b;
  $('answerInput').value = '';
  $('answerInput').focus();

  players[curPlayer].tStart = Date.now();
  timer = setInterval(() => {
    const t = (Date.now() - players[curPlayer].tStart) / 1000;
    $('timer').textContent = `⏱ ${t.toFixed(2)} s`;
  }, 100);

  /* Enter para pasar a la siguiente acción */
  $('answerInput').onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ans = parseInt(this.value, 10) || 0;
      const [a, b] = questions[curQ];
      const ok = ans === a * b;
      players[curPlayer].answers.push({ a, b, correct: a * b, given: ans, ok });
      if (ok) players[curPlayer].correct++;
      clearInterval(timer);
      nextAction();
    }
  };
}

function nextAction() {
  if (curPlayer === 0) {
    /* jugador 1 terminó → turno del 2 */
    curPlayer = 1;
    showPrep();
  } else {
    /* ambos terminaron → resultados */
    showResults();
  }
}

/* ---------- resultados ---------- */
function showResults() {
  hide('gameScreen');
  hide('prepScreen');
  show('resultScreen');

  const [p1, p2] = players;
  const t1 = (p1.tEnd - p1.tStart) / 1000;
  const t2 = (p2.tEnd - p2.tStart) / 1000;

  let winner, loser;
  if (p1.correct > p2.correct || (p1.correct === p2.correct && t1 < t2)) {
    winner = p1; loser = p2;
  } else {
    winner = p2; loser = p1;
  }

  $('winnerInfo').innerHTML = `
    <div class="winner">🏆 ${capitalize(winner.name)} – ${winner.correct}/10 en ${((winner.tEnd - winner.tStart) / 1000).toFixed(2)} s</div>
    <div class="loser">${capitalize(loser.name)} – ${loser.correct}/10 en ${((loser.tEnd - loser.tStart) / 1000).toFixed(2)} s</div>
  `;

  /* tabla resumen */
  $('scoreTable').innerHTML = `
    <tr><th>Nombre</th><th>Aciertos</th><th>Tiempo</th></tr>
    <tr><td>${capitalize(p1.name)}</td><td>${p1.correct}/10</td><td>${t1.toFixed(2)} s</td></tr>
    <tr><td>${capitalize(p2.name)}</td><td>${p2.correct}/10</td><td>${t2.toFixed(2)} s</td></tr>
  `;

  /* tabla detalle por jugador */
  let rows = '<tr><th>Jugador</th><th>Operación</th><th>Respuesta</th><th>Resultado</th></tr>';
  [p1, p2].forEach((p, idx) => {
    p.answers.forEach(a => {
      rows += `<tr>
                 <td>${capitalize(p.name)}</td>
                 <td>${a.a}×${a.b}</td>
                 <td>${a.given}</td>
                 <td>${a.ok ? '✓' : `✗ ${a.correct}`}</td>
               </tr>`;
    });
  });
  $('detailTable').innerHTML = rows;

  $('restartBtn').focus();
}

$('restartBtn').onclick = () => {
  hide('resultScreen');
  startDuel();
};