(function () {
  "use strict";

  const EXAM_SIZE = 20;
  const PASS_SCORE = 80;
  const optionLetters = ["A", "B", "C", "D"];
  const { createPaper, displayDate, getShanghaiDate, teacherHash } = window.ExamEngine;

  const $ = (id) => document.getElementById(id);
  const screens = {
    welcome: $("welcomeScreen"),
    exam: $("examScreen"),
    result: $("resultScreen")
  };

  const state = {
    teacher: "",
    date: getShanghaiDate(),
    questions: [],
    answers: Array(EXAM_SIZE).fill(null),
    current: 0,
    startedAt: null,
    result: null
  };

  function switchScreen(name) {
    Object.entries(screens).forEach(([key, element]) => element.classList.toggle("hidden", key !== name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuestion() {
    const question = state.questions[state.current];
    $("questionNumber").textContent = `第 ${state.current + 1} 题`;
    $("questionText").textContent = question.question;
    $("optionList").replaceChildren();

    question.options.forEach((option, optionIndex) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.setAttribute("role", "radio");
      optionButton.className = `option-item${state.answers[state.current] === optionIndex ? " selected" : ""}`;
      optionButton.setAttribute("aria-checked", String(state.answers[state.current] === optionIndex));
      optionButton.addEventListener("click", () => selectAnswer(optionIndex));

      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = optionLetters[optionIndex];

      const text = document.createElement("span");
      text.className = "option-text";
      text.textContent = option.text;

      optionButton.append(letter, text);
      $("optionList").appendChild(optionButton);
    });

    $("prevButton").disabled = state.current === 0;
    $("nextButton").textContent = state.current === EXAM_SIZE - 1 ? "提交试卷" : "下一题";
    renderProgress();
  }

  function renderProgress() {
    const answered = state.answers.filter((answer) => answer !== null).length;
    $("answeredCount").textContent = answered;
    $("progressBar").style.width = `${(answered / EXAM_SIZE) * 100}%`;
    $("questionDots").replaceChildren();
    state.questions.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "question-dot";
      dot.classList.toggle("answered", state.answers[index] !== null);
      dot.classList.toggle("current", state.current === index);
      dot.title = `第${index + 1}题`;
      dot.addEventListener("click", () => { state.current = index; renderQuestion(); });
      $("questionDots").appendChild(dot);
    });
  }

  function selectAnswer(optionIndex) {
    state.answers[state.current] = optionIndex;
    document.querySelectorAll(".option-item").forEach((item, index) => {
      item.classList.toggle("selected", index === optionIndex);
      item.setAttribute("aria-checked", String(index === optionIndex));
    });
    renderProgress();
  }

  function startExam(teacher) {
    state.teacher = teacher.trim();
    state.date = getShanghaiDate();
    state.questions = createPaper(state.teacher, state.date);
    state.answers = Array(EXAM_SIZE).fill(null);
    state.current = 0;
    state.startedAt = Date.now();
    $("examTeacher").textContent = state.teacher;
    switchScreen("exam");
    renderQuestion();
  }

  function moveNext() {
    if (state.current < EXAM_SIZE - 1) {
      state.current += 1;
      renderQuestion();
      return;
    }
    submitExam();
  }

  async function submitExam() {
    const unanswered = state.answers.filter((answer) => answer === null).length;
    if (unanswered > 0) {
      const first = state.answers.findIndex((answer) => answer === null);
      const shouldJump = window.confirm(`还有 ${unanswered} 道题未作答，是否返回补充？`);
      if (shouldJump) { state.current = first; renderQuestion(); }
      return;
    }

    const details = state.questions.map((question, index) => {
      const selectedIndex = state.answers[index];
      return {
        questionId: question.id,
        selectedIndex,
        correct: question.options[selectedIndex].correct
      };
    });
    const correct = details.filter((item) => item.correct).length;
    const score = correct * 5;
    const duration = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      teacher_name: state.teacher,
      exam_date: state.date,
      paper_id: `${state.date}-${teacherHash(state.teacher)}`,
      score,
      correct_count: correct,
      passed: score >= PASS_SCORE,
      duration_seconds: duration,
      answers: details,
      created_at: new Date().toISOString()
    };
    state.result = { record, details };
    renderResult();
    switchScreen("result");

    $("syncNotice").textContent = "正在保存成绩…";
    const saved = await window.ScoreStore.saveResult(record);
    if (saved.mode === "cloud") {
      $("syncNotice").textContent = "成绩已保存，管理员可以在成绩管理页查看。";
    } else if (saved.error) {
      $("syncNotice").textContent = "云端暂时未连接，成绩已安全保存在本机。";
    } else {
      $("syncNotice").textContent = "成绩已保存在本机；配置云端后可集中查看所有老师成绩。";
    }
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
  }

  function renderResult() {
    const { record } = state.result;
    $("resultScore").textContent = record.score;
    $("scoreRing").classList.toggle("passed", record.passed);
    $("resultTitle").textContent = record.passed ? "恭喜，今日测试合格" : "本次未达合格线";
    $("resultSummary").textContent = record.passed
      ? `${state.teacher}老师，本次成绩已达到80分合格标准。`
      : `${state.teacher}老师，建议先查看错题解析，再复习对应知识点。`;
    $("correctCount").textContent = `${record.correct_count}题`;
    $("durationLabel").textContent = formatDuration(record.duration_seconds);
    $("passLabel").textContent = record.passed ? "合格" : "不合格";
    renderReview();
  }

  function renderReview() {
    const wrong = state.result.details
      .map((detail, index) => ({ detail, question: state.questions[index] }))
      .filter(({ detail }) => !detail.correct);
    $("wrongCount").textContent = wrong.length ? `共 ${wrong.length} 道错题` : "本次全部答对";
    $("reviewList").replaceChildren();

    if (!wrong.length) {
      const message = document.createElement("p");
      message.className = "muted";
      message.textContent = "太棒了，本次没有错题。";
      $("reviewList").appendChild(message);
      return;
    }

    wrong.forEach(({ detail, question }, index) => {
      const item = document.createElement("article");
      item.className = "review-item";
      const title = document.createElement("h3");
      title.textContent = `${index + 1}. ${question.question}`;
      const selected = document.createElement("p");
      selected.textContent = `你的选择：${question.options[detail.selectedIndex].text}`;
      const answer = document.createElement("p");
      answer.className = "correct-answer";
      answer.textContent = `标准答案：${question.answer}`;
      item.append(title, selected, answer);
      $("reviewList").appendChild(item);
    });
  }

  $("todayLabel").textContent = displayDate(state.date);
  $("startForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const teacher = $("teacherName").value.trim();
    if (teacher.length < 2) {
      $("nameError").textContent = "请填写至少2个字的老师姓名。";
      return;
    }
    $("nameError").textContent = "";
    startExam(teacher);
  });
  $("prevButton").addEventListener("click", () => { if (state.current > 0) { state.current -= 1; renderQuestion(); } });
  $("nextButton").addEventListener("click", moveNext);
  $("reviewButton").addEventListener("click", () => {
    $("reviewPanel").classList.toggle("hidden");
    if (!$("reviewPanel").classList.contains("hidden")) $("reviewPanel").scrollIntoView({ behavior: "smooth" });
  });
  $("homeButton").addEventListener("click", () => {
    $("teacherName").value = state.teacher;
    $("reviewPanel").classList.add("hidden");
    switchScreen("welcome");
  });

  setInterval(() => {
    const latestDate = getShanghaiDate();
    if (latestDate !== state.date) {
      state.date = latestDate;
      $("todayLabel").textContent = displayDate(latestDate);
      if (!screens.exam.classList.contains("hidden")) {
        window.alert("日期已更新，请返回首页重新生成今日试卷。");
        switchScreen("welcome");
      }
    }
  }, 60000);
})();
