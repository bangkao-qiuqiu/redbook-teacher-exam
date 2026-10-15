(function () {
  "use strict";

  const bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  const list = document.getElementById("questionList");
  const search = document.getElementById("questionSearch");
  const count = document.getElementById("questionCount");
  const empty = document.getElementById("questionEmpty");

  function render(query) {
    const keyword = String(query || "").trim().toLocaleLowerCase("zh-CN");
    const questions = keyword
      ? bank.filter((item) => `${item.question} ${item.answer}`.toLocaleLowerCase("zh-CN").includes(keyword))
      : bank;

    const fragment = document.createDocumentFragment();
    questions.forEach((item) => {
      const details = document.createElement("details");
      details.className = "qa-item";

      const summary = document.createElement("summary");
      const number = document.createElement("span");
      number.className = "qa-number";
      number.textContent = `Q${item.id}`;
      summary.append(number, document.createTextNode(item.question));

      const answer = document.createElement("p");
      answer.className = "qa-answer";
      answer.textContent = item.answer;
      details.append(summary, answer);
      fragment.appendChild(details);
    });

    list.replaceChildren(fragment);
    count.textContent = keyword ? `找到${questions.length}题` : `共${questions.length}题`;
    empty.classList.toggle("hidden", questions.length > 0);
  }

  search.addEventListener("input", () => render(search.value));
  render("");
})();
