const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {}, Intl, Date, Math };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "assets/questions.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "assets/engine.js"), "utf8"), sandbox);

const bank = sandbox.window.QUESTION_BANK;
const { createPaper } = sandbox.window.ExamEngine;

assert.equal(bank.length, 116);
assert.deepEqual(Array.from(bank, (item) => item.id), Array.from({ length: 116 }, (_, index) => index + 1));

const paperA1 = createPaper("张老师", "2026-10-15", bank);
const paperA2 = createPaper("张老师", "2026-10-15", bank);
const paperB = createPaper("李老师", "2026-10-15", bank);
const paperTomorrow = createPaper("张老师", "2026-10-16", bank);

const signature = (paper) => paper.map((item) => `${item.id}:${item.options.map((option) => option.text).join("|")}`).join(";");
assert.equal(signature(paperA1), signature(paperA2), "同一老师同一天必须得到同一套题");
assert.notEqual(signature(paperA1), signature(paperB), "不同老师应得到不同试卷");
assert.notEqual(signature(paperA1), signature(paperTomorrow), "第二天应自动换题");

for (const name of ["张老师", "李老师", "王老师", "赵老师", "陈老师"]) {
  const paper = createPaper(name, "2026-10-15", bank);
  assert.equal(paper.length, 20);
  assert.equal(new Set(paper.map((item) => item.id)).size, 20, "试卷中不能重复出题");
  paper.forEach((item) => {
    assert.equal(item.options.length, 4);
    assert.equal(item.options.filter((option) => option.correct).length, 1);
  });
}

const sampledIds = new Set();
for (let day = 15; day <= 25; day += 1) {
  createPaper("题库覆盖测试", `2026-10-${day}`, bank).forEach((item) => sampledIds.add(item.id));
}
assert([...sampledIds].some((id) => id > 100), "Q101-Q116必须参与每日随机抽题");

console.log("Smoke checks passed: 116-question bank, daily refresh, unique teacher papers, 20 unique questions, 4 options each.");
