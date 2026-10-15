(function () {
  "use strict";

  const EXAM_SIZE = 20;
  const sectionRanges = [[1,12],[13,24],[25,34],[35,46],[47,58],[59,70],[71,80],[81,92],[93,104],[105,116]];

  function getShanghaiDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function displayDate(date) {
    const [year, month, day] = date.split("-");
    return `${year}年${Number(month)}月${Number(day)}日`;
  }

  function xmur3(text) {
    let h = 1779033703 ^ text.length;
    for (let i = 0; i < text.length; i += 1) {
      h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRandom(seedText) {
    return mulberry32(xmur3(seedText)());
  }

  function shuffled(list, random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function answerSnippet(answer) {
    const sentences = answer.split(/(?<=。)/).filter(Boolean);
    let text = "";
    for (const sentence of sentences) {
      if (text.length >= 42) break;
      text += sentence;
    }
    if (!text) text = answer;
    return text.length > 128 ? `${text.slice(0, 125)}…` : text;
  }

  function sectionFor(id, bank) {
    const lastId = bank.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    return sectionRanges.find(([start, end]) => id >= start && id <= end) || [1, lastId];
  }

  function buildOptions(question, bank, seedText) {
    const random = makeRandom(seedText);
    const [start, end] = sectionFor(question.id, bank);
    const pool = bank.filter((item) => item.id >= start && item.id <= end && item.id !== question.id);
    const wrong = shuffled(pool, random).slice(0, 3).map((item) => ({
      text: answerSnippet(item.answer), correct: false
    }));
    return shuffled([{ text: answerSnippet(question.answer), correct: true }, ...wrong], random);
  }

  function createPaper(teacher, date, bank = window.QUESTION_BANK) {
    const normalized = teacher.trim().toLocaleLowerCase("zh-CN");
    const seedText = `${normalized}|${date}|redbook-v1`;
    const random = makeRandom(seedText);
    return shuffled(bank, random).slice(0, EXAM_SIZE).map((question, index) => ({
      ...question,
      options: buildOptions(question, bank, `${seedText}|q${question.id}|${index}`)
    }));
  }

  function teacherHash(teacher) {
    return xmur3(teacher.trim().toLocaleLowerCase("zh-CN"))();
  }

  window.ExamEngine = { createPaper, displayDate, getShanghaiDate, teacherHash };
})();
