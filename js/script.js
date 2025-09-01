const $ = id => document.getElementById(id);
const players = [
  {name:'',answers:[],correct:0,tStart:0,tEnd:0},
  {name:'',answers:[],correct:0,tStart:0,tEnd:0}
];
let curPlayer = 0, questions=[], curQ=0, timer=null;

/* capitalizar en tiempo real */
function capitalizeFirst(e){
  const val = e.target.value;
  if(val) e.target.value = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
}
$('p1Name').addEventListener('input', capitalizeFirst);
$('p2Name').addEventListener('input', capitalizeFirst);

/* generar preguntas únicas */
function rnd(n=10){
  const s=new Set(),o=[];
  while(o.length<n){
    const a=Math.floor(Math.random()*8)+2,b=Math.floor(Math.random()*8)+2,k=`${a}x${b}`;
    if(!s.has(k)){s.add(k);o.push([a,b])}
  }
  return o;
}

/* mostrar/ocultar */
function show(id){$(id).classList.remove('hidden')}
function hide(id){$(id).classList.add('hidden')}

/* preparación */
function prep(pIdx){
  curPlayer=pIdx;
  const p=players[pIdx];
  p.answers=[],p.correct=0;
  questions=rnd();
  curQ=0;
  $('prepText').textContent=`Turno de ${p.name}. ¡Prepárate!`;
  hide('gameScreen');hide('resultScreen');show('prepScreen');
  $('prepBtn').focus();
}

/* juego */
function game(){
  hide('prepScreen');show('gameScreen');
  const p=players[curPlayer];
  $('turnInfo').textContent=`Turno de ${p.name}`;
  $('questionNumber').textContent=`Pregunta ${curQ+1} de 10`;
  const [a,b]=questions[curQ];
  $('num1').textContent=a;
  $('num2').textContent=b;
  $('answerInput').value='';
  $('answerInput').focus();
  p.tStart=Date.now();
  timer=setInterval(()=>{const t=(Date.now()-p.tStart)/1000;$('timer').textContent=`⏱ ${t.toFixed(2)} s`},100);
}

function next(){
  const p=players[curPlayer],a=questions[curQ][0],b=questions[curQ][1];
  const ans=parseInt($('answerInput').value,10);
  p.answers.push({a,b,correct:a*b,given:isNaN(ans)?'':ans,ok:ans===a*b});
  if(ans===a*b) p.correct++;
  curQ++;
  if(curQ<10){game()}else{endTurn()}
}

function endTurn(){
  clearInterval(timer);
  players[curPlayer].tEnd=Date.now();
  hide('gameScreen');
  curPlayer===0?prep(1):results();
}

/* resultados */
function results(){
  show('resultScreen');
  const [p1,p2]=players,t1=(p1.tEnd-p1.tStart)/1000,t2=(p2.tEnd-p2.tStart)/1000;
  let w=p1,l=p2;
  if(p2.correct>p1.correct||(p2.correct===p1.correct&&t2<t1)){w=p2;l=p1}
  $('winnerInfo').innerHTML=`<div class="winner">🏆 ${w.name} — ${w.correct}/10 — ${(w.tEnd-w.tStart)/1000}s</div>
                             <div class="loser">${l.name} — ${l.correct}/10 — ${(l.tEnd-l.tStart)/1000}s</div>`;
  $('scoreTable').innerHTML=`<tr><th>${p1.name}</th><th>${p2.name}</th></tr>
                             <tr><td>${p1.correct}/10</td><td>${p2.correct}/10</td></tr>
                             <tr><td>${t1.toFixed(2)}s</td><td>${t2.toFixed(2)}s</td></tr>`;
  let rows='<tr><th colspan="2">'+p1.name+'</th><th colspan="2">'+p2.name+'</th></tr><tr><th>Op</th><th>Res</th><th>Op</th><th>Res</th></tr>';
  for(let i=0;i<10;i++){
    const r1=p1.answers[i],r2=p2.answers[i];
    rows+='<tr>';
    [r1,r2].forEach(r=>{
      if(r){rows+=`<td>${r.a}×${r.b}</td><td>${r.ok?`✓${r.given}`:`✗${r.given}/${r.correct}`}</td>`}
      else{rows+='<td></td><td></td>'}
    });
    rows+='</tr>';
  }
  $('detailTable').innerHTML=rows;
  $('restartBtn').focus();
}

/* ---------- listeners ---------- */
$('startBtn').onclick=()=>{
  players[0].name=$('p1Name').value.trim()||'Jugador 1';
  players[1].name=$('p2Name').value.trim()||'Jugador 2';
  hide('nameScreen');prep(0);
};
$('prepBtn').onclick=game;
$('answerInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();next()}});
$('p1Name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('p2Name').focus()}});
$('p2Name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('startBtn').click()}});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!$('resultScreen').classList.contains('hidden')){
    e.preventDefault();
    $('restartBtn').focus();
  }
});
$('restartBtn').onclick=()=>{
  hide('resultScreen');
  show('nameScreen');
  // los nombres ya quedan guardados en los inputs
  $('p1Name').focus();
};
window.addEventListener('DOMContentLoaded',()=>$('p1Name').focus());