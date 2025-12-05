// СКРИПТ: взаимодействие, звук, сохранение, подсказки, декодер
(function(){
  // Элементы
  const roomDesc = document.getElementById('roomDesc');
  const clueEls = Array.from(document.querySelectorAll('.clue'));
  const buttons = document.querySelectorAll('.button');
  const audioToggle = document.getElementById('audioToggle');
  const bgAudio = document.getElementById('bgAudio');
  const whisperAudio = document.getElementById('whisperAudio');
  const effectAudio = document.getElementById('effectAudio');
  const killerInput = document.getElementById('killerInput');
  const checkBtn = document.getElementById('checkBtn');
  const killerResult = document.getElementById('killerResult');
  const hintBtn = document.getElementById('hintBtn');
  const hintsLeftEl = document.getElementById('hintsLeft');
  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score');
  const hotspots = document.querySelectorAll('.hotspot');
  const shadow = document.getElementById('shadow');

  const decoderModal = document.getElementById('decoderModal');
  const decodeBtn = document.getElementById('decodeBtn');
  const decipherBtn = document.getElementById('decipherBtn');
  const cipherInput = document.getElementById('cipherInput');
  const cipherResult = document.getElementById('cipherResult');
  const closeDecoder = document.getElementById('closeDecoder');

  // Игра / состояние
  const STATE_KEY = 'rosewood_state_v1';
  let state = {
    openedClues: [],
    currentRoom: null,
    hintsLeft: 3,
    startTime: Date.now(),
    score: 0,
    attempts: 0
  };

  // Загружаем состояние
  function loadState(){
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if(raw) {
        const parsed = JSON.parse(raw);
        Object.assign(state, parsed);
      }
    } catch(e){}
    updateFromState();
  }
  function saveState(){
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e){}
  }

  function updateFromState(){
    // открыть нужные улики
    state.openedClues.forEach(id=>{
      const el = document.querySelector('.clue[data-clue="'+id+'"]');
      if(el) el.style.display = 'block';
    });
    hintsLeftEl.textContent = state.hintsLeft;
    scoreEl.textContent = state.score;
    updateTimer();
  }

  // Логика комнаты
  const roomText = {
    'library': 'Тихая библиотека. Полки с книгами, запах пергамента. Кажется, здесь кто-то искал документы.',
    'music': 'Музыкальная комната. Рояль, ноты разложены по столу.',
    'office': 'Кабинет Эдриана. Рабочий стол, закрытые ящики.',
    'garden': 'Сад с засохшими розами и следами шагов в грязи.',
    'basement': 'Холодный подвал. Пахнет металлом и старой лестницей.'
  };
  function enterRoom(room){
    state.currentRoom = room;
    saveState();
    roomDesc.textContent = roomText[room] || '';
    // небольшой эффект звука
    playEffect();
  }

  // Улики
  function openClue(id){
    const el = document.getElementById('clue'+id);
    if(!el) return;
    el.style.display = 'block';
    if(!state.openedClues.includes(id)) {
      state.openedClues.push(id);
      state.score += 10;
      saveState();
      scoreEl.textContent = state.score;
    }
    // краткий шепот
    whisperAudio.currentTime = 0;
    whisperAudio.volume = 0.35;
    playIfAllowed(whisperAudio);
  }

  // Проверка убийцы (пример с "Викториан" — замените на свою логику)
  function checkKiller(){
    const guess = (killerInput.value || '').trim().toLowerCase();
    state.attempts++;
    saveState();
    if(!guess) {
      killerResult.textContent = 'Введите имя.';
      return;
    }
    // допустим правильный ответ "виктор"
    if(guess === 'виктор' || guess === 'виктория') {
      killerResult.textContent = 'Верно! Вы раскрыли дело.';
      state.score += 100;
      saveState();
      scoreEl.textContent = state.score;
      playEffect();
    } else {
      killerResult.textContent = 'Неправильно. Попробуйте снова.';
      playIfAllowed(effectAudio);
    }
  }

  // Подсказка (уменьшает счёт, ограничено)
  function giveHint(){
    if(state.hintsLeft <= 0) {
      alert('Подсказок не осталось.');
      return;
    }
    state.hintsLeft--;
    state.score = Math.max(0, state.score - 5);
    // простая подсказка: если открыта clue1 — подсказка к кабинету и карте
    let hintText = 'Осмотрите библиотеку и кабинет — там есть связь.';
    if(state.openedClues.includes(3)) hintText = 'Символ напоминает сдвиг Цезаря — попробуйте декодер.';
    alert('Подсказка: ' + hintText);
    hintsLeftEl.textContent = state.hintsLeft;
    scoreEl.textContent = state.score;
    saveState();
  }

  // Аудио управление (включается после действия пользователя)
  let audioEnabled = false;
  function toggleAudio(force){
    audioEnabled = typeof force === 'boolean' ? force : !audioEnabled;
    audioToggle.setAttribute('aria-pressed', String(audioEnabled));
    audioToggle.textContent = audioEnabled ? '🔊 Звук включён' : '🎵 Включить звук';
    if(audioEnabled) {
      // громкость по умолчанию
      bgAudio.volume = 0.25;
      playIfAllowed(bgAudio);
    } else {
      bgAudio.pause(); whisperAudio.pause(); effectAudio.pause();
    }
    saveState();
  }

  // playWithGuard для соблюдения автоплей политик
  function playIfAllowed(audioEl){
    if(!audioEnabled) return;
    audioEl.play().catch(()=>{ /* autoplay blocked */ });
  }
  function playEffect(){
    if(!audioEnabled) return;
    effectAudio.currentTime = 0;
    effectAudio.volume = 0.6;
    playIfAllowed(effectAudio);
  }

  // Таймер
  function formatTime(ms){
    const s = Math.floor(ms/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }
  function updateTimer(){
    const elapsed = Date.now() - state.startTime;
    timerEl.textContent = formatTime(elapsed);
  }
  setInterval(updateTimer, 1000);

  // Декодер (сдвиг Цезаря прост)
  function caesarDecrypt(text, shift){
    const a = 'а'.charCodeAt(0);
    const z = 'я'.charCodeAt(0);
    return text.split('').map(ch=>{
      const code = ch.charCodeAt(0);
      if(code >= a && code <= z){
        let pos = code - a;
        pos = (pos - shift + 32) % 32;
        return String.fromCharCode(a + pos);
      }
      return ch;
    }).join('');
  }

  // Инициализация обработчиков
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.button');
    if(btn && btn.dataset.room) {
      enterRoom(btn.dataset.room);
    }
    if(btn && btn.dataset.clue) {
      openClue(Number(btn.dataset.clue));
    }
  });

  // привязки элементов
  document.querySelectorAll('[data-room]').forEach(el=>{
    el.addEventListener('click', ()=>enterRoom(el.dataset.room));
  });
  document.querySelectorAll('[data-clue]').forEach(el=>{
    el.addEventListener('click', ()=>openClue(Number(el.dataset.clue)));
  });

  checkBtn.addEventListener('click', checkKiller);
  hintBtn.addEventListener('click', giveHint);

  audioToggle.addEventListener('click', ()=> {
    // включить звук только после пользовательского клика
    toggleAudio(true);
  });
  audioToggle.addEventListener('keydown', (e)=> {
    if(e.key === 'Enter' || e.key === ' ') toggleAudio(true);
  });

  hotspots.forEach(h=>{
    h.addEventListener('click', ()=> enterRoom(h.dataset.room));
  });

  // Декодер модал
  decodeBtn && decodeBtn.addEventListener('click', ()=> {
    decoderModal.setAttribute('aria-hidden','false');
  });
  closeDecoder.addEventListener('click', ()=> {
    decoderModal.setAttribute('aria-hidden','true');
  });
  decipherBtn.addEventListener('click', ()=>{
    const txt = (cipherInput.value || '').toLowerCase();
    if(!txt) { cipherResult.textContent = 'Введите текст.'; return; }
    // Попробуем все сдвиги и покажем варианты
    let out = '';
    for(let s=1;s<32;s++){
      out += `s=${s}: ${caesarDecrypt(txt, s)}\n`;
    }
    cipherResult.textContent = out;
  });

  // Тень, следующая за курсором (эффект свечи)
  document.addEventListener('mousemove', (e)=>{
    shadow.style.left = (e.clientX - 40) + 'px';
    shadow.style.top = (e.clientY - 60) + 'px';
    shadow.style.opacity = '0.9';
  });
  document.addEventListener('mouseleave', ()=> shadow.style.opacity = '0');

  // Клавиатурная поддержка: цифры 1-5 открывают улики
  document.addEventListener('keydown', (e)=>{
    if(e.key >= '1' && e.key <= '5') openClue(Number(e.key));
    if(e.key === 'h') giveHint();
    if(e.key === 'm') toggleAudio(!audioEnabled);
    if(e.key === 'Escape') {
      decoderModal.setAttribute('aria-hidden','true');
    }
  });

  // Инициализация и загрузка
  loadState();

  // Если игрок еще не включал звук — не включаем автоматом.
  // Но если есть состояние audioEnabled в localStorage (при желании), можно его подхватить.
  // Сбрасываем старт времени если нужно
  if(!state.startTime) state.startTime = Date.now();
  saveState();

})();