
import './day-overview.styl';

export function initDayOverview({
  getDate,
  getTasks,
  getFocus,
  getHabits,
  getNotes,
  getPoints
}) {
  const dialog = document.querySelector('#dlg');
  const button = document.querySelector('#dayOverview');

  if (!dialog || !button) return;

  const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]
  );

  function open() {
    const date = getDate();
    const tasks = getTasks(date);
    const done = tasks.filter(t => t.done).length;

    const habits = getHabits();
    const completedHabits = habits.filter(
      h => h.log?.[date]
    ).length;

    const notes = getNotes(date);
    const focus = getFocus(date);
    const points = getPoints(date);

    const formattedDate = new Date(
      date + 'T12:00:00'
    ).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    dialog.innerHTML = `
      <div class="overview">

        <div class="overview__head">
          <div>
            <h2>Обзор дня</h2>
            <div class="overview__date">
              ${formattedDate}
            </div>
          </div>

          <button
            class="overview__close"
            type="button"
            data-overview-close
          >✕</button>
        </div>

        <div class="overview__stats">

          <div class="overview__item">
            <span>✓</span>
            <b>${done}/${tasks.length}</b>
            <small>Выполнено задач</small>
          </div>

          <div class="overview__item">
            <span>⏱</span>
            <b>${esc(focus)}</b>
            <small>Время фокуса</small>
          </div>

          <div class="overview__item">
            <span>🌿</span>
            <b>${completedHabits}/${habits.length}</b>
            <small>Привычки</small>
          </div>

          <div class="overview__item">
            <span>⭐</span>
            <b>+${points}</b>
            <small>Баллов за день</small>
          </div>

        </div>

        <div class="overview__notes">
          <h3>Заметки дня</h3>

          ${
            notes.length
              ? notes.map(n => `
                  <div class="overview__note">
                    ${esc(n.text)}
                  </div>
                `).join('')
              : `
                <div class="overview__empty">
                  Заметок на этот день нет
                </div>
              `
          }
        </div>

      </div>
    `;

    if (!dialog.open) dialog.showModal();
  }

  button.addEventListener('click', open);

  dialog.addEventListener('click', e => {
    if (e.target.closest('[data-overview-close]')) {
      dialog.close();
    }

    if (e.target === dialog) {
      dialog.close();
    }
  });
}
