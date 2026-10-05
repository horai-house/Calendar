/**
 * 年間カレンダー (Annual Web Calendar) アプリケーションロジック
 */

(() => {
  // --- 状態管理 ---
  const state = {
    currentYear: new Date().getFullYear(),
    currentPeriod: new Date().getMonth() + 1 <= 6 ? 'first-half' : 'second-half', // 現在月で自動判定
    activeMobileMonth: new Date().getMonth() + 1,
    events: {}, // { "YYYY-MM-DD": { text: "...", color: "..." } }
    monthTasks: {}, // { "1": [ { text: "...", done: false } ], ... }
    holidays: {},
    activeColorTargetDate: null,
  };

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const STORAGE_KEY_PREFIX = 'annual_calendar_events_';
  const STORAGE_TASKS_PREFIX = 'annual_calendar_tasks_';

  // --- DOM要素 ---
  const yearDisplay = document.getElementById('year-display');
  const prevYearBtn = document.getElementById('prev-year-btn');
  const nextYearBtn = document.getElementById('next-year-btn');
  const todayBtn = document.getElementById('today-btn');
  const printBtn = document.getElementById('print-btn');
  const optionsToggleBtn = document.getElementById('options-toggle-btn');
  const printOptionsBar = document.getElementById('print-options-bar');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const monthTabsMobile = document.getElementById('month-tabs-mobile');
  const pageFirstHalf = document.getElementById('page-first-half');
  const pageSecondHalf = document.getElementById('page-second-half');
  const gridFirstHalf = document.getElementById('grid-first-half');
  const gridSecondHalf = document.getElementById('grid-second-half');
  const firstHalfHeading = document.getElementById('first-half-heading');
  const secondHalfHeading = document.getElementById('second-half-heading');
  const colorPopover = document.getElementById('color-popover');
  const backupBtn = document.getElementById('backup-btn');
  const backupModal = document.getElementById('backup-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const importFileInput = document.getElementById('import-file-input');
  const rowHeightRange = document.getElementById('row-height-range');
  const rowHeightVal = document.getElementById('row-height-val');
  const fontSizeRange = document.getElementById('font-size-range');
  const fontSizeVal = document.getElementById('font-size-val');
  const resetPrintOptBtn = document.getElementById('reset-print-opt-btn');

  // Firebase参照の取得
  let unsubscribeEvents = null;
  let unsubscribeTasks = null;

  // --- ストレージ操作（LocalStorage ＋ Firebase Firestore同期） ---
  function loadYearEvents(year) {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${year}`);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('LocalStorage load error:', e);
      return {};
    }
  }

  function saveYearEvents(year, events) {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${year}`, JSON.stringify(events));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    // Firebase同期
    if (window.db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      window.db.collection("events").doc(String(year)).set(events).catch(err => {
        console.error("Firestore save events error:", err);
      });
    }
  }

  function loadYearTasks(year) {
    try {
      const data = localStorage.getItem(`${STORAGE_TASKS_PREFIX}${year}`);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('LocalStorage tasks load error:', e);
      return {};
    }
  }

  function saveYearTasks(year, tasks) {
    try {
      localStorage.setItem(`${STORAGE_TASKS_PREFIX}${year}`, JSON.stringify(tasks));
    } catch (e) {
      console.error('LocalStorage tasks save error:', e);
    }

    // Firebase同期
    if (window.db && firebaseConfig.apiKey !== "YOUR_API_KEY") {
      window.db.collection("tasks").doc(String(year)).set(tasks).catch(err => {
        console.error("Firestore save tasks error:", err);
      });
    }
  }

  // --- Firebase リアルタイム受信登録 ---
  function subscribeFirebase(year) {
    if (!window.db || firebaseConfig.apiKey === "YOUR_API_KEY") return;

    // 前の購読を解除
    if (unsubscribeEvents) unsubscribeEvents();
    if (unsubscribeTasks) unsubscribeTasks();

    // 予定データのリアルタイム同期
    unsubscribeEvents = window.db.collection("events").doc(String(year))
      .onSnapshot((doc) => {
        if (doc.exists) {
          state.events = doc.data() || {};
          saveYearEvents(year, state.events); // ローカルにも保持
          renderAll();
        }
      }, (error) => {
        console.error("Firestore events sync error:", error);
      });

    // 未定タスクデータのリアルタイム同期
    unsubscribeTasks = window.db.collection("tasks").doc(String(year))
      .onSnapshot((doc) => {
        if (doc.exists) {
          state.monthTasks = doc.data() || {};
          saveYearTasks(year, state.monthTasks); // ローカルにも保持
          renderAll();
        }
      }, (error) => {
        console.error("Firestore tasks sync error:", error);
      });
  }

  // --- 初期化 ---
  function init() {
    state.events = loadYearEvents(state.currentYear);
    state.monthTasks = loadYearTasks(state.currentYear);
    state.holidays = JapaneseHolidays.getHolidays(state.currentYear);

    setupEventListeners();
    setupMobileMonthTabs();
    renderAll();
    subscribeFirebase(state.currentYear);

    // 起動直後に現在月を今日ボタンと同様の処理でスクロール
    const todayInput = document.getElementById(`input-${formatDateKey(state.currentYear, state.activeMobileMonth, new Date().getDate())}`);
    if (todayInput) {
      setTimeout(() => todayInput.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    }
  }

  // --- モバイル用月別タブ生成 ---
  function setupMobileMonthTabs() {
    monthTabsMobile.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('button');
      btn.className = `month-tab-btn ${m === state.activeMobileMonth ? 'active' : ''}`;
      btn.textContent = `${m}月`;
      btn.dataset.month = m;
      btn.addEventListener('click', () => {
        state.activeMobileMonth = m;
        // モバイル月タブのアクティブ更新
        document.querySelectorAll('.month-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 半期のタブ表示状態も同期
        if (m <= 6) {
          switchPeriod('first-half', false);
        } else {
          switchPeriod('second-half', false);
        }
        updateMobileColumnVisibility();
      });
      monthTabsMobile.appendChild(btn);
    }
  }

  function updateMobileColumnVisibility() {
    document.querySelectorAll('.month-column').forEach(col => {
      const m = parseInt(col.dataset.month, 10);
      if (m === state.activeMobileMonth) {
        col.classList.add('mobile-active');
      } else {
        col.classList.remove('mobile-active');
      }
    });
  }

  // --- 全体描画 ---
  function renderAll() {
    yearDisplay.textContent = `${state.currentYear}年`;
    firstHalfHeading.textContent = `${state.currentYear}年 上半期 (1月 〜 6月)`;
    secondHalfHeading.textContent = `${state.currentYear}年 下半期 (7月 〜 12月)`;

    gridFirstHalf.innerHTML = '';
    gridSecondHalf.innerHTML = '';

    // 1月〜6月
    for (let m = 1; m <= 6; m++) {
      const col = createMonthColumn(state.currentYear, m);
      gridFirstHalf.appendChild(col);
    }

    // 7月〜12月
    for (let m = 7; m <= 12; m++) {
      const col = createMonthColumn(state.currentYear, m);
      gridSecondHalf.appendChild(col);
    }

    applyPeriodVisibility();
    updateMobileColumnVisibility();
  }

  // --- 1ヶ月分のカラム要素を作成 ---
  function createMonthColumn(year, month) {
    const col = document.createElement('div');
    col.className = 'month-column';
    col.dataset.month = month;

    // 1. 月ヘッダー
    const header = document.createElement('div');
    header.className = `month-header m-color-${month}`;
    header.textContent = `${month}月`;
    col.appendChild(header);

    // 2. 上部ミニカレンダー
    const miniCal = createMiniCalendar(year, month);
    col.appendChild(miniCal);

    // 2.5 未定・月間予定（タスク）欄
    const monthTasks = createMonthTasksSection(year, month);
    col.appendChild(monthTasks);

    // 4. 予定リストテーブル
    const eventsTable = createEventsTable(year, month);
    col.appendChild(eventsTable);

    return col;
  }

  // --- 未定・月間予定（タスク）セクション生成 ---
  function createMonthTasksSection(year, month) {
    const container = document.createElement('div');
    container.className = 'month-tasks-section';

    const header = document.createElement('div');
    header.className = 'month-tasks-header';
    header.innerHTML = `<span>未定・今月の予定</span>`;
    container.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.className = 'month-tasks-list';
    listContainer.id = `tasks-list-${year}-${month}`;
    container.appendChild(listContainer);

    // データの読み込み
    let tasks = state.monthTasks[month];
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      tasks = [{ text: '', done: false }];
    } else {
      // 最後の要素が空文字でなければ、1行空行を追加
      const last = tasks[tasks.length - 1];
      if (last && last.text.trim() !== '') {
        tasks.push({ text: '', done: false });
      }
    }
    state.monthTasks[month] = tasks;

    // 行の再描画関数
    function renderTasks() {
      listContainer.innerHTML = '';
      const currentTasks = state.monthTasks[month] || [{ text: '', done: false }];

      currentTasks.forEach((task, index) => {
        const row = document.createElement('div');
        row.className = 'month-task-row';
        if (!task.text || task.text.trim() === '') {
          row.classList.add('empty-print-hidden');
        }

        // チェックボックス
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'month-task-checkbox';
        checkbox.checked = !!task.done;
        checkbox.title = '完了マーク';
        checkbox.addEventListener('change', () => {
          task.done = checkbox.checked;
          if (task.done) {
            input.classList.add('completed');
          } else {
            input.classList.remove('completed');
          }
          saveYearTasks(year, state.monthTasks);
        });

        // テキスト入力
        const input = document.createElement('input');
        input.type = 'text';
        input.className = `month-task-input ${task.done ? 'completed' : ''}`;
        input.value = task.text || '';
        input.placeholder = index === 0 && currentTasks.length === 1 ? '未定予定・タスク...' : '';
        input.dataset.index = index;

        // 入力時の処理（末尾入力で次行を自動追加）
        input.addEventListener('input', (e) => {
          task.text = e.target.value;
          if (task.text.trim() !== '') {
            row.classList.remove('empty-print-hidden');
            // もし最後の行に入力したら、自動で次の空行を1行追加
            if (index === currentTasks.length - 1) {
              currentTasks.push({ text: '', done: false });
              saveYearTasks(year, state.monthTasks);
              renderTasks();
              // フォーカスを現在の行に戻す
              const inputs = listContainer.querySelectorAll('.month-task-input');
              if (inputs[index]) {
                inputs[index].focus();
                // カーソルを末尾に
                const len = inputs[index].value.length;
                inputs[index].setSelectionRange(len, len);
              }
              return;
            }
          } else {
            row.classList.add('empty-print-hidden');
          }
          saveYearTasks(year, state.monthTasks);
        });

        // Enterキー / Backspaceキー 操作
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = listContainer.querySelectorAll('.month-task-input');
            if (index + 1 < inputs.length) {
              inputs[index + 1].focus();
            } else {
              // 新規行追加
              currentTasks.push({ text: '', done: false });
              saveYearTasks(year, state.monthTasks);
              renderTasks();
              const newInputs = listContainer.querySelectorAll('.month-task-input');
              if (newInputs[index + 1]) newInputs[index + 1].focus();
            }
          } else if (e.key === 'Backspace' && e.target.value === '' && currentTasks.length > 1) {
            e.preventDefault();
            currentTasks.splice(index, 1);
            saveYearTasks(year, state.monthTasks);
            renderTasks();
            const inputs = listContainer.querySelectorAll('.month-task-input');
            const targetIdx = Math.max(0, index - 1);
            if (inputs[targetIdx]) {
              inputs[targetIdx].focus();
              const len = inputs[targetIdx].value.length;
              inputs[targetIdx].setSelectionRange(len, len);
            }
          }
        });

        // 削除ボタン（×）
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'month-task-del-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = '削除';
        delBtn.addEventListener('click', () => {
          if (currentTasks.length <= 1) {
            currentTasks[0] = { text: '', done: false };
          } else {
            currentTasks.splice(index, 1);
          }
          saveYearTasks(year, state.monthTasks);
          renderTasks();
        });

        row.appendChild(checkbox);
        row.appendChild(input);
        row.appendChild(delBtn);
        listContainer.appendChild(row);
      });
    }

    renderTasks();
    return container;
  }

  // --- ミニカレンダー生成 ---
  function createMiniCalendar(year, month) {
    const container = document.createElement('div');
    container.className = 'mini-calendar';
    container.id = `mini-cal-${year}-${month}`;

    const table = document.createElement('table');
    table.className = 'mini-cal-table';

    // 曜日ヘッダー
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    WEEKDAYS.forEach((w, idx) => {
      const th = document.createElement('th');
      th.textContent = w;
      if (idx === 0) th.className = 'sun';
      if (idx === 6) th.className = 'sat';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 日付グリッド (6行 × 7列 = 42マス)
    const tbody = document.createElement('tbody');
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    let dayCounter = 1;
    let nextMonthCounter = 1;

    const today = new Date();
    const isCurrentYear = today.getFullYear() === year;
    const isCurrentMonth = today.getMonth() + 1 === month;
    const todayDate = today.getDate();

    for (let r = 0; r < 6; r++) {
      const row = document.createElement('tr');
      for (let c = 0; c < 7; c++) {
        const td = document.createElement('td');
        const cellIndex = r * 7 + c;

        if (cellIndex < firstDayIndex) {
          // 前月の日付
          const prevDate = prevMonthDays - (firstDayIndex - cellIndex - 1);
          td.textContent = prevDate;
          td.className = 'other-month';
        } else if (dayCounter <= daysInMonth) {
          // 当月の日付
          const d = dayCounter;
          const dateStr = formatDateKey(year, month, d);
          td.textContent = d;
          td.dataset.date = dateStr;

          // 曜日/祝日スタイル
          if (c === 0) td.classList.add('sun');
          if (c === 6) td.classList.add('sat');
          if (state.holidays[dateStr]) {
            td.classList.add('holiday');
            td.title = state.holidays[dateStr];
          }

          // 今日の強調
          if (isCurrentYear && isCurrentMonth && d === todayDate) {
            td.classList.add('today');
          }

          // 予定の有無とドットインジケーター
          const eventInfo = state.events[dateStr];
          if (eventInfo && eventInfo.text && eventInfo.text.trim() !== '') {
            td.classList.add('has-event');
            const dot = document.createElement('span');
            dot.className = `event-dot ${eventInfo.color ? 'tag-' + eventInfo.color : ''}`;
            td.appendChild(dot);
            td.title = `${state.holidays[dateStr] ? state.holidays[dateStr] + ' / ' : ''}${eventInfo.text}`;
          }

          // ミニカレンダーの日付をクリックしたら、下段のその日の入力欄へフォーカス移動
          td.addEventListener('click', () => {
            const inputEl = document.getElementById(`input-${dateStr}`);
            if (inputEl) {
              inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              inputEl.focus();
            }
          });

          dayCounter++;
        } else {
          // 翌月の日付
          td.textContent = nextMonthCounter++;
          td.className = 'other-month';
        }

        row.appendChild(td);
      }
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);
    return container;
  }

  // --- 予定入力テーブル生成 ---
  function createEventsTable(year, month) {
    const table = document.createElement('table');
    table.className = 'events-table';

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateKey(year, month, d);
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      const holidayName = state.holidays[dateStr];

      const tr = document.createElement('tr');
      tr.className = 'event-row';
      tr.id = `row-${dateStr}`;

      // 土・日・祝日クラス
      if (dayOfWeek === 0) tr.classList.add('sun');
      if (dayOfWeek === 6) tr.classList.add('sat');
      if (holidayName) tr.classList.add('holiday');

      // 予定データ取得
      const eventData = state.events[dateStr] || { text: '', color: '' };
      if (eventData.color) {
        tr.classList.add(`event-highlight-${eventData.color}`);
      }

      // 日付・曜日セル
      const tdDate = document.createElement('td');
      tdDate.className = 'col-date';
      tdDate.textContent = `${d} (${WEEKDAYS[dayOfWeek]})`;
      if (holidayName) {
        tdDate.title = holidayName;
      }
      tr.appendChild(tdDate);

      // 予定入力欄セル
      const tdInput = document.createElement('td');
      tdInput.className = 'col-input';

      const wrapper = document.createElement('div');
      wrapper.className = 'event-input-wrapper';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'event-input';
      input.id = `input-${dateStr}`;
      input.value = eventData.text || '';
      input.dataset.date = dateStr;
      input.dataset.month = month;
      input.dataset.day = d;

      // 祝日バッジ（祝日なら表示）
      if (holidayName) {
        const holidayPill = document.createElement('span');
        holidayPill.className = 'holiday-pill';
        holidayPill.textContent = holidayName;
        wrapper.appendChild(holidayPill);
      }

      // カラータグ選択ボタン
      const colorBtn = document.createElement('button');
      colorBtn.type = 'button';
      colorBtn.className = `color-tag-btn ${eventData.color ? 'has-color tag-' + eventData.color : ''}`;
      colorBtn.title = '予定のラベル色を選択';
      colorBtn.dataset.date = dateStr;
      colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openColorPopover(e.currentTarget, dateStr);
      });

      // 入力時のリアルタイム保存＆ミニカレンダー連動
      input.addEventListener('input', (e) => {
        handleInputChange(dateStr, e.target.value);
      });

      // Excelライクなキーボード操作（Enter/上下キー/左右キー）
      input.addEventListener('keydown', (e) => {
        handleKeyNavigation(e, year, month, d, daysInMonth);
      });

      wrapper.appendChild(input);
      wrapper.appendChild(colorBtn);
      tdInput.appendChild(wrapper);
      tr.appendChild(tdInput);

      table.appendChild(tr);
    }

    return table;
  }

  // --- キーボードナビゲーション（Excel風） ---
  function handleKeyNavigation(e, year, month, day, daysInMonth) {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      if (e.key === 'Enter') e.preventDefault();
      // 次の日へ移動
      if (day < daysInMonth) {
        const nextInput = document.getElementById(`input-${formatDateKey(year, month, day + 1)}`);
        if (nextInput) nextInput.focus();
      } else if (month < 12) {
        // 月末なら次月の1日へ
        const nextMonthInput = document.getElementById(`input-${formatDateKey(year, month + 1, 1)}`);
        if (nextMonthInput) nextMonthInput.focus();
      }
    } else if (e.key === 'ArrowUp') {
      // 前の日へ移動
      if (day > 1) {
        const prevInput = document.getElementById(`input-${formatDateKey(year, month, day - 1)}`);
        if (prevInput) prevInput.focus();
      } else if (month > 1) {
        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        const prevMonthInput = document.getElementById(`input-${formatDateKey(year, month - 1, prevMonthLastDay)}`);
        if (prevMonthInput) prevMonthInput.focus();
      }
    } else if (e.key === 'ArrowRight' && (e.target.selectionStart === e.target.value.length || e.altKey)) {
      // 右の月へ移動
      if (month < 12) {
        const targetDays = new Date(year, month, 0).getDate();
        const targetDay = Math.min(day, targetDays);
        const nextColInput = document.getElementById(`input-${formatDateKey(year, month + 1, targetDay)}`);
        if (nextColInput) nextColInput.focus();
      }
    } else if (e.key === 'ArrowLeft' && (e.target.selectionStart === 0 || e.altKey)) {
      // 左の月へ移動
      if (month > 1) {
        const targetDays = new Date(year, month - 2, 0).getDate();
        const targetDay = Math.min(day, targetDays);
        const prevColInput = document.getElementById(`input-${formatDateKey(year, month - 1, targetDay)}`);
        if (prevColInput) prevColInput.focus();
      }
    }
  }

  // --- 入力値変更時の保存と連動 ---
  function handleInputChange(dateStr, text) {
    if (!state.events[dateStr]) {
      state.events[dateStr] = { text: '', color: '' };
    }
    state.events[dateStr].text = text;

    // 空白の場合はクリーンアップ
    if (!text && !state.events[dateStr].color) {
      delete state.events[dateStr];
    }

    saveYearEvents(state.currentYear, state.events);
    updateMiniCalendarCell(dateStr);
  }

  // --- ミニカレンダー単一セルの強調更新 ---
  function updateMiniCalendarCell(dateStr) {
    const td = document.querySelector(`.mini-cal-table td[data-date="${dateStr}"]`);
    if (!td) return;

    const eventData = state.events[dateStr];
    const holidayName = state.holidays[dateStr];

    // ドットを一旦削除
    const oldDot = td.querySelector('.event-dot');
    if (oldDot) oldDot.remove();

    if (eventData && eventData.text && eventData.text.trim() !== '') {
      td.classList.add('has-event');
      const dot = document.createElement('span');
      dot.className = `event-dot ${eventData.color ? 'tag-' + eventData.color : ''}`;
      td.appendChild(dot);
      td.title = `${holidayName ? holidayName + ' / ' : ''}${eventData.text}`;
    } else {
      td.classList.remove('has-event');
      td.title = holidayName || '';
    }
  }

  // --- カラーピッカー関連 ---
  function openColorPopover(triggerBtn, dateStr) {
    state.activeColorTargetDate = dateStr;
    const rect = triggerBtn.getBoundingClientRect();
    colorPopover.style.display = 'flex';
    colorPopover.style.top = `${rect.bottom + window.scrollY + 4}px`;
    colorPopover.style.left = `${Math.min(rect.left + window.scrollX - 40, window.innerWidth - 160)}px`;
  }

  function applyColorToDate(color) {
    const dateStr = state.activeColorTargetDate;
    if (!dateStr) return;

    if (!state.events[dateStr]) {
      state.events[dateStr] = { text: '', color: '' };
    }
    state.events[dateStr].color = color;

    if (!color && !state.events[dateStr].text) {
      delete state.events[dateStr];
    }

    saveYearEvents(state.currentYear, state.events);

    // 行とボタンのスタイル更新
    const row = document.getElementById(`row-${dateStr}`);
    if (row) {
      // 既存のハイライト色クラスを全削除
      ['blue', 'green', 'orange', 'red', 'purple'].forEach(c => {
        row.classList.remove(`event-highlight-${c}`);
      });
      if (color) {
        row.classList.add(`event-highlight-${color}`);
      }

      const colorBtn = row.querySelector('.color-tag-btn');
      if (colorBtn) {
        colorBtn.className = `color-tag-btn ${color ? 'has-color tag-' + color : ''}`;
      }
    }

    // 上部ミニカレンダーのドット色を即時反映
    updateMiniCalendarCell(dateStr);

    colorPopover.style.display = 'none';
  }

  // --- 期間（上半期 / 下半期 / 通年）の表示切替 ---
  function switchPeriod(period, updateTabs = true) {
    state.currentPeriod = period;

    if (updateTabs) {
      tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
      });
    }

    applyPeriodVisibility();
  }

  function applyPeriodVisibility() {
    if (state.currentPeriod === 'first-half') {
      pageFirstHalf.style.display = 'block';
      pageSecondHalf.style.display = 'none';
      pageFirstHalf.classList.remove('print-hidden');
      pageSecondHalf.classList.add('print-hidden');
    } else if (state.currentPeriod === 'second-half') {
      pageFirstHalf.style.display = 'none';
      pageSecondHalf.style.display = 'block';
      pageFirstHalf.classList.add('print-hidden');
      pageSecondHalf.classList.remove('print-hidden');
    } else {
      // 通年
      pageFirstHalf.style.display = 'block';
      pageSecondHalf.style.display = 'block';
      pageFirstHalf.classList.remove('print-hidden');
      pageSecondHalf.classList.remove('print-hidden');
    }
  }

  // --- 年の切り替え ---
  function changeYear(newYear) {
    if (newYear === state.currentYear) return;
    state.currentYear = newYear;
    state.events = loadYearEvents(newYear);
    state.monthTasks = loadYearTasks(newYear);
    state.holidays = JapaneseHolidays.getHolidays(newYear);
    renderAll();
    subscribeFirebase(newYear);
  }

  // --- イベントリスナー設定 ---
  function setupEventListeners() {
    // 年切り替えボタン
    prevYearBtn.addEventListener('click', () => changeYear(state.currentYear - 1));
    nextYearBtn.addEventListener('click', () => changeYear(state.currentYear + 1));
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      changeYear(now.getFullYear());
      const currentMonth = now.getMonth() + 1;
      if (currentMonth <= 6) {
        switchPeriod('first-half');
      } else {
        switchPeriod('second-half');
      }
    });

    // 期間切り替えタブ
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchPeriod(btn.dataset.period);
      });
    });

    // 印刷調整パネルトグル
    optionsToggleBtn.addEventListener('click', () => {
      printOptionsBar.classList.toggle('show');
    });

    // 印刷微調整コントロール
    rowHeightRange.addEventListener('input', (e) => {
      const val = e.target.value;
      rowHeightVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--row-height', `${val}px`);
    });

    fontSizeRange.addEventListener('input', (e) => {
      const val = e.target.value;
      fontSizeVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--cell-font-size', `${val}px`);
    });

    resetPrintOptBtn.addEventListener('click', () => {
      rowHeightRange.value = 23;
      rowHeightVal.textContent = '23px';
      document.documentElement.style.setProperty('--row-height', '23px');

      fontSizeRange.value = 11;
      fontSizeVal.textContent = '11px';
      document.documentElement.style.setProperty('--cell-font-size', '11px');
    });

    // 印刷ボタン
    printBtn.addEventListener('click', () => {
      const printTarget = document.querySelector('input[name="print-target"]:checked').value;
      if (printTarget === 'both') {
        pageFirstHalf.classList.remove('print-hidden');
        pageSecondHalf.classList.remove('print-hidden');
      } else {
        applyPeriodVisibility();
      }
      window.print();
    });

    // カラーパレット選択
    colorPopover.querySelectorAll('.color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        applyColorToDate(opt.dataset.color);
      });
    });

    // カラーパレット以外をクリックで閉じる
    document.addEventListener('click', (e) => {
      if (!colorPopover.contains(e.target) && !e.target.classList.contains('color-tag-btn')) {
        colorPopover.style.display = 'none';
      }
    });

    // バックアップモーダル制御
    backupBtn.addEventListener('click', () => backupModal.classList.add('open'));
    modalCloseBtn.addEventListener('click', () => backupModal.classList.remove('open'));
    modalCancelBtn.addEventListener('click', () => backupModal.classList.remove('open'));
    backupModal.addEventListener('click', (e) => {
      if (e.target === backupModal) backupModal.classList.remove('open');
    });

    // JSONエクスポート
    exportJsonBtn.addEventListener('click', () => {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_TASKS_PREFIX)) {
          allData[key] = JSON.parse(localStorage.getItem(key));
        }
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      downloadFile(blob, `calendar_backup_${state.currentYear}.json`);
    });

    // CSVエクスポート
    exportCsvBtn.addEventListener('click', () => {
      let csvContent = '\uFEFF日付,曜日,祝日,予定,カラー\n';
      for (let m = 1; m <= 12; m++) {
        const days = new Date(state.currentYear, m, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const dateStr = formatDateKey(state.currentYear, m, d);
          const w = WEEKDAYS[new Date(state.currentYear, m - 1, d).getDay()];
          const holiday = state.holidays[dateStr] || '';
          const evt = state.events[dateStr] || { text: '', color: '' };
          const safeText = `"${(evt.text || '').replace(/"/g, '""')}"`;
          csvContent += `${dateStr},${w},${holiday},${safeText},${evt.color || ''}\n`;
        }
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadFile(blob, `calendar_${state.currentYear}.csv`);
    });

    // JSONインポート
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          Object.keys(data).forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_TASKS_PREFIX)) {
              localStorage.setItem(key, JSON.stringify(data[key]));
            }
          });
          alert('データを正常に復元しました！');
          backupModal.classList.remove('open');
          state.events = loadYearEvents(state.currentYear);
          state.monthTasks = loadYearTasks(state.currentYear);
          renderAll();
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
        }
      };
      reader.readAsText(file);
    });
  }

  // --- ユーティリティ ---
  function formatDateKey(year, month, day) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 起動実行
  document.addEventListener('DOMContentLoaded', init);
})();
