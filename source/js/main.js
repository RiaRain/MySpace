import '../styles/main.styl';

import { openHabitTracker } from '../components/habit-tracker/habit-tracker.js';
import { initDayOverview } from '../components/day-overview/day-overview';

/* ===== Данные и настройки ===== */

const KEY = 'myspace.v1';
const $ = s => document.querySelector(s);

const pad = n => String(n).padStart(2, '0');

const dk = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const pd = s => {
  const [a, b, c] = s.split('-').map(Number);
  return new Date(a, b - 1, c);
};

const today = () => dk(new Date());

const uid = () =>
  Math.random().toString(36).slice(2, 8) +
  Date.now().toString(36).slice(-4);

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const defCats = [
  ['work', 'Работа', '💼', '#8d7ae0'],
  ['free', 'Фриланс', '💻', '#6fa8dc'],
  ['learn', 'Обучение', '📚', '#e6b86a'],
  ['music', 'Музыка', '🎵', '#e58fb0'],
  ['home', 'Дом', '🏠', '#8fbf9f'],
  ['me', 'Личное', '🌸', '#c58fe0'],
  ['mars', 'Марсик', '🐾', '#e09a7a'],
  ['other', 'Другое', '✨', '#a39cc4']
].map(([id, name, icon, color]) => ({
  id,
  name,
  icon,
  color
}));

const PARTS = [
  ['', 'Без времени'],
  ['morning', '🌅 Утро'],
  ['day', '☀️ День'],
  ['evening', '🌙 Вечер']
];

const ICONS = [
  '✨', '💼', '💻', '📚', '🎵', '🏠', '🌸', '🐾',
  '🏃', '💧', '🧘', '📖', '🛏', '🍎', '✍️', '🎨',
  '🧹', '💊', '🌿', '⭐'
];

/* ===== Структура и хранение данных ===== */

function norm(d) {
  d = d && typeof d === 'object' ? d : {};

  return {
    theme: d.theme || 'light',

    cats: d.cats && d.cats.length
      ? d.cats
      : defCats.map(c => ({ ...c })),

    tasks: d.tasks || [],
    notes: d.notes || [],
    start: d.start || {},
    habits: d.habits || [],
    focus: d.focus || [],

    score: {
      tasks: d.score?.tasks || [],
      days: d.score?.days || []
    },

    review: d.review || {},
    name: d.name || '',
    asked: !!d.asked,
    fin: d.fin || [],

    eng: {
      words: d.eng?.words || [],
      phrases: d.eng?.phrases || [],
      gram: d.eng?.gram || [],
      log: d.eng?.log || []
    },

    books: d.books || [],
    wish: d.wish || [],
    ideas: d.ideas || [],
    ach: d.ach || [],
    ideaCategories: d.ideaCategories || [],
    mood: d.mood || {},
  };
}

function load() {
  let raw = null;

  try {
    raw = localStorage.getItem(KEY);
    return norm(raw ? JSON.parse(raw) : null);
  } catch (e) {
    if (raw) {
      try {
        localStorage.setItem(KEY + '.broken', raw);
      } catch (_) {}
    }

    return norm(null);
  }
}

let S = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    alert('Не удалось сохранить данные (хранилище недоступно или переполнено).');
  }
}

/* ===== Общие переменные и функции ===== */

let sel = today();
let view = pd(sel);

view.setDate(1);

let flt = 'all';

const catOf = id =>
  S.cats.find(c => c.id === id) || {
    id: '',
    name: 'Без категории',
    icon: '•',
    color: '#b8b0d8'
  };

const dayTasks = d => S.tasks.filter(t => t.date === d);

const awarded = id => S.score.tasks.includes(id);

const total = () =>
  S.score.tasks.length + 5 * S.score.days.length;

const dayPts = d =>
  dayTasks(d).filter(t => awarded(t.id)).length +
  (S.score.days.includes(d) ? 5 : 0);

const focusSec = (d, tid) =>
  S.focus
    .filter(f => (d ? f.date === d : true) && (tid ? f.taskId === tid : true))
    .reduce((a, f) => a + f.sec, 0);

const fmtDur = s => {
  const h = Math.floor(s / 3600);
  const m = Math.round(s % 3600 / 60);

  return (h ? h + ' ч ' : '') + m + ' мин';
};

const longDate = d =>
  pd(d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long'
  });

function toast(m) {
  const t = $('#toast');

  t.textContent = m;
  t.classList.add('on');

  clearTimeout(toast.h);

  toast.h = setTimeout(() => {
    t.classList.remove('on');
  }, 2200);
}

/* ===== Диалоги и формы ===== */

function form(title, fields, ok, back) {
  const d = $('#dlg');

  d.innerHTML = `
    <h3 style="margin:0">${title}</h3>

    <div class="ff">
      ${fields.map(f => `
        <label>
          ${f.label}
          ${
            f.type === 'select'
              ? `
                <select name="${f.k}">
                  ${f.opts.map(o => `
                    <option value="${esc(o[0])}" ${o[0] == f.val ? 'selected' : ''}>
                      ${esc(o[1])}
                    </option>
                  `).join('')}
                </select>
              `
              : f.type === 'textarea'
                ? `<textarea name="${f.k}">${esc(f.val)}</textarea>`
                : `
                  <input
                    name="${f.k}"
                    type="${f.type || 'text'}"
                    ${f.type === 'file' ? 'accept="image/*"' : ''}
                    ${f.type === 'number' ? 'step="any" min="0"' : ''}
                    value="${esc(f.val)}"
                  >
                `
          }
        </label>
      `).join('')}
    </div>

    <div class="row sp">
      <button class="btn" id="fc">Отмена</button>
      <button class="btn pri" id="fo">Сохранить</button>
    </div>
  `;

  if (!d.open) d.showModal();

  $('#fc').onclick = () => back ? back() : d.close();

  $('#fo').onclick = () => {
    const v = {};

    fields.forEach(f => {
      const el = d.querySelector(`[name="${f.k}"]`);

      v[f.k] = f.type === 'file'
        ? el.files[0]
        : el.value;
    });

    if (ok(v) === false) return;

    back ? back() : d.close();
  };

  const first = d.querySelector('input,textarea');

  if (first && !first.value) first.focus();
}

function catsMgr() {
  const d = $('#dlg');

  d.innerHTML = `
    <h3 style="margin:0">Категории</h3>

    <ul class="cl">
      ${S.cats.map(c => `
        <li>
          <span class="badge" style="background:${c.color}44">
            ${c.icon} ${esc(c.name)}
          </span>

          <span>
            <button class="ib" data-e="${c.id}">✎</button>
            <button class="ib" data-x="${c.id}">🗑</button>
          </span>
        </li>
      `).join('')}
    </ul>

    <div class="row sp">
      <button class="btn" id="ca">+ Категория</button>
      <button class="btn pri" id="cx">Готово</button>
    </div>
  `;

  if (!d.open) d.showModal();

  $('#cx').onclick = () => {
    d.close();
    render();
  };

  $('#ca').onclick = () => catForm();

  d.onclick = e => {
    const b = e.target.closest('button');

    if (!b) return;

    if (b.dataset.e) {
      catForm(S.cats.find(c => c.id === b.dataset.e));
    }

    if (b.dataset.x) {
      const c = S.cats.find(x => x.id === b.dataset.x);

      if (!confirm(
        `Удалить категорию «${c.name}»? Её задачи станут «Без категории» или перейдут в «Другое».`
      )) return;

      S.cats = S.cats.filter(x => x !== c);

      const fb = S.cats.find(x => x.id === 'other') || S.cats[0];

      S.tasks.forEach(t => {
        if (t.cat === c.id) t.cat = fb ? fb.id : '';
      });

      save();
      catsMgr();
    }
  };
}

function catForm(c) {
  form(
    c ? 'Изменить категорию' : 'Новая категория',
    [
      {
        k: 'name',
        label: 'Название',
        val: c?.name || ''
      },
      {
        k: 'icon',
        label: 'Иконка',
        type: 'select',
        val: c?.icon || '✨',
        opts: ICONS.map(i => [i, i])
      },
      {
        k: 'color',
        label: 'Цвет',
        type: 'color',
        val: c?.color || '#8d7ae0'
      }
    ],
    v => {
      if (!v.name.trim()) return false;

      if (c) {
        Object.assign(c, {
          name: v.name.trim(),
          icon: v.icon,
          color: v.color
        });
      } else {
        S.cats.push({
          id: uid(),
          name: v.name.trim(),
          icon: v.icon,
          color: v.color
        });
      }

      save();
    },
    catsMgr
  );
}

function taskForm(t, focusDate) {
  form(
    t ? 'Редактировать / перенести задачу' : 'Новая задача',
    [
      {
        k: 'title',
        label: 'Название',
        val: t?.title || ''
      },
      {
        k: 'cat',
        label: 'Категория',
        type: 'select',
        val: t?.cat || (S.cats[0]?.id || ''),
        opts: S.cats.map(c => [c.id, c.icon + ' ' + c.name])
      },
      {
        k: 'date',
        label: 'Дата',
        type: 'date',
        val: t?.date || sel
      },
      {
        k: 'part',
        label: 'Часть дня',
        type: 'select',
        val: t?.part || '',
        opts: PARTS
      },
      {
        k: 'note',
        label: 'Заметка к задаче',
        type: 'textarea',
        val: t?.note || ''
      }
    ],
    v => {
      if (!v.title.trim() || !v.date) return false;

      const old = t?.date;

      if (t) {
        Object.assign(t, {
          title: v.title.trim(),
          cat: v.cat,
          date: v.date,
          part: v.part,
          note: v.note
        });
      } else {
        S.tasks.push({
          id: uid(),
          title: v.title.trim(),
          cat: v.cat,
          date: v.date,
          part: v.part,
          note: v.note,
          done: false
        });
      }

      if (t && old !== v.date) {
        toast('Задача перенесена на ' + longDate(v.date));
      }

      save();
      render();
    }
  );

  if (focusDate) {
    setTimeout(() => $('#dlg [name=date]')?.focus(), 50);
  }
}

/* ===== Главная страница: рендер ===== */

function render() {
  head();
  start();
  cal();
  day();
  game();
  renderTimer();
  week();
  notes();
  habits();
  review();
}

function head() {
  const h = new Date().getHours();

  $('#greet').textContent =
    h < 5 ? 'Доброй ночи'
      : h < 12 ? 'Доброе утро'
        : h < 18 ? 'Добрый день'
          : 'Добрый вечер';

  $('#greet').textContent += (S.name ? ', ' + S.name : '') + ' ✨';

  $('#today').textContent = longDate(today());
  // $('#theme').textContent = S.theme === 'dark' ? '☀️' : '🌙';

  document.documentElement.dataset.theme = S.theme;
}

function start() {
  const s = S.start[sel] || {};

  $('#sodDate').textContent = '· ' + longDate(sel);

  $('#mood').innerHTML = ['😞', '🙁', '😐', '🙂', '😄']
    .map((e, i) => `
      <button class="${s.mood === i + 1 ? 'on' : ''}" data-m="${i + 1}">
        ${e}
      </button>
    `).join('');

  $('#energy').innerHTML = [1, 2, 3, 4, 5]
    .map(i => `
      <button class="${s.energy === i ? 'on' : ''}" data-en="${i}">
        ${i}
      </button>
    `).join('');

  $('#main').value = s.main || '';
}

function setStart(k, v) {
  (S.start[sel] = S.start[sel] || {})[k] = v;

  // синхронизируем с рейтингом, который читает календарь
  if (k === 'mood' || k === 'energy') {
    const s = S.start[sel];

    S.mood ||= {};

    if (s.mood || s.energy) {
      S.mood[sel] = {
        mood: s.mood || 0,
        energy: s.energy || 0
      };
    } else {
      delete S.mood[sel];
    }
  }
}

function cal() {
  $('#mTitle').textContent = view.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });

  const first = (view.getDay() + 6) % 7;
  const n = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0
  ).getDate();

  const t = today();

  let h = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    .map(w => `<div class="wd">${w}</div>`)
    .join('');

  for (let i = 0; i < first; i++) {
    h += '<div></div>';
  }

  for (let d = 1; d <= n; d++) {
    const k = `${view.getFullYear()}-${pad(view.getMonth() + 1)}-${pad(d)}`;

    const ht = S.tasks.some(x => x.date === k);
    const hn = S.notes.some(x => x.date === k);
    const st = S.start[k];

    const rating = S.mood?.[k] ||
      (st && (st.mood || st.energy)
        ? { mood: st.mood || 0, energy: st.energy || 0 }
        : null);

    const track = k === sel
      ? 'rgba(255,255,255,.35)'
      : 'rgba(128,128,160,.25)';

    const lineCss =
      `height:5px;border-radius:10px;overflow:hidden;background:${track}`;

    const moodColor = `hsl(${(Math.max(rating?.mood || 1, 1) - 1) * 30}, 75%, 55%)`;

    const bars = rating ? `
      <div class="day-rating" style="display:flex;flex-direction:column;gap:3px;width:75%;margin:4px auto 0"
           title="Энергия: ${rating.energy}/5 · Настроение: ${rating.mood}/5">
        <div class="day-rating__line" style="${lineCss}">
          <span class="day-rating__energy"
                style="display:block;height:100%;border-radius:10px;background:#f5b942;width:${rating.energy * 20}%"></span>
        </div>
        <div class="day-rating__line" style="${lineCss}">
          <span class="day-rating__mood"
                style="display:block;height:100%;border-radius:10px;background:${moodColor};width:${rating.mood * 20}%"></span>
        </div>
      </div>
    ` : '';

    h += `
      <button class="day ${k === t ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-d="${k}">
        ${d}
        ${bars}
        <span class="dots">
          ${ht ? '<i></i>' : ''}
          ${hn ? '<i class="n"></i>' : ''}
        </span>
      </button>
    `;
  }

  $('#cal').innerHTML = h;
}

function day() {
  $('#dTitle').textContent = longDate(sel);

  const m = S.start[sel]?.main;

  const rating = S.mood?.[sel];

  $('#dMain').innerHTML = `
    ${m ? '🎯 Главное: <b>' + esc(m) + '</b>' : ''}

    <div class="day-mood">
      <button class="btn" id="dayMood">
        ${rating
          ? `⚡ Энергия: ${rating.energy}/5 · 💜 Настроение: ${rating.mood}/5`
          : '⚡ Настроение и энергия'}
      </button>
    </div>
  `;

  $('#dayMood').onclick = () => {
    const rating = S.mood?.[sel] || { energy: 3, mood: 3 };

    form('Энергия и настроение', [
      {
        k: 'energy',
        label: '⚡ Уровень энергии',
        type: 'select',
        val: String(rating.energy),
        opts: [
          ['1', '1 — Очень мало'],
          ['2', '2 — Мало'],
          ['3', '3 — Нормально'],
          ['4', '4 — Много'],
          ['5', '5 — Максимум']
        ]
      },
      {
        k: 'mood',
        label: '💜 Настроение',
        type: 'select',
        val: String(rating.mood),
        opts: [
          ['1', '1 — Очень плохое'],
          ['2', '2 — Плохое'],
          ['3', '3 — Нейтральное'],
          ['4', '4 — Хорошее'],
          ['5', '5 — Отличное']
        ]
      }
    ], v => {
      S.mood ||= {};
      S.mood[sel] = {
        energy: Number(v.energy),
        mood: Number(v.mood)
      };

      (S.start[sel] = S.start[sel] || {}).mood = Number(v.mood);
      S.start[sel].energy = Number(v.energy);

      save();
      render();
    });
  };

  const all = dayTasks(sel);
  const done = all.filter(t => t.done).length;

  $('#filter').innerHTML =
    `<button class="btn ${flt === 'all' ? 'on' : ''}" data-f="all">Все (${all.length})</button>` +
    S.cats.map(c => `
      <button class="btn ${flt === c.id ? 'on' : ''}" data-f="${c.id}">
        ${c.icon} ${esc(c.name)}
      </button>
    `).join('');

  const ord = ['', 'morning', 'day', 'evening'];

  const list = all
    .filter(t => flt === 'all' || t.cat === flt)
    .sort((a, b) =>
      ord.indexOf(a.part || '') - ord.indexOf(b.part || '')
    );

  $('#tasks').innerHTML = list.length
    ? list.map(t => {
        const c = catOf(t.cat);
        const f = focusSec(0, t.id);
        const p = (PARTS.find(x => x[0] === (t.part || '')) || [])[1];

        return `
          <li class="task ${t.done ? 'done' : ''}">
            <button class="chk" data-a="tg" data-id="${t.id}">
              ${t.done ? '✓' : ''}
            </button>

            <div class="tb">
              <div class="tt">${esc(t.title)}</div>

              <div class="tm">
                <span class="badge" style="background:${c.color}33">
                  ${c.icon} ${esc(c.name)}
                </span>

                ${t.part ? `<span>${p}</span>` : ''}
                ${f ? `<span>⏱ ${fmtDur(f)}</span>` : ''}
                ${awarded(t.id) ? '<span>⭐ +1</span>' : ''}
              </div>

              ${t.note ? `<div class="tn">${esc(t.note)}</div>` : ''}
            </div>

            <div class="ta">
              <button class="ib" data-a="tm" data-id="${t.id}" title="Таймер">▶</button>
              <button class="ib" data-a="ed" data-id="${t.id}" title="Редактировать">✎</button>
              <button class="ib" data-a="mv" data-id="${t.id}" title="Перенести">📅</button>
              <button class="ib" data-a="rm" data-id="${t.id}" title="Удалить">🗑</button>
            </div>
          </li>
        `;
      }).join('')
    : `
      <li class="empty">
        ${all.length
          ? 'В этой категории задач нет'
          : 'На этот день задач пока нет 🌌<br>Нажмите «+ Задача»'}
      </li>
    `;
}

function toggle(id) {
  const t = S.tasks.find(x => x.id === id);

  t.done = !t.done;

  if (t.done) {
    if (!awarded(id)) {
      S.score.tasks.push(id);

      toast(CHEER[Math.floor(Math.random() * CHEER.length)]);
    }

    const dt = dayTasks(t.date);

    if (
      dt.length &&
      dt.every(x => x.done) &&
      !S.score.days.includes(t.date)
    ) {
      S.score.days.push(t.date);

      toast(
        'День закрыт! +5 ⭐ Ты звёздочка' +
        (S.name ? ', ' + S.name : '') +
        ' 🎉'
      );
    }
  }

  save();
  render();
}

function game() {
  const all = dayTasks(sel);
  const done = all.filter(t => t.done).length;
  const p = all.length ? done / all.length : 0;

  $('#cat').style.left = `calc((100% - 130px) * ${p} + 6px)`;
  $('#bar').style.width = Math.round(p * 100) + '%';

  $('#catMsg').textContent =
    !all.length
      ? '· добавь задачу, и котик отправится в путь 🐾'
      : p >= 1
        ? '· клубок найден! 🎉'
        : p > 0
          ? '· клубок всё ближе ✨'
          : '· котик ждёт первую задачу 🐾';

  $('#gstats').innerHTML = `
    <div><b>${Math.round(p * 100)}%</b>прогресс дня</div>
    <div><b>${done}/${all.length}</b>выполнено</div>
    <div><b>${dayPts(sel)}</b>баллов за день</div>
    <div><b>${total()}</b>всего баллов</div>
  `;
}

/* ===== Таймер фокуса ===== */

const T = {
  state: 'idle',
  dur: 25,
  total: 0,
  end: 0,
  rem: 0,
  taskId: null
};

const left = () =>
  T.state === 'run'
    ? Math.max(0, Math.ceil((T.end - Date.now()) / 1000))
    : T.state === 'pause'
      ? T.rem
      : T.dur * 60;

const mmss = s =>
  pad(Math.floor(s / 60)) + ':' + pad(s % 60);

function renderTimer() {
  const t = S.tasks.find(x => x.id === T.taskId);
  const st = T.state;

  $('#timer').innerHTML = `
    <h2>⏱ Таймер фокуса</h2>

    <div class="tdisp" id="tdisp">${mmss(left())}</div>

    <div class="mut" style="text-align:center;margin-bottom:10px">
      ${
        st === 'idle'
          ? 'Без привязки к задаче (или нажмите ▶ у задачи)'
          : (t ? 'Задача: ' + esc(t.title) : 'Без задачи') +
            (st === 'pause' ? ' · пауза' : '')
      }
    </div>

    <div class="row" style="justify-content:center">
      ${
        st === 'idle'
          ? `
            <input type="number" id="tmin" min="1" max="240" value="${T.dur}" style="width:80px">
            <span>мин</span>

            ${[15, 25, 45].map(m => `
              <button class="btn" data-pm="${m}">${m}</button>
            `).join('')}

            <button class="btn pri" data-t="start">Старт</button>
          `
          : `
            <button class="btn pri" data-t="${st === 'run' ? 'pause' : 'resume'}">
              ${st === 'run' ? '⏸ Пауза' : '▶ Продолжить'}
            </button>

            <button class="btn" data-t="stop">⏹ Стоп</button>
          `
      }
    </div>
  `;
}

function tStart(taskId) {
  if (T.state !== 'idle') {
    if (!confirm('Таймер уже запущен. Остановить его и начать заново?')) {
      return;
    }

    tStop();
  }

  const m = parseInt($('#tmin')?.value) || T.dur;

  T.dur = Math.min(240, Math.max(1, m));
  T.total = T.dur * 60;
  T.taskId = taskId || null;
  T.end = Date.now() + T.total * 1000;
  T.state = 'run';

  renderTimer();
}

function record(sec, tid) {
  if (sec < 60) return;

  S.focus.push({
    id: uid(),
    date: today(),
    sec: Math.round(sec),
    taskId: tid || null
  });

  save();

  day();
  week();
  review();
}

function tStop() {
  if (T.state === 'idle') return;

  record(T.total - left(), T.taskId);

  T.state = 'idle';
  T.taskId = null;

  document.title = 'My Space';

  renderTimer();
}

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();

    [0, 0.35, 0.7].forEach(o => {
      const x = a.createOscillator();
      const g = a.createGain();

      x.frequency.value = 660;
      x.connect(g);
      g.connect(a.destination);

      g.gain.setValueAtTime(0.2, a.currentTime + o);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        a.currentTime + o + 0.3
      );

      x.start(a.currentTime + o);
      x.stop(a.currentTime + o + 0.3);
    });
  } catch (e) {}
}

setInterval(() => {
  if (T.state !== 'run') return;

  const l = left();
  const e = $('#tdisp');

  if (e) e.textContent = mmss(l);

  document.title = mmss(l) + ' · My Space';

  if (l <= 0) {
    record(T.total, T.taskId);

    T.state = 'idle';
    T.taskId = null;

    document.title = 'My Space';

    beep();
    toast('Сессия фокуса завершена 🎉');

    renderTimer();
  }
}, 250);

function week() {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();

    d.setDate(d.getDate() - i);

    days.push(dk(d));
  }

  const v = days.map(d => focusSec(d));
  const mx = Math.max(...v, 1);

  $('#week').innerHTML = `
    <div>
      <b style="font-size:22px">
        ${fmtDur(v.reduce((a, b) => a + b, 0))}
      </b>
      <span class="mut">за последние 7 дней</span>
    </div>

    <div class="wk">
      ${days.map((d, i) => `
        <div>
          <div class="mut">
            ${v[i] ? Math.round(v[i] / 60) + 'м' : ''}
          </div>

          <i style="height:${Math.round(v[i] / mx * 70)}px"></i>

          ${pd(d).toLocaleDateString('ru-RU', { weekday: 'short' })}
        </div>
      `).join('')}
    </div>
  `;
}

/* ===== Заметки ===== */

function notes() {
  const l = S.notes.filter(n => n.date === sel);

  $('#notes').innerHTML = l.length
    ? l.map(n => `
        <div class="note">
          <span>${esc(n.text)}</span>

          <span style="flex:none">
            <button class="ib" data-ne="${n.id}">✎</button>
            <button class="ib" data-nx="${n.id}">🗑</button>
          </span>
        </div>
      `).join('')
    : '<div class="empty">Заметок на этот день нет</div>';
}

/* ===== Привычки ===== */

function streak(h) {
  const d = pd(sel);

  if (!h.log[dk(d)]) {
    d.setDate(d.getDate() - 1);
  }

  let n = 0;

  while (h.log[dk(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }

  return n;
}

function habits() {
  $('#habits').innerHTML = S.habits.length
    ? S.habits.map(h => `
        <div class="hab">
          <button
            class="chk ${h.log[sel] ? '' : ''}"
            style="${h.log[sel] ? 'background:var(--ac)' : ''}"
            data-hk="${h.id}"
          >
            ${h.log[sel] ? '✓' : ''}
          </button>

          <span style="flex:1">
            ${h.icon} ${esc(h.name)}
          </span>

          <span class="mut">🔥 ${streak(h)}</span>

          <button class="ib" data-he="${h.id}">✎</button>
          <button class="ib" data-hx="${h.id}">🗑</button>
        </div>
      `).join('')
    : '<div class="empty">Привычек пока нет</div>';
}

function habitForm(h) {
  form(
    h ? 'Изменить привычку' : 'Новая привычка',
    [
      {
        k: 'name',
        label: 'Название',
        val: h?.name || ''
      },
      {
        k: 'icon',
        label: 'Иконка',
        type: 'select',
        val: h?.icon || '🌿',
        opts: ICONS.map(i => [i, i])
      }
    ],
    v => {
      if (!v.name.trim()) return false;

      if (h) {
        Object.assign(h, {
          name: v.name.trim(),
          icon: v.icon
        });
      } else {
        S.habits.push({
          id: uid(),
          name: v.name.trim(),
          icon: v.icon,
          log: {}
        });
      }

      save();
      habits();
    }
  );
}

/* ===== Итог дня ===== */

function review() {
  const all = dayTasks(sel);
  const done = all.filter(t => t.done).length;
  const r = S.review[sel] || {};

  $('#rStats').innerHTML = `
    <div><b>${done}</b>выполнено</div>
    <div><b>${all.length - done}</b>осталось</div>
    <div><b>${fmtDur(focusSec(sel))}</b>в фокусе</div>
    <div><b>${dayPts(sel)}</b>баллов</div>
  `;

  $('#rGood').value = r.good || '';
  $('#rNext').value = r.next || '';
}

/* ===== Обработчики главной страницы ===== */

function pickDate(d) {
  sel = d;

  const x = pd(d);

  view = new Date(x.getFullYear(), x.getMonth(), 1);

  render();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button');

  if (!b) return;

  const D = b.dataset;

  if (D.d) {
    pickDate(D.d);
  }

  if (D.m) {
    setStart(
      'mood',
      +D.m === S.start[sel]?.mood ? 0 : +D.m
    );

    save();
    start();
    cal();
  }

  if (D.en) {
    setStart(
      'energy',
      +D.en === S.start[sel]?.energy ? 0 : +D.en
    );

    save();
    start();
    cal();
  }

  if (D.f) {
    flt = D.f;
    day();
  }

  if (D.pm) {
    const i = $('#tmin');

    i.value = D.pm;
    T.dur = +D.pm;
  }

  if (D.t === 'start') {
    tStart(null);
  }

  if (D.t === 'pause') {
    T.rem = left();
    T.state = 'pause';

    renderTimer();
  }

  if (D.t === 'resume') {
    T.end = Date.now() + T.rem * 1000;
    T.state = 'run';

    renderTimer();
  }

  if (D.t === 'stop') {
    tStop();
  }

  if (D.a) {
    const t = S.tasks.find(x => x.id === D.id);

    if (D.a === 'tg') toggle(D.id);
    if (D.a === 'tm') tStart(D.id);
    if (D.a === 'ed') taskForm(t);
    if (D.a === 'mv') taskForm(t, true);

    if (
      D.a === 'rm' &&
      confirm(`Удалить задачу «${t.title}»?`)
    ) {
      S.tasks = S.tasks.filter(x => x !== t);

      if (T.taskId === t.id) {
        T.taskId = null;
      }

      save();
      render();
    }
  }

  if (D.ne) {
    const n = S.notes.find(x => x.id === D.ne);

    form(
      'Изменить заметку',
      [
        {
          k: 'text',
          label: 'Текст',
          type: 'textarea',
          val: n.text
        }
      ],
      v => {
        if (!v.text.trim()) return false;

        n.text = v.text.trim();

        save();
        notes();
      }
    );
  }

  if (D.nx && confirm('Удалить заметку?')) {
    S.notes = S.notes.filter(x => x.id !== D.nx);

    save();
    render();
  }

  if (D.hk) {
    const h = S.habits.find(x => x.id === D.hk);

    h.log[sel]
      ? delete h.log[sel]
      : h.log[sel] = true;

    save();
    habits();
  }

  if (D.he) {
    habitForm(S.habits.find(x => x.id === D.he));
  }

  if (D.hx) {
    const h = S.habits.find(x => x.id === D.hx);

    if (
      confirm(`Удалить привычку «${h.name}» вместе с историей?`)
    ) {
      S.habits = S.habits.filter(x => x !== h);

      save();
      habits();
    }
  }
});

/* ===== Кнопки и поля главной страницы ===== */

$('#prev').onclick = () => {
  view.setMonth(view.getMonth() - 1);
  cal();
};

$('#next').onclick = () => {
  view.setMonth(view.getMonth() + 1);
  cal();
};

$('#goToday').onclick = () => pickDate(today());

$('#addT').onclick = () => taskForm();

$('#catMgr').onclick = catsMgr;

$('#hAdd').onclick = () => habitForm();

$('#hStats').onclick = () => {
  openHabitTracker(S.habits);
};

$('#nAdd').onclick = () => {
  const v = $('#nText').value.trim();

  if (!v) return;

  S.notes.push({
    id: uid(),
    date: sel,
    text: v
  });

  $('#nText').value = '';

  save();
  render();
};

$('#main').oninput = e => {
  setStart('main', e.target.value);

  $('#dMain').innerHTML = e.target.value
    ? '🎯 Главное: <b>' + esc(e.target.value) + '</b>'
    : '';
};

$('#rGood').oninput = e => {
  (S.review[sel] = S.review[sel] || {}).good = e.target.value;
  save();
};

$('#rNext').oninput = e => {
  (S.review[sel] = S.review[sel] || {}).next = e.target.value;
  save();
};

// $('#theme').onclick = () => {
//   S.theme = S.theme === 'dark' ? 'light' : 'dark';

//   save();
//   head();
// };

document.addEventListener('input', e => {
  if (e.target.id === 'tmin') {
    const v = parseInt(e.target.value);

    if (v > 0) {
      T.dur = Math.min(240, v);
      $('#tdisp').textContent = mmss(T.dur * 60);
    }
  }
});

/* ===== Экспорт и импорт данных ===== */

$('#exp').onclick = () => {
  const a = document.createElement('a');

  a.href = URL.createObjectURL(
    new Blob(
      [JSON.stringify(S, null, 2)],
      { type: 'application/json' }
    )
  );

  a.download = `my-space-${today()}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$('#imp').onclick = () => $('#file').click();

$('#file').onchange = e => {
  const f = e.target.files[0];

  if (!f) return;

  const r = new FileReader();

  r.onload = () => {
    try {
      const d = JSON.parse(r.result);

      if (!d || typeof d !== 'object' || !Array.isArray(d.tasks)) {
        throw 0;
      }

      if (
        !confirm(
          'Импорт заменит все текущие данные. Продолжить? (Рекомендуется сначала сделать экспорт.)'
        )
      ) {
        return;
      }

      S = norm(d);

      save();
      render();

      toast('Данные импортированы');
    } catch (_) {
      alert('Не удалось прочитать файл: это не резервная копия My Space.');
    }

    e.target.value = '';
  };

  r.readAsText(f);
};

/* ===== Инициализация главной страницы ===== */

render();

/* ==================================================
   НОВЫЕ РАЗДЕЛЫ И ПЕРСОНАЛИЗАЦИЯ
================================================== */

/* ===== Навигация и общие настройки ===== */

const R = {};
const H = {};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-c]');

  if (b && b.tagName !== 'SELECT' && H[b.dataset.c]) {
    H[b.dataset.c](b.dataset.id, b);
  }
});

H['day.mood'] = () => {
  const rating = S.mood?.[sel] || {
    energy: 3,
    mood: 3
  };

  form('Энергия и настроение', [
    {
      k: 'energy',
      label: '⚡ Уровень энергии',
      type: 'select',
      val: String(rating.energy),
      opts: [
        ['1', '1 — Очень мало'],
        ['2', '2 — Мало'],
        ['3', '3 — Нормально'],
        ['4', '4 — Много'],
        ['5', '5 — Максимум']
      ]
    },
    {
      k: 'mood',
      label: '💜 Настроение',
      type: 'select',
      val: String(rating.mood),
      opts: [
        ['1', '1 — Очень плохое'],
        ['2', '2 — Плохое'],
        ['3', '3 — Нейтральное'],
        ['4', '4 — Хорошее'],
        ['5', '5 — Отличное']
      ]
    }
  ], v => {
    S.mood ||= {};

    S.mood[sel] = {
      energy: Number(v.energy),
      mood: Number(v.mood)
    };

    (S.start[sel] = S.start[sel] || {}).mood = Number(v.mood);
    S.start[sel].energy = Number(v.energy);

    save();
    render();
  });
};

let cur = 'home';

const PAGES = [
  ['home', 'home.png', 'Главная'],
  ['fin', 'pay.png', 'Финансы'],
  ['eng', 'english.png', 'Английский'],
  ['books', 'books.png', 'Книги'],
  ['wish', 'gift.png', 'Вишлист'],
  ['ideas', 'idea.png', 'Идеи'],
  ['ach', 'win.png', 'Достижения']
];

const CHEER = [
  '+1 ⭐ Так держать!',
  '+1 ⭐ Ещё шаг к клубку 🧶',
  '+1 ⭐ Умничка!',
  '+1 ⭐ Звёздочка твоя ✨'
];

const QUOTES = [
  'Маленькие шаги каждый день строят большие миры ✨',
  'Ты создаёшь красивое и полезное — продолжай 🌸',
  'Один ряд петель, одна нота, одна строчка кода — и вот уже путь 🧶',
  'Звёзды тоже когда-то были облаком пыли. Расти в своём темпе 🌌',
  'Сегодня отличный день, чтобы выучить что-то новое 📚',
  'Твоё любопытство — твоя суперсила 🔭',
  'Пусть Петербург вдохновляет, а клавиши фортепиано звучат 🎹',
  'Красиво, уютно и по-твоему — так и живём 🪐',
  'Большие цели складываются из спокойных ежедневных шагов 🚀',
  'Ты уже далеко ушла от себя вчерашней 💫'
];

const rr = () => cur === 'home' ? render() : R[cur]();

const sum = (a, t) =>
  a.filter(x => x.type === t)
    .reduce((s, x) => s + x.amount, 0);

const hue = s => {
  let h = 0;

  for (const c of String(s)) {
    h = (h * 31 + c.charCodeAt(0)) % 360;
  }

  return h;
};

const hd = (t, s) => `
  <div style="margin-bottom:14px">
    <h1 style="font-size:24px">${t}</h1>
    <div class="mut">${s}</div>
  </div>
`;

const find = (a, id) => a.find(x => x.id === id);

const fd = d => pd(d).toLocaleDateString('ru-RU');

const rm = (a, id, msg) => {
  const i = a.findIndex(x => x.id === id);

  if (i >= 0 && confirm(msg)) {
    a.splice(i, 1);

    save();
    rr();
  }
};

const acts = (c, id, v) => `
  <button
    class="ib"
    data-c="${c}.ed"
    data-id="${id}"
    ${v ? `data-v="${v}"` : ''}
    title="Изменить"
  >✎</button>

  <button
    class="ib"
    data-c="${c}.rm"
    data-id="${id}"
    ${v ? `data-v="${v}"` : ''}
    title="Удалить"
  >🗑</button>
`;

const url = u => {
  u = (u || '').trim();

  if (!u) return '';

  u = /^https?:\/\//i.test(u) ? u : 'https://' + u;

  try {
    return new URL(u).href;
  } catch (e) {
    return '';
  }
};

const shrink = (f, m = 380) => new Promise(r => {
  if (!f) return r(null);

  const i = new Image();
  const u = URL.createObjectURL(f);

  i.onload = () => {
    const k = Math.min(1, m / Math.max(i.width, i.height));

    const c = document.createElement('canvas');

    c.width = Math.round(i.width * k);
    c.height = Math.round(i.height * k);

    c.getContext('2d').drawImage(
      i,
      0,
      0,
      c.width,
      c.height
    );

    URL.revokeObjectURL(u);

    r(c.toDataURL('image/jpeg', 0.82));
  };

  i.onerror = () => r(null);

  i.src = u;
});

/* ===== Навигация между страницами ===== */

$('#nav').innerHTML =
  '<b>My Space</b>' +
  PAGES.map(([k, i, t]) => `
    <button data-p="${k}">
      <img class="nav-icon" src="assets/icons/${i}" alt="">
      ${t}
    </button>
  `).join('') +
  '<button id="theme2"><span>🌓</span>Тема</button>';

$('#nav').onclick = e => {
  const b = e.target.closest('button');

  if (!b) return;

  if (b.id === 'theme2') {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = S.theme;
    save();

    b.textContent = S.theme === 'dark' ? '☀️ Тема' : '🌙 Тема';
  } else {
    go(b.dataset.p);
  }
};

function go(p) {
  if (!PAGES.some(x => x[0] === p)) {
    p = 'home';
  }

  cur = p;
  location.hash = p;

  $('#p-home').hidden = p !== 'home';
  $('#pg').hidden = p === 'home';

  document.querySelectorAll('#nav [data-p]').forEach(b => {
    b.classList.toggle('on', b.dataset.p === p);
  });

  rr();

  scrollTo(0, 0);
}

$('#pg').onchange = e => {
  const b = e.target.closest('select[data-c]');

  if (b) {
    H[b.dataset.c](b.value, b);
  }
};

$('#pg').oninput = e => {
  if (e.target.id === 'iq') {
    iq = e.target.value;
    $('#ilist').innerHTML = ideasList();
  }
};

/* ===== Имя и приветствие ===== */

function nameForm() {
  form(
    'Как тебя зовут? 🌸',
    [
      {
        k: 'name',
        label: 'Имя для приветствия',
        val: S.name
      }
    ],
    v => {
      S.name = v.name.trim();

      save();
      head();
    }
  );
}

$('#greet').onclick = nameForm;

$('#quote').textContent =
  QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];

head();

if (!S.name && !S.asked) {
  S.asked = true;

  save();

  setTimeout(nameForm, 300);
}

/* ===== Финансы ===== */

const FIN = {
  inc: [
    'Зарплата',
    'Фриланс',
    'Подарок',
    'Другое'
  ],

  exp: [
    'Еда',
    'Дом',
    'Транспорт',
    'Хобби',
    'Книги',
    'Красота',
    'Путешествия',
    'Другое'
  ]
};

const rub = n =>
  Math.round(n).toLocaleString('ru-RU') + ' ₽';

let fm = today().slice(0, 7);

let ff = {
  t: 'all',
  c: 'all'
};

R.fin = () => {
  const all = S.fin.filter(x => x.date.startsWith(fm));

  const inc = sum(all, 'inc');
  const exp = sum(all, 'exp');

  const mx = Math.max(inc, exp, 1);
  const df = inc - exp;

  const list = all
    .filter(x =>
      (ff.t === 'all' || x.type === ff.t) &&
      (ff.c === 'all' || x.cat === ff.c)
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const by = {};

  all
    .filter(x => x.type === 'exp')
    .forEach(x => {
      by[x.cat] = (by[x.cat] || 0) + x.amount;
    });

  const rows = Object.entries(by)
    .sort((a, b) => b[1] - a[1]);

  const cats = [...new Set([...FIN.inc, ...FIN.exp])];

  $('#pg').innerHTML = hd(
    'Финансы',
    'Деньги любят порядок и спокойный взгляд. Копим на мечты ✨'
  ) +

  `
    <div class="card row sp" style="margin-bottom:16px">
      <div class="row">
        <button class="ib" data-c="fin.m" data-id="-1">◀</button>

        <b class="mt">
          ${pd(fm + '-01').toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
          })}
        </b>

        <button class="ib" data-c="fin.m" data-id="1">▶</button>
      </div>

      <button class="btn pri" data-c="fin.add">
        + Операция
      </button>
    </div>

    <div class="kpis">
      <div class="card kpi" style="background:var(--sg)">
        <span class="mut">Доходы</span>
        <b class="pos">${rub(inc)}</b>
      </div>

      <div class="card kpi" style="background:var(--pk)">
        <span class="mut">Расходы</span>
        <b class="neg">${rub(exp)}</b>
      </div>

      <div class="card kpi">
        <span class="mut">Разница</span>
        <b class="${df >= 0 ? 'pos' : 'neg'}">
          ${df > 0 ? '+' : ''}${rub(df)}
        </b>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <h2>Доходы и расходы</h2>

        <div class="hb">
          <span>Доходы</span>
          <div>
            <i style="width:${inc / mx * 100}%;background:#8fbf9f"></i>
          </div>
        </div>

        <div class="hb">
          <span>Расходы</span>
          <div>
            <i style="width:${exp / mx * 100}%;background:#e58fb0"></i>
          </div>
        </div>

        <div class="mut" style="margin-top:8px">
          ${
            df >= 0
              ? 'В плюсе — отлично, так держать 🌿'
              : 'Расходов больше, чем доходов — загляни в список ниже 🔍'
          }
        </div>
      </section>

      <section class="card">
        <h2>Расходы по категориям</h2>

        ${
          rows.length
            ? rows.map(([c, v]) => `
                <div class="hb">
                  <span>${c}</span>

                  <div>
                    <i style="width:${v / rows[0][1] * 100}%"></i>
                  </div>

                  <b>${rub(v)}</b>
                </div>
              `).join('')
            : '<div class="empty">Пока нет расходов за этот месяц</div>'
        }
      </section>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="row sp">
        <h2 style="margin:0">Операции</h2>

        <div class="row">
          <select data-c="fin.ft" style="width:auto">
            <option value="all">Все</option>
            <option value="inc" ${ff.t === 'inc' ? 'selected' : ''}>
              Доходы
            </option>
            <option value="exp" ${ff.t === 'exp' ? 'selected' : ''}>
              Расходы
            </option>
          </select>

          <select data-c="fin.fc" style="width:auto">
            <option value="all">Все категории</option>

            ${cats.map(c => `
              <option ${ff.c === c ? 'selected' : ''}>
                ${c}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <ul>
        ${
          list.length
            ? list.map(x => `
                <li class="task">
                  <div class="tb">
                    <div class="tt">
                      ${esc(x.note) || '<span class="mut">без комментария</span>'}
                    </div>

                    <div class="tm">
                      <span>${fd(x.date)}</span>
                      <span class="badge">${esc(x.cat)}</span>
                    </div>
                  </div>

                  <b class="${x.type === 'inc' ? 'pos' : 'neg'}">
                    ${x.type === 'inc' ? '+' : '−'}${rub(x.amount)}
                  </b>

                  <div class="ta">
                    ${acts('fin', x.id)}
                  </div>
                </li>
              `).join('')
            : '<li class="empty">Операций нет 🌙</li>'
        }
      </ul>
    </section>
  `;
};

/* ===== Обработчики финансов ===== */

H['fin.m'] = n => {
  const d = pd(fm + '-01');

  d.setMonth(d.getMonth() + +n);

  fm = dk(d).slice(0, 7);

  R.fin();
};

H['fin.ft'] = v => {
  ff.t = v;
  R.fin();
};

H['fin.fc'] = v => {
  ff.c = v;
  R.fin();
};

H['fin.add'] = () => finForm();

H['fin.ed'] = id => finForm(find(S.fin, id));

H['fin.rm'] = id =>
  rm(S.fin, id, 'Удалить операцию?');

function finForm(x) {
  form(
    x ? 'Изменить операцию' : 'Новая операция',
    [
      {
        k: 'cat',
        label: 'Категория',
        type: 'select',
        val: x ? x.type + '|' + x.cat : 'exp|Еда',

        opts: [
          ...FIN.inc.map(c => [
            'inc|' + c,
            '➕ Доход: ' + c
          ]),

          ...FIN.exp.map(c => [
            'exp|' + c,
            '➖ Расход: ' + c
          ])
        ]
      },
      {
        k: 'amount',
        label: 'Сумма, ₽',
        type: 'number',
        val: x?.amount ?? ''
      },
      {
        k: 'date',
        label: 'Дата',
        type: 'date',
        val: x?.date || today()
      },
      {
        k: 'note',
        label: 'Комментарий',
        val: x?.note || ''
      }
    ],
    v => {
      const a = parseFloat(v.amount);

      if (!(a > 0) || !v.date) return false;

      const [type, cat] = v.cat.split('|');

      const o = {
        type,
        cat,
        amount: a,
        date: v.date,
        note: v.note.trim()
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.fin.push({
          id: uid(),
          ...o
        });
      }

      fm = v.date.slice(0, 7);

      save();
      R.fin();
    }
  );
}

/* ===== Английский ===== */

let et = 'words';

R.eng = () => {
  const e = S.eng;

  const dn = e.words.filter(w => w.done).length;

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();

    d.setDate(d.getDate() - 6 + i);

    return dk(d);
  });

  const mins = days.map(d =>
    e.log
      .filter(l => l.date === d)
      .reduce((a, l) => a + l.min, 0)
  );

  const item = k =>
    e[k].length
      ? `
        <ul>
          ${e[k].map(w => `
            <li class="task ${w.done ? 'done' : ''}">
              <button
                class="chk"
                data-c="eng.tg"
                data-id="${w.id}"
                data-v="${k}"
                title="Выучено"
              >
                ${w.done ? '✓' : ''}
              </button>

              <div class="tb">
                <div class="tt">
                  <b>${esc(w.w)}</b> — ${esc(w.tr)}
                </div>

                ${w.ex ? `<div class="tn">${esc(w.ex)}</div>` : ''}
              </div>

              <div class="ta">
                ${acts('eng', w.id, k)}
              </div>
            </li>
          `).join('')}
        </ul>
      `
      : `
        <div class="empty">
          Пока пусто. Добавь первое, и словарь начнёт расти 🌱
        </div>
      `;

  const body =
    et === 'gram'
      ? e.gram.length
        ? e.gram.map(g => `
            <div class="ach">
              <div class="row sp">
                <b>📐 ${esc(g.title)}</b>
                <span>${acts('eng', g.id, 'gram')}</span>
              </div>

              <div class="tn">${esc(g.text)}</div>
            </div>
          `).join('')
        : '<div class="empty">Здесь будут правила и заметки по грамматике 📐</div>'

      : et === 'log'
        ? e.log.length
          ? [...e.log]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(l => `
                <div class="ach">
                  <div class="row sp">
                    <b>${fd(l.date)} · ${l.min} мин</b>
                    <span>${acts('eng', l.id, 'log')}</span>
                  </div>

                  <div>${esc(l.what)}</div>
                </div>
              `).join('')
          : '<div class="empty">Запиши первое занятие. Регулярность — это магия ✨</div>'

        : item(et);

  $('#pg').innerHTML = hd(
    'Английский',
    'Каждое новое слово — окно в большой мир 🌍'
  ) +

  `
    <div class="kpis">
      <div class="card kpi">
        <span class="mut">Изучено слов</span>
        <b>
          ${dn}
          <small class="mut">из ${e.words.length}</small>
        </b>
      </div>

      <div class="card kpi">
        <span class="mut">Занятия за 7 дней</span>
        <b>${mins.filter(Boolean).length} / 7</b>

        <div>
          ${mins.map(m => `
            <span class="dot ${m ? 'on' : ''}"></span>
          `).join('')}
        </div>
      </div>

      <div class="card kpi">
        <span class="mut">Минут за неделю</span>
        <b>${mins.reduce((a, b) => a + b, 0)}</b>
      </div>
    </div>

    <section class="card">
      <div class="row sp">
        <div class="tabs">
          ${[
            ['words', 'Слова'],
            ['phrases', 'Фразы'],
            ['gram', 'Грамматика'],
            ['log', 'Занятия']
          ].map(([k, t]) => `
            <button
              class="btn ${et === k ? 'on' : ''}"
              data-c="eng.t"
              data-id="${k}"
            >
              ${t}
            </button>
          `).join('')}
        </div>

        <button class="btn pri" data-c="eng.add">
          + Добавить
        </button>
      </div>

      ${body}
    </section>
  `;
};

/* ===== Обработчики английского ===== */

H['eng.t'] = id => {
  et = id;
  R.eng();
};

H['eng.tg'] = (id, b) => {
  const w = find(S.eng[b.dataset.v], id);

  w.done = !w.done;

  save();
  R.eng();
};

H['eng.add'] = () =>
  et === 'gram'
    ? gramForm()
    : et === 'log'
      ? logForm()
      : itemForm(et);

H['eng.ed'] = (id, b) => {
  const k = b.dataset.v;

  if (k === 'gram') {
    gramForm(find(S.eng.gram, id));
  } else if (k === 'log') {
    logForm(find(S.eng.log, id));
  } else {
    itemForm(k, find(S.eng[k], id));
  }
};

H['eng.rm'] = (id, b) =>
  rm(S.eng[b.dataset.v], id, 'Удалить запись?');

/* ===== Формы английского ===== */

function itemForm(k, x) {
  const ph = k === 'words';

  form(
    x ? 'Изменить' : ph ? 'Новое слово' : 'Новая фраза',
    [
      {
        k: 'w',
        label: ph ? 'Слово' : 'Фраза',
        val: x?.w || ''
      },
      {
        k: 'tr',
        label: 'Перевод',
        val: x?.tr || ''
      },
      {
        k: 'ex',
        label: 'Пример или комментарий',
        type: 'textarea',
        val: x?.ex || ''
      }
    ],
    v => {
      if (!v.w.trim()) return false;

      const o = {
        w: v.w.trim(),
        tr: v.tr.trim(),
        ex: v.ex.trim()
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.eng[k].push({
          id: uid(),
          done: false,
          ...o
        });
      }

      save();
      R.eng();
    }
  );
}

function gramForm(x) {
  form(
    x ? 'Изменить тему' : 'Грамматическая тема',
    [
      {
        k: 'title',
        label: 'Тема',
        val: x?.title || ''
      },
      {
        k: 'text',
        label: 'Заметки и правила',
        type: 'textarea',
        val: x?.text || ''
      }
    ],
    v => {
      if (!v.title.trim()) return false;

      const o = {
        title: v.title.trim(),
        text: v.text.trim()
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.eng.gram.push({
          id: uid(),
          ...o
        });
      }

      save();
      R.eng();
    }
  );
}

function logForm(x) {
  form(
    x ? 'Изменить занятие' : 'Новое занятие',
    [
      {
        k: 'date',
        label: 'Дата',
        type: 'date',
        val: x?.date || today()
      },
      {
        k: 'min',
        label: 'Продолжительность, мин',
        type: 'number',
        val: x?.min || ''
      },
      {
        k: 'what',
        label: 'Что изучала',
        type: 'textarea',
        val: x?.what || ''
      }
    ],
    v => {
      const m = Math.round(parseFloat(v.min));

      if (!v.date || !(m > 0)) return false;

      const o = {
        date: v.date,
        min: m,
        what: v.what.trim()
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.eng.log.push({
          id: uid(),
          ...o
        });
      }

      save();
      R.eng();
    }
  );
}

/* ===== Книги ===== */

const SH = [
  ['want', 'Хочу прочитать'],
  ['now', 'Сейчас читаю'],
  ['done', 'Прочитано']
];

const bkCover = b => {
  const h = hue(b.title);

  const a = `
    class="bk"
    data-c="bk.open"
    data-id="${b.id}"
    title="${esc(b.title)}"
  `;

  return b.cover
    ? `
      <div
        ${a}
        style="background-image:url('${esc(b.cover)}')"
      ></div>
    `
    : `
      <div
        ${a}
        style="
          height:${116 + h % 28}px;
          background:linear-gradient(
            135deg,
            hsl(${h} 55% 84%),
            hsl(${(h + 50) % 360} 50% 72%)
          )
        "
      >
        <span>${esc(b.title)}</span>
        <small>${esc(b.author)}</small>
      </div>
    `;
};

R.books = () => {
  $('#pg').innerHTML = hd(
    'Книги',
    'Каждая книга — маленькая вселенная. Полки ждут новых историй 🌌'
  ) +

  `
    <div class="row sp" style="margin-bottom:14px">
      <span class="mut">
        Прочитано книг: ${S.books.filter(b => b.shelf === 'done').length}
      </span>

      <button class="btn pri" data-c="bk.add">
        + Книга
      </button>
    </div>

    <div class="case">
      ${SH.map(([k, t]) => {
        const l = S.books.filter(b => b.shelf === k);

        return `
          <div class="shelf">
            <h3>${t} · ${l.length}</h3>

            <div class="books">
              ${
                l.map(bkCover).join('') ||
                '<span class="mut" style="padding:50px 8px 0">Полка пока пуста</span>'
              }
            </div>

            <div class="plank"></div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

/* ===== Обработчики книг ===== */

H['bk.add'] = () => bookForm();

H['bk.open'] = id => bookCard(id);

function bookForm(b) {
  form(
    b ? 'Изменить книгу' : 'Новая книга',
    [
      {
        k: 'title',
        label: 'Название',
        val: b?.title || ''
      },
      {
        k: 'author',
        label: 'Автор',
        val: b?.author || ''
      },
      {
        k: 'shelf',
        label: 'Полка',
        type: 'select',
        val: b?.shelf || 'want',
        opts: SH
      },
      {
        k: 'cover',
        label: 'Обложка (файл с устройства)',
        type: 'file',
        val: ''
      },
      {
        k: 'start',
        label: 'Дата начала',
        type: 'date',
        val: b?.start || ''
      },
      {
        k: 'end',
        label: 'Дата прочтения',
        type: 'date',
        val: b?.end || ''
      },
      {
        k: 'notes',
        label: 'Заметки',
        type: 'textarea',
        val: b?.notes || ''
      }
    ],
    v => {
      if (!v.title.trim()) return false;

      const o = {
        title: v.title.trim(),
        author: v.author.trim(),
        shelf: v.shelf,
        start: v.start,
        end: v.end,
        notes: v.notes
      };

      if (o.shelf === 'now' && !o.start) {
        o.start = today();
      }

      if (o.shelf === 'done' && !o.end) {
        o.end = today();
      }

      shrink(v.cover).then(c => {
        if (b) {
          Object.assign(b, o);

          if (c) b.cover = c;
        } else {
          S.books.push({
            id: uid(),
            cover: c || '',
            ...o
          });
        }

        save();
        rr();
      });
    }
  );
}

function bookCard(id) {
  const b = find(S.books, id);
  const d = $('#dlg');

  if (!b) return;

  d.innerHTML = `
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:14px">
      <div style="flex:none">
        ${bkCover(b)}
      </div>

      <div style="min-width:0">
        <h3 style="margin:0;word-break:break-word">
          ${esc(b.title)}
        </h3>

        <div class="mut">
          ${esc(b.author || 'Автор не указан')}
        </div>

        <div class="mut" style="margin-top:6px">
          ${SH.find(s => s[0] === b.shelf)[1]}
          ${b.start ? '<br>Начала: ' + fd(b.start) : ''}
          ${b.end ? '<br>Дочитала: ' + fd(b.end) : ''}
        </div>
      </div>
    </div>

    <label class="mut" style="display:block;margin-top:12px">
      Заметки о книге

      <textarea id="bn" placeholder="Мысли, цитаты, впечатления…">${esc(b.notes || '')}</textarea>
    </label>

    <div class="chips">
      ${SH.filter(s => s[0] !== b.shelf).map(s => `
        <button class="btn" data-mv="${s[0]}">
          → ${s[1]}
        </button>
      `).join('')}
    </div>

    <div class="row sp">
      <span>
        <button class="btn" data-ed="1">✎ Изменить</button>
        <button class="btn" data-rmv="1">🗑 Удалить</button>
      </span>

      <button class="btn pri" data-cl="1">Закрыть</button>
    </div>
  `;

  d.onclick = e => {
    const x = e.target.closest('button');

    if (!x) return;

    const D = x.dataset;

    if (D.mv) {
      b.shelf = D.mv;

      if (D.mv === 'now' && !b.start) {
        b.start = today();
      }

      if (D.mv === 'done' && !b.end) {
        b.end = today();
      }

      save();
      d.close();
      rr();
    }

    if (D.ed) {
      bookForm(b);
    }

    if (D.rmv && confirm(`Удалить книгу «${b.title}»?`)) {
      S.books = S.books.filter(y => y !== b);

      save();
      d.close();
      rr();
    }

    if (D.cl) {
      d.close();
    }
  };

  $('#bn').oninput = e => {
    b.notes = e.target.value;
    save();
  };

  if (!d.open) d.showModal();
}

/* ===== Вишлист ===== */

R.wish = () => {
  const bal = total();

  $('#pg').innerHTML = hd(
    'Вишлист',
    'Мечты любят, когда их записывают. Копи ⭐ и дари себе красивое'
  ) +

  `
    <div class="card row sp" style="margin-bottom:16px">
      <span>
        Накоплено: <b>⭐ ${bal}</b>
      </span>

      <button class="btn pri" data-c="wish.add">
        + Желание
      </button>
    </div>
  ` +

  (
    S.wish.length
      ? `
        <div class="wg">
          ${S.wish.map(w => {
            const p = w.price > 0
              ? Math.min(100, Math.round(bal / w.price * 100))
              : 100;

            return `
              <div class="card wc" style="${w.done ? 'opacity:.75' : ''}">
                <div
                  class="im"
                  style="${w.img ? `background-image:url('${esc(w.img)}')` : ''}"
                >
                  ${w.img ? '' : '🎁'}
                </div>

                <div class="bd">
                  <b>
                    ${w.done ? '🎉 ' : ''}
                    ${esc(w.title)}
                  </b>

                  <div class="mut">
                    ⭐ ${w.price || 0} баллов
                    ${w.done ? ' · исполнено' : ''}
                  </div>

                  ${
                    w.done
                      ? ''
                      : `
                        <div class="bar" style="margin:6px 0">
                          <i style="width:${p}%"></i>
                        </div>
                      `
                  }

                  ${w.note ? `<div class="tn">${esc(w.note)}</div>` : ''}

                  <div class="row sp" style="margin-top:6px">
                    ${
                      w.link
                        ? `
                          <a
                            class="btn"
                            style="text-decoration:none"
                            href="${esc(w.link)}"
                            target="_blank"
                            rel="noopener"
                          >
                            🔗 Ссылка
                          </a>
                        `
                        : '<span></span>'
                    }

                    <span>
                      <button
                        class="ib"
                        data-c="wish.tg"
                        data-id="${w.id}"
                        title="${w.done ? 'Вернуть в желания' : 'Отметить исполненным'}"
                      >
                        ${w.done ? '↩️' : '✅'}
                      </button>

                      ${acts('wish', w.id)}
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `
      : `
        <div class="card empty">
          Пока нет желаний 🌠
          <br>
          Добавь первое, и пусть вселенная услышит
        </div>
      `
  );
};

/* ===== Обработчики вишлиста ===== */

H['wish.add'] = () => wishForm();

H['wish.ed'] = id =>
  wishForm(find(S.wish, id));

H['wish.rm'] = id =>
  rm(S.wish, id, 'Удалить желание?');

H['wish.tg'] = id => {
  const w = find(S.wish, id);

  w.done = !w.done;

  save();
  R.wish();

  if (w.done) {
    toast('Желание исполнено! 🎉');
  }
};

function wishForm(x) {
  form(
    x ? 'Изменить желание' : 'Новое желание',
    [
      {
        k: 'title',
        label: 'Название',
        val: x?.title || ''
      },
      {
        k: 'price',
        label: 'Цена в баллах',
        type: 'number',
        val: x?.price ?? ''
      },
      {
        k: 'link',
        label: 'Ссылка на покупку',
        val: x?.link || ''
      },
      {
        k: 'img',
        label: 'Изображение (файл с устройства)',
        type: 'file',
        val: ''
      },
      {
        k: 'note',
        label: 'Описание или комментарий',
        type: 'textarea',
        val: x?.note || ''
      }
    ],
    v => {
      if (!v.title.trim()) return false;

      const o = {
        title: v.title.trim(),
        price: Math.max(0, Math.round(parseFloat(v.price) || 0)),
        link: url(v.link),
        note: v.note.trim()
      };

      shrink(v.img, 480).then(c => {
        if (x) {
          Object.assign(x, o);

          if (c) x.img = c;
        } else {
          S.wish.push({
            id: uid(),
            img: c || '',
            done: false,
            ...o
          });
        }

        save();
        R.wish();
      });
    }
  );
}

/* ===== Идеи ===== */

let iq = '';

const ideaColors = [
  '#e58fb0',
  '#6fa8dc',
  '#7fb593',
  '#b57fe0',
  '#e5a65c',
  '#75bfc0',
  '#d58ca5',
  '#9990df'
];

const ideasList = () => {
  const q = iq.trim().toLowerCase();

  if (!S.ideaCategories.length) {
    return `
      <div class="empty">
        Создай свою первую категорию ✨
      </div>
    `;
  }

  return S.ideaCategories.map(cat => {
    const l = S.ideas.filter(x =>
      x.cat === cat.id &&
      (
        !q ||
        (x.title + ' ' + x.text + ' ' + x.tags.join(' '))
          .toLowerCase()
          .includes(q)
      )
    );

    return `
      <div class="card">
        <div class="row sp">
          <h2 style="color:${cat.color}">
            ${esc(cat.icon)} ${esc(cat.name)}
            <span class="mut">${l.length}</span>
          </h2>

          <button
            class="ib"
            data-c="idea.cat.rm"
            data-id="${cat.id}"
            title="Удалить категорию"
          >
            🗑️
          </button>
        </div>

        ${
          l.length
            ? l.map(x => `
                <div
                  class="idea ${x.done ? 'done' : ''}"
                  style="border-color:${cat.color}"
                >
                  <div class="row sp">
                    <b class="tt">${esc(x.title)}</b>

                    <span class="row" style="gap:0">
                      <button
                        class="ib"
                        data-c="idea.tg"
                        data-id="${x.id}"
                        title="Реализовано"
                      >
                        ${x.done ? '✅' : '⬜'}
                      </button>

                      ${acts('idea', x.id)}
                    </span>
                  </div>

                  ${x.text ? `<div class="tn">${esc(x.text)}</div>` : ''}

                  <div style="margin-top:4px">
                    ${x.tags.map(t => `
                      <button
                        class="tag"
                        data-c="idea.tag"
                        data-id="${esc(t)}"
                      >
                        #${esc(t)}
                      </button>
                    `).join('')}
                  </div>
                </div>
              `).join('')
            : `
              <div class="empty">
                ${q
                  ? 'Ничего не найдено'
                  : 'Идей пока нет. Самое время помечтать ✨'}
              </div>
            `
        }
      </div>
    `;
  }).join('');
};

R.ideas = () => {
  $('#pg').innerHTML = hd(
    'Идеи и заметки',
    'Пусть ни одна хорошая мысль не потеряется 🌠'
  ) +

  `
    <div class="row" style="margin-bottom:16px">
      <input
        id="iq"
        placeholder="🔍 Поиск по идеям и тегам"
        value="${esc(iq)}"
        style="flex:1;min-width:180px"
      >

      <button class="btn pri" data-c="idea.add">
        + Идея
      </button>

      <button class="btn" data-c="idea.cat.add">
        + Категория
      </button>
    </div>

    <div class="ig" id="ilist">
      ${ideasList()}
    </div>
  `;
};

/* ===== Обработчики идей ===== */

H['idea.cat.rm'] = id => {
  const cat = S.ideaCategories.find(x => x.id === id);

  if (!cat) return;

  if (!confirm(
    `Удалить категорию «${cat.name}»? Идеи из неё будут перенесены в другую категорию.`
  )) return;

  const next = S.ideaCategories.find(x => x.id !== id);

  if (next) {
    S.ideas.forEach(x => {
      if (x.cat === id) x.cat = next.id;
    });
  } else {
    S.ideas = S.ideas.filter(x => x.cat !== id);
  }

  S.ideaCategories = S.ideaCategories.filter(x => x.id !== id);

  save();
  R.ideas();

  toast('Категория удалена');
};

H['idea.cat.add'] = () => {
  form(
    'Новая категория',
    [
      {
        k: 'name',
        label: 'Название категории',
        val: ''
      },
      {
        k: 'icon',
        label: 'Выбери иконку',
        type: 'select',
        val: '💡',
        opts: [
          ['💡', '💡 Идея'],
          ['🎨', '🎨 Искусство'],
          ['🎬', '🎬 Видео'],
          ['📷', '📷 Фото'],
          ['🎵', '🎵 Музыка'],
          ['🎹', '🎹 Пианино'],
          ['🎸', '🎸 Гитара'],
          ['🎤', '🎤 Пение'],
          ['🎧', '🎧 Аудио'],
          ['🎮', '🎮 Игры'],
          ['💻', '💻 Компьютер'],
          ['📱', '📱 Телефон'],
          ['🌐', '🌐 Интернет'],
          ['🖥️', '🖥️ Разработка'],
          ['📚', '📚 Книги'],
          ['✍️', '✍️ Письмо'],
          ['📝', '📝 Заметки'],
          ['📖', '📖 Чтение'],
          ['🎓', '🎓 Учёба'],
          ['🔬', '🔬 Наука'],
          ['🧪', '🧪 Эксперименты'],
          ['🧵', '🧵 Рукоделие'],
          ['🧶', '🧶 Вязание'],
          ['🪡', '🪡 Шитьё'],
          ['🧩', '🧩 Пазлы'],
          ['🏠', '🏠 Дом'],
          ['🪴', '🪴 Растения'],
          ['🌸', '🌸 Цветы'],
          ['🌿', '🌿 Природа'],
          ['🐈', '🐈 Кошки'],
          ['🐕', '🐕 Собаки'],
          ['🍰', '🍰 Выпечка'],
          ['🍳', '🍳 Кулинария'],
          ['☕', '☕ Кофе'],
          ['🍓', '🍓 Еда'],
          ['✈️', '✈️ Путешествия'],
          ['🚗', '🚗 Авто'],
          ['🏕️', '🏕️ Отдых'],
          ['🏃', '🏃 Спорт'],
          ['🧘', '🧘 Йога'],
          ['💪', '💪 Фитнес'],
          ['🚴', '🚴 Велосипед'],
          ['💰', '💰 Финансы'],
          ['💼', '💼 Работа'],
          ['📈', '📈 Развитие'],
          ['🎯', '🎯 Цели'],
          ['⭐', '⭐ Избранное'],
          ['❤️', '❤️ Личное'],
          ['💜', '💜 Вдохновение'],
          ['🌈', '🌈 Творчество'],
          ['✨', '✨ Магия'],
          ['🔥', '🔥 Важно'],
          ['🎁', '🎁 Подарки'],
          ['🛍️', '🛍️ Покупки'],
          ['🧸', '🧸 Милое'],
          ['🌙', '🌙 Мечты'],
          ['☀️', '☀️ Настроение'],
          ['🦋', '🦋 Красота'],
          ['🐾', '🐾 Животные'],
          ['🎉', '🎉 События'],
          ['📅', '📅 Планы'],
          ['🗂️', '🗂️ Проекты'],
          ['🔧', '🔧 Мастерская'],
          ['🪄', '🪄 Другое']
        ]
      }
    ],
    v => {
      if (!v.name.trim() || !v.icon.trim()) return false;

      const color = ideaColors[
        S.ideaCategories.length % ideaColors.length
      ];

      S.ideaCategories.push({
        id: uid(),
        name: v.name.trim(),
        icon: v.icon.trim(),
        color
      });

      save();
      R.ideas();
    }
  );
};

H['idea.add'] = () => ideaForm();

H['idea.ed'] = id =>
  ideaForm(find(S.ideas, id));

H['idea.rm'] = id =>
  rm(S.ideas, id, 'Удалить идею?');

H['idea.tg'] = id => {
  const x = find(S.ideas, id);

  x.done = !x.done;

  save();

  $('#ilist').innerHTML = ideasList();
};

H['idea.tag'] = id => {
  iq = id;

  $('#iq').value = id;
  $('#ilist').innerHTML = ideasList();
};

function ideaForm(x) {
  form(
    x ? 'Изменить идею' : 'Новая идея',
    [
      {
        k: 'cat',
        label: 'Категория',
        type: 'select',
        val: x?.cat || S.ideaCategories[0]?.id || '',
        opts: S.ideaCategories.map(cat => [
          cat.id,
          cat.icon + ' ' + cat.name
        ])
      },
      {
        k: 'title',
        label: 'Название',
        val: x?.title || ''
      },
      {
        k: 'text',
        label: 'Подробное описание',
        type: 'textarea',
        val: x?.text || ''
      },
      {
        k: 'tags',
        label: 'Теги (через запятую)',
        val: x ? x.tags.join(', ') : ''
      }
    ],
    v => {
      if (!v.title.trim()) return false;

      const o = {
        cat: v.cat,
        title: v.title.trim(),
        text: v.text.trim(),

        tags: v.tags
          .split(',')
          .map(t => t.trim().replace(/^#/, ''))
          .filter(Boolean)
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.ideas.push({
          id: uid(),
          done: false,
          ...o
        });
      }

      save();
      R.ideas();
    }
  );
}

/* ===== Дневник достижений ===== */

let av = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
);

let as = today();

R.ach = () => {
  const first = (av.getDay() + 6) % 7;

  const n = new Date(
    av.getFullYear(),
    av.getMonth() + 1,
    0
  ).getDate();

  const t = today();
  const ym = dk(av).slice(0, 7);

  let c = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    .map(w => `<div class="wd">${w}</div>`)
    .join('') +
    '<div></div>'.repeat(first);

  for (let d = 1; d <= n; d++) {
    const k = `${ym}-${pad(d)}`;

    c += `
      <button
        class="day ${k === t ? 'today' : ''} ${k === as ? 'sel' : ''}"
        data-c="ach.d"
        data-id="${k}"
      >
        ${d}

        <span class="dots">
          ${S.ach.some(a => a.date === k) ? '<i></i>' : ''}
        </span>
      </button>
    `;
  }

  const day = S.ach.filter(a => a.date === as);

  $('#pg').innerHTML = hd(
    'Дневник достижений',
    'Здесь живут твои маленькие и большие победы. Ты молодец 💫'
  ) +

  `
    <div class="grid">
      <section class="card">
        <div class="row sp" style="margin-bottom:10px">
          <button class="ib" data-c="ach.m" data-id="-1">◀</button>

          <span class="mt">
            ${av.toLocaleDateString('ru-RU', {
              month: 'long',
              year: 'numeric'
            })}
          </span>

          <button class="ib" data-c="ach.m" data-id="1">▶</button>
        </div>

        <div class="cal">
          ${c}
        </div>

        <div class="row sp" style="margin-top:10px">
          <button class="btn" data-c="ach.t">
            Сегодня
          </button>

          <span class="mut">
            В этом месяце:
            ${S.ach.filter(a => a.date.startsWith(ym)).length}
            ✨
          </span>
        </div>
      </section>

      <section class="card">
        <div class="row sp">
          <h2 style="margin:0">${longDate(as)}</h2>

          <button class="btn pri" data-c="ach.add">
            + Достижение
          </button>
        </div>

        ${
          day.length
            ? day.map(a => `
                <div class="ach">
                  <div class="row sp">
                    <b>✨ ${esc(a.title)}</b>
                    <span>${acts('ach', a.id)}</span>
                  </div>

                  ${
                    a.text
                      ? `<div class="tn" style="color:var(--tx)">${esc(a.text)}</div>`
                      : ''
                  }
                </div>
              `).join('')
            : `
              <div class="empty">
                В этот день пока пусто. А ведь ты наверняка сделала что-то классное 🌟
              </div>
            `
        }
      </section>
    </div>
  `;
};

/* ===== Обработчики достижений ===== */

H['ach.m'] = n => {
  av.setMonth(av.getMonth() + +n);

  R.ach();
};

H['ach.t'] = () => {
  as = today();

  av = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  R.ach();
};

H['ach.d'] = id => {
  as = id;

  R.ach();
};

H['ach.add'] = () => achForm();

H['ach.ed'] = id =>
  achForm(find(S.ach, id));

H['ach.rm'] = id =>
  rm(S.ach, id, 'Удалить запись?');

function achForm(x) {
  form(
    x ? 'Изменить достижение' : 'Новое достижение ✨',
    [
      {
        k: 'title',
        label: 'Заголовок',
        val: x?.title || ''
      },
      {
        k: 'text',
        label: 'Подробное описание',
        type: 'textarea',
        val: x?.text || ''
      },
      {
        k: 'date',
        label: 'Дата',
        type: 'date',
        val: x?.date || as
      }
    ],
    v => {
      if (!v.title.trim() || !v.date) return false;

      const o = {
        title: v.title.trim(),
        text: v.text.trim(),
        date: v.date
      };

      if (x) {
        Object.assign(x, o);
      } else {
        S.ach.push({
          id: uid(),
          ...o
        });
      }

      as = v.date;

      const d = pd(as);

      av = new Date(
        d.getFullYear(),
        d.getMonth(),
        1
      );

      save();
      R.ach();
    }
  );
}

initDayOverview({
  getDate: () => sel,

  getTasks: date => dayTasks(date),

  getFocus: date => fmtDur(focusSec(date)),

  getHabits: () => S.habits,

  getNotes: date =>
    S.notes.filter(n => n.date === date),

  getPoints: date => dayPts(date)
});

/* ===== Запуск приложения ===== */

go(location.hash.slice(1));