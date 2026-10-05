/**
 * 日本の祝日・振替休日・国民の休日 計算モジュール
 */
const JapaneseHolidays = (() => {
  // 春分の日・秋分の日の簡易天文計算（1980年〜2099年対応）
  function getVernalEquinoxDay(year) {
    if (year < 1980 || year > 2099) {
      // 近似値
      return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    }
    if (year <= 1979) return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    if (year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 20;
  }

  function getAutumnalEquinoxDay(year) {
    if (year < 1980 || year > 2099) {
      return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    }
    if (year <= 1979) return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    if (year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 23;
  }

  // 第N月曜日を求める関数（1-indexed）
  function getNthMonday(year, month, n) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    // 最初の月曜日までのオフセット
    const offset = (8 - firstDay) % 7;
    return 1 + offset + (n - 1) * 7;
  }

  // 指定年の祝日一覧を取得（キー: "YYYY-MM-DD"、値: 祝日名）
  function getHolidays(year) {
    const holidays = {};

    function addHoliday(m, d, name) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      holidays[`${year}-${mm}-${dd}`] = name;
    }

    // 1月
    addHoliday(1, 1, '元日');
    if (year >= 2000) {
      addHoliday(1, getNthMonday(year, 1, 2), '成人の日');
    } else {
      addHoliday(1, 15, '成人の日');
    }

    // 2月
    addHoliday(2, 11, '建国記念の日');
    if (year >= 2020) {
      addHoliday(2, 23, '天皇誕生日');
    }

    // 3月
    const vernalDay = getVernalEquinoxDay(year);
    addHoliday(3, vernalDay, '春分の日');

    // 4月
    addHoliday(4, 29, year >= 2007 ? '昭和の日' : (year >= 1989 ? 'みどりの日' : '天皇誕生日'));

    // 5月
    addHoliday(5, 3, '憲法記念日');
    addHoliday(5, 4, year >= 2007 ? 'みどりの日' : (year >= 1986 ? '国民の休日' : 'みどりの日'));
    addHoliday(5, 5, 'こどもの日');

    // 7月
    if (year === 2020) {
      addHoliday(7, 23, '海の日');
      addHoliday(7, 24, 'スポーツの日');
    } else if (year === 2021) {
      addHoliday(7, 22, '海の日');
      addHoliday(7, 23, 'スポーツの日');
    } else if (year >= 2003) {
      addHoliday(7, getNthMonday(year, 7, 3), '海の日');
    } else if (year >= 1996) {
      addHoliday(7, 20, '海の日');
    }

    // 8月
    if (year === 2020) {
      addHoliday(8, 10, '山の日');
    } else if (year === 2021) {
      addHoliday(8, 8, '山の日');
    } else if (year >= 2016) {
      addHoliday(8, 11, '山の日');
    }

    // 9月
    let respectForAgedDay;
    if (year >= 2003) {
      respectForAgedDay = getNthMonday(year, 9, 3);
      addHoliday(9, respectForAgedDay, '敬老の日');
    } else if (year >= 1966) {
      respectForAgedDay = 15;
      addHoliday(9, 15, '敬老の日');
    }

    const autumnDay = getAutumnalEquinoxDay(year);
    addHoliday(9, autumnDay, '秋分の日');

    // シルバーウィークの国民の休日判定（敬老の日と秋分の日の間の平日）
    if (respectForAgedDay && autumnDay === respectForAgedDay + 2) {
      addHoliday(9, respectForAgedDay + 1, '国民の休日');
    }

    // 10月
    if (year !== 2020 && year !== 2021) {
      if (year >= 2020) {
        addHoliday(10, getNthMonday(year, 10, 2), 'スポーツの日');
      } else if (year >= 2000) {
        addHoliday(10, getNthMonday(year, 10, 2), '体育の日');
      } else if (year >= 1966) {
        addHoliday(10, 10, '体育の日');
      }
    }

    // 11月
    addHoliday(11, 3, '文化の日');
    addHoliday(11, 23, '勤労感謝の日');

    // 12月
    if (year >= 1989 && year <= 2018) {
      addHoliday(12, 23, '天皇誕生日');
    }

    // 振替休日判定（祝日が日曜日の場合、その翌日以降の最も近い平日が振替休日）
    const sortedKeys = Object.keys(holidays).sort();
    sortedKeys.forEach(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (date.getDay() === 0) { // 日曜日
        let substitute = new Date(y, m - 1, d + 1);
        while (true) {
          const sStr = `${substitute.getFullYear()}-${String(substitute.getMonth() + 1).padStart(2, '0')}-${String(substitute.getDate()).padStart(2, '0')}`;
          if (!holidays[sStr]) {
            holidays[sStr] = '振替休日';
            break;
          }
          substitute.setDate(substitute.getDate() + 1);
        }
      }
    });

    return holidays;
  }

  return {
    getHolidays
  };
})();
