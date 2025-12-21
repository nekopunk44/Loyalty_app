// Time-of-day "sky mood" shared between HomeScreen (renders the hero)
// and App.js header (uses sky.sky[0] as underlay so the curved header
// blends seamlessly into the hero gradient).

export function pad(n) { return n < 10 ? `0${n}` : `${n}`; }

export function fmtDuration(totalMin) {
  const h = Math.floor(Math.abs(totalMin) / 60);
  const m = Math.abs(totalMin) % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

// Marbella-ish reference: sunrise ~07:00, sunset ~20:30
export function getSkyMood(now = new Date()) {
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;
  const SUNRISE = 7 * 60;
  const SUNSET  = 20 * 60 + 30;

  if (mins >= 5 * 60 && mins < SUNRISE + 60) {
    const toDay = SUNRISE + 60 - mins;
    return {
      sky: ['#F4B58A', '#F8D49E', '#A4B5D9'],
      sun: '#FFD580', sunHalo: 'rgba(255,213,128,0.35)',
      sunX: 0.18, sunY: 0.62,
      stars: 0,
      text: '#2A1810', textDim: 'rgba(42,24,16,0.7)',
      phaseLabel: 'РАССВЕТ',
      greeting: 'Доброе утро',
      icon: 'wb-twilight',
      fact: `День набирает силу — через ${fmtDuration(toDay)} полное утро`,
    };
  }
  if (mins >= SUNRISE + 60 && mins < 12 * 60) {
    const toNoon = 12 * 60 - mins;
    return {
      sky: ['#7EC0E0', '#A9D8EF', '#E5F1F8'],
      sun: '#FFE375', sunHalo: 'rgba(255,227,117,0.35)',
      sunX: 0.62, sunY: 0.22,
      stars: 0,
      text: '#0E2A47', textDim: 'rgba(14,42,71,0.65)',
      phaseLabel: 'УТРО',
      greeting: 'Доброе утро',
      icon: 'wb-sunny',
      fact: `Идеальное время для бассейна — полдень через ${fmtDuration(toNoon)}`,
    };
  }
  if (mins >= 12 * 60 && mins < 17 * 60) {
    return {
      sky: ['#5CA9DA', '#8FCAE7', '#D6EAF5'],
      sun: '#FFF6B0', sunHalo: 'rgba(255,246,176,0.4)',
      sunX: 0.5, sunY: 0.16,
      stars: 0,
      text: '#0E2A47', textDim: 'rgba(14,42,71,0.65)',
      phaseLabel: 'ДЕНЬ',
      greeting: 'Добрый день',
      icon: 'wb-sunny',
      fact: 'На вилле — тихий час и тени у бассейна',
    };
  }
  if (mins >= 17 * 60 && mins < SUNSET) {
    const toSunset = SUNSET - mins;
    return {
      sky: ['#E96D4C', '#F0925A', '#F2C788'],
      sun: '#FFB347', sunHalo: 'rgba(255,179,71,0.45)',
      sunX: 0.78, sunY: 0.58,
      stars: 0,
      text: '#3A1408', textDim: 'rgba(58,20,8,0.75)',
      phaseLabel: 'ЗАКАТ',
      greeting: 'Добрый вечер',
      icon: 'wb-twilight',
      fact: `До заката ${fmtDuration(toSunset)} — лучшее время для террасы`,
    };
  }
  if (mins >= SUNSET && mins < 22 * 60) {
    return {
      sky: ['#3B2E5C', '#5B4080', '#8B5A9E'],
      sun: '#F5E1C6', sunHalo: 'rgba(245,225,198,0.25)',
      sunX: 0.22, sunY: 0.28,
      stars: 4,
      text: '#F5EFFF', textDim: 'rgba(245,239,255,0.7)',
      phaseLabel: 'СУМЕРКИ',
      greeting: 'Добрый вечер',
      icon: 'nights-stay',
      fact: 'Звёзды зажигаются над виллой',
    };
  }
  return {
    sky: ['#0A1230', '#142046', '#243266'],
    sun: '#E8E4F5', sunHalo: 'rgba(232,228,245,0.18)',
    sunX: 0.72, sunY: 0.22,
    stars: 9,
    text: '#E8EBFF', textDim: 'rgba(232,235,255,0.6)',
    phaseLabel: 'НОЧЬ',
    greeting: 'Доброй ночи',
    icon: 'nights-stay',
    fact: `Сейчас на вилле тишина · ${pad(h)}:${pad(m)}`,
  };
}

// Deterministic star positions so they don't jump between renders
export const STAR_POSITIONS = [
  { x: 0.12, y: 0.20, r: 1.2 }, { x: 0.28, y: 0.12, r: 0.9 },
  { x: 0.42, y: 0.30, r: 1.4 }, { x: 0.58, y: 0.10, r: 0.8 },
  { x: 0.66, y: 0.40, r: 1.0 }, { x: 0.82, y: 0.25, r: 1.3 },
  { x: 0.90, y: 0.55, r: 0.9 }, { x: 0.36, y: 0.55, r: 1.1 },
  { x: 0.50, y: 0.45, r: 0.8 },
];
