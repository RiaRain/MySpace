
import './habit-tracker.styl';
import template from './habit-tracker.pug';

export function openHabitTracker(habits) {
  let currentDate = new Date();
  currentDate.setDate(1);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = template.trim();

  const overlay = wrapper.firstElementChild;

  document.body.append(overlay);

  const content = overlay.querySelector('.ht-content');
  const monthTitle = overlay.querySelector('.ht-month');

  function render() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    monthTitle.textContent = new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric'
    }).format(currentDate);

    if (!habits.length) {
      content.innerHTML = '<div class="empty">Пока нет привычек</div>';
      return;
    }

    const header = Array.from(
      { length: days },
      (_, i) => `<th>${i + 1}</th>`
    ).join('');

    const rows = habits.map(habit => {
      const cells = Array.from({ length: days }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        const monthKey = String(month + 1).padStart(2, '0');
        const dateKey = `${year}-${monthKey}-${day}`;

        return `
          <td class="${habit.log?.[dateKey] ? 'ht-done' : ''}">
            ${habit.log?.[dateKey] ? '✓' : ''}
          </td>
        `;
      }).join('');

      return `
        <tr>
          <th class="ht-habit-name">
            ${habit.icon || ''} ${escapeHtml(habit.name)}
          </th>
          ${cells}
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <div class="ht-table-wrap">
        <table class="ht-table">
          <thead>
            <tr>
              <th class="ht-habit-name">Привычка</th>
              ${header}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  overlay.querySelector('.ht-prev').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  };

  overlay.querySelector('.ht-next').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  };

  function close() {
    overlay.close();
    overlay.remove();
  }

  overlay.querySelector('.ht-close').onclick = close;

  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });

  render();
  overlay.showModal();
}
