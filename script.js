(() => {
  const COLS = 10, ROWS = 20, BLOCK = 30;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nctx = nextCanvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const year = document.getElementById('year'); year.textContent = new Date().getFullYear();

  // UI
  const elScore = document.getElementById('score');
  const elLevel = document.getElementById('level');
  const elSpeed = document.getElementById('speed');
  const elLinesToNext = document.getElementById('linesToNext');
  const btnStart = document.getElementById('btnStart');
  const btnMusic = document.getElementById('btnMusic');
  const btnPause = document.getElementById('btnPause');
  const bgm = document.getElementById('bgm');

  // Responsividade
  function resizeCanvas(){ const w = canvas.clientWidth; canvas.style.height = (w*2) + 'px'; }
  addEventListener('resize', resizeCanvas); resizeCanvas();

  // Peças
  const SHAPES = { I:[[1,1,1,1]], J:[[1,0,0],[1,1,1]], L:[[0,0,1],[1,1,1]], O:[[1,1],[1,1]], S:[[0,1,1],[1,1,0]], T:[[0,1,0],[1,1,1]], Z:[[1,1,0],[0,1,1]] };
  const COLORS = { I:'#60a5fa', J:'#c084fc', L:'#f59e0b', O:'#fde047', S:'#34d399', T:'#f472b6', Z:'#ef4444' };

  const board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  let bag = []; function refillBag(){ bag = Object.keys(SHAPES).sort(()=>Math.random()-0.5);} function nextType(){ if(!bag.length) refillBag(); return bag.pop(); }

  function newPiece(type){ const shape = SHAPES[type].map(r=>r.slice()); return { type, shape, x: Math.floor((COLS-shape[0].length)/2), y: -2 }; }
  let cur = null, next = newPiece(nextType());

  let dropCounter = 0, level = 1, score = 0, linesClearedThisLevel = 0;
  const SPEEDS = [1000,850,700,600,520,450,390,340,300,260,230,200];
  const currentSpeed = () => SPEEDS[Math.min(level-1, SPEEDS.length-1)];

  function updateSidebar(){ elScore.textContent = score; elLevel.textContent = level; elSpeed.textContent = currentSpeed()>=850?'Lenta':currentSpeed()>=520?'Média':'Rápida'; elLinesToNext.textContent = Math.max(0,5-linesClearedThisLevel);} 

  // Rotação + pequenos "kicks" laterais
  function rotate(m){ return m.map((r,i)=>r.map((_,j)=>m[m.length-1-j][i])); }
  function tryRotate(){
    const rotated = rotate(cur.shape);
    const tests = [0,-1,1,-2,2]; // tentativas de deslocamento lateral
    for(const dx of tests){ const trial = { ...cur, x: cur.x + dx, shape: rotated }; if(!collide(board, trial)){ cur.x += dx; cur.shape = rotated; return; } }
  }

  function collide(b,p){
    for(let y=0;y<p.shape.length;y++){
      for(let x=0;x<p.shape[y].length;x++){
        if(!p.shape[y][x]) continue;
        const nx = p.x + x, ny = p.y + y;
        if(ny < 0) continue; // permitir girar acima da borda
        if(nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if(b[ny][nx]) return true;
      }
    }
    return false;
  }

  function merge(b,p){ for(let y=0;y<p.shape.length;y++) for(let x=0;x<p.shape[y].length;x++) if(p.shape[y][x]){ const ny=p.y+y, nx=p.x+x; if(ny>=0) b[ny][nx]=p.type; } }

  function clearLines(){
    let lines=0; for(let y=ROWS-1;y>=0;y--){ if(board[y].every(c=>c)){ board.splice(y,1); board.unshift(Array(COLS).fill(null)); lines++; y++; }}
    if(lines){ const add = lines===1?100:lines===2?250:lines===3?450:700; score += add*level; linesClearedThisLevel += lines; while(linesClearedThisLevel>=5){ level++; linesClearedThisLevel-=5; } updateSidebar(); }
  }

  function drawCell(x,y,t){ if(!t) return; const c=COLORS[t], px=x*BLOCK, py=y*BLOCK; ctx.fillStyle=c; ctx.fillRect(px,py,BLOCK,BLOCK); ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.strokeRect(px+.5,py+.5,BLOCK-1,BLOCK-1); ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(px+2,py+2,BLOCK-4,Math.floor(BLOCK/3)); }
  function drawBoard(){ ctx.clearRect(0,0,canvas.width,canvas.height); for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) drawCell(x,y,board[y][x]); if(cur){ for(let y=0;y<cur.shape.length;y++) for(let x=0;x<cur.shape[y].length;x++) if(cur.shape[y][x] && cur.y+y>=0) drawCell(cur.x+x,cur.y+y,cur.type); } }

  // Preview 100% baseado no tamanho do canvas (fica minúsculo se canvas for 48x48 via CSS)
  function drawNext(){ nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height); const s=next.shape, w=s[0].length,h=s.length; const cell=Math.floor(nextCanvas.width/4); const ox=Math.floor((nextCanvas.width-w*cell)/2), oy=Math.floor((nextCanvas.height-h*cell)/2); for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(s[y][x]){ nctx.fillStyle=COLORS[next.type]; nctx.fillRect(ox+x*cell, oy+y*cell, cell, cell); nctx.strokeStyle='rgba(0,0,0,.25)'; nctx.strokeRect(ox+x*cell+.5, oy+y*cell+.5, cell-1, cell-1);} }

  let running=false, paused=false, lastTime=0, dropCounter=0;
  function reset(){ for(let y=0;y<ROWS;y++) board[y].fill(null); level=1; score=0; linesClearedThisLevel=0; updateSidebar(); refillBag(); next=newPiece(nextType()); spawn(); drawBoard(); drawNext(); }
  function spawn(){ cur=newPiece(next.type); next=newPiece(nextType()); if(collide(board,cur)){ running=false; showOverlay('Game Over','Reiniciar'); } drawNext(); }
  function showOverlay(title,btn){ overlay.innerHTML=`<div class="overlay-content"><h2>${title}</h2><button id="btnOverlay" class="primary">${btn}</button></div>`; overlay.style.display='grid'; document.getElementById('btnOverlay').onclick=()=>{ overlay.style.display='none'; reset(); running=true; paused=false; animate(0); }; }

  function hardDrop(){ let moved=0; while(!collide(board,{...cur,y:cur.y+1})) { cur.y++; moved++; } score+=2*moved; lock(); }
  function softDrop(){ if(!collide(board,{...cur,y:cur.y+1})) { cur.y++; score+=1; } else lock(); }
  function move(dx){ if(!collide(board,{...cur,x:cur.x+dx})) cur.x+=dx; }
  function rotateCur(){ tryRotate(); }
  function lock(){ merge(board,cur); clearLines(); spawn(); }

  function animate(time){ if(!running) return; const delta=time-lastTime; lastTime=time; if(!paused){ dropCounter+=delta; if(dropCounter>currentSpeed()){ dropCounter=0; if(!collide(board,{...cur,y:cur.y+1})) cur.y++; else lock(); } drawBoard(); } requestAnimationFrame(animate); }

  // Teclado: música/pausa funcionam mesmo parado; ações só quando rodando
  addEventListener('keydown',(e)=>{ if(e.key==='m'||e.key==='M'){toggleMusic();return;} if(e.key==='p'||e.key==='P'){togglePause();return;} if(!running) return; if(e.key==='ArrowLeft') move(-1); else if(e.key==='ArrowRight') move(1); else if(e.key==='ArrowUp'||e.key==='x'||e.key==='X') rotateCur(); else if(e.key==='ArrowDown') softDrop(); else if(e.key===' '){ e.preventDefault(); hardDrop(); }});

  // Controles toque/pointer: qualquer botão inicia o jogo e executa
  function bindPointer(el, fn){ el.addEventListener('pointerdown',(ev)=>{ ev.preventDefault(); fn(); }); el.addEventListener('click',(ev)=>{ ev.preventDefault(); fn(); }); }
  document.querySelectorAll('.ctrl').forEach(btn=>{ const a=btn.dataset.action; bindPointer(btn, ()=>handleAction(a)); });
  function handleAction(a){ if(!running){ startGame(); } if(a==='left') move(-1); else if(a==='right') move(1); else if(a==='rotate') rotateCur(); else if(a==='soft') softDrop(); else if(a==='hard') hardDrop(); else if(a==='pause') togglePause(); else if(a==='music') toggleMusic(); }

  function togglePause(){ if(!running){ startGame(); return; } paused=!paused; btnPause.setAttribute('aria-pressed', String(paused)); if(paused) bgm.pause(); else if(btnMusic.getAttribute('aria-pressed')==='true') bgm.play().catch(()=>{}); }
  function toggleMusic(){ const on=btnMusic.getAttribute('aria-pressed')==='true'; if(on){ btnMusic.setAttribute('aria-pressed','false'); bgm.pause(); } else { btnMusic.setAttribute('aria-pressed','true'); bgm.volume=.4; bgm.play().catch(()=>{}); } }

  function startGame(){ overlay.style.display='none'; reset(); running=true; paused=false; lastTime=performance.now(); animate(lastTime); }

  btnStart?.addEventListener('click', startGame); btnMusic.addEventListener('click', toggleMusic); btnPause.addEventListener('click', togglePause);
  overlay.style.display='grid';
})();
