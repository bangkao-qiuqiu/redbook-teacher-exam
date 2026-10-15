(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let allResults = [];

  function getShanghaiDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatDuration(seconds) {
    const value = Number(seconds) || 0;
    if (value < 60) return `${value}秒`;
    return `${Math.floor(value / 60)}分${value % 60}秒`;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(new Date(iso));
  }

  function showDashboard() {
    $("adminLogin").classList.add("hidden");
    $("adminDashboard").classList.remove("hidden");
  }

  function getFilteredResults() {
    const name = $("nameFilter").value.trim().toLocaleLowerCase("zh-CN");
    const date = $("dateFilter").value;
    const status = $("statusFilter").value;
    return allResults.filter((result) => {
      if (name && !String(result.teacher_name || "").toLocaleLowerCase("zh-CN").includes(name)) return false;
      if (date && result.exam_date !== date) return false;
      if (status === "passed" && !result.passed) return false;
      if (status === "failed" && result.passed) return false;
      return true;
    });
  }

  function renderSummary() {
    const results = getFilteredResults();
    const total = results.length;
    const average = total ? Math.round(results.reduce((sum, item) => sum + Number(item.score || 0), 0) / total) : 0;
    const passed = results.filter((item) => item.passed).length;
    const today = getShanghaiDate();
    $("totalAttempts").textContent = total;
    $("averageScore").textContent = average;
    $("passRate").textContent = total ? `${Math.round((passed / total) * 100)}%` : "0%";
    $("todayAttempts").textContent = results.filter((item) => item.exam_date === today).length;
  }

  function renderTable() {
    const results = getFilteredResults();
    const tbody = $("resultTable");
    tbody.replaceChildren();
    $("emptyState").classList.toggle("hidden", results.length > 0);

    results.forEach((result) => {
      const row = document.createElement("tr");
      const values = [
        result.teacher_name,
        result.exam_date,
        `${result.score}分`,
        `${result.correct_count}/20`
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.appendChild(cell);
      });

      const statusCell = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `status-pill ${result.passed ? "pass" : "fail"}`;
      pill.textContent = result.passed ? "合格" : "不合格";
      statusCell.appendChild(pill);
      row.appendChild(statusCell);

      const durationCell = document.createElement("td");
      durationCell.textContent = formatDuration(result.duration_seconds);
      row.appendChild(durationCell);

      const timeCell = document.createElement("td");
      timeCell.textContent = formatTime(result.created_at);
      row.appendChild(timeCell);
      tbody.appendChild(row);
    });
    renderSummary();
  }

  async function loadResults() {
    try {
      allResults = await window.ScoreStore.listCloudResults();
      showDashboard();
      $("modeBanner").textContent = "当前显示云端汇总成绩，仅已绑定的管理员账号可以读取。";
      renderTable();
    } catch (error) {
      $("adminLogin").classList.remove("hidden");
      $("adminDashboard").classList.add("hidden");
      $("loginForm").classList.remove("hidden");
      $("loginError").textContent = "该账号没有管理员权限，或云端配置暂不可用。";
      console.error("Admin score access denied", error);
    }
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const header = ["老师姓名", "考试日期", "成绩", "答对题数", "考试结果", "用时秒数", "提交时间"];
    const rows = getFilteredResults().map((item) => [
      item.teacher_name, item.exam_date, item.score, item.correct_count,
      item.passed ? "合格" : "不合格", item.duration_seconds, item.created_at
    ]);
    const csv = `\ufeff${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `英语红宝书考试成绩_${getShanghaiDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function initialize() {
    if (!window.ScoreStore.cloudConfigured()) {
      $("loginDescription").textContent = "管理员后台尚未启用。";
      $("setupNotice").textContent = "请先按 README 连接 Supabase，并创建、绑定唯一管理员账号。后台不提供本机成绩查看入口。";
      $("setupNotice").classList.remove("hidden");
      return;
    }
    const session = await window.ScoreStore.getSession();
    if (session) {
      loadResults();
    } else {
      $("loginForm").classList.remove("hidden");
    }
  }

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("loginError").textContent = "正在登录…";
    try {
      await window.ScoreStore.signIn($("adminEmail").value.trim(), $("adminPassword").value);
      $("loginError").textContent = "";
      loadResults();
    } catch (error) {
      $("loginError").textContent = error.message || "登录失败，请检查邮箱和密码。";
    }
  });
  $("logoutButton").addEventListener("click", async () => {
    await window.ScoreStore.signOut();
    window.location.reload();
  });
  [$("nameFilter"), $("dateFilter"), $("statusFilter")].forEach((input) => input.addEventListener("input", renderTable));
  $("clearFilters").addEventListener("click", () => {
    $("nameFilter").value = "";
    $("dateFilter").value = "";
    $("statusFilter").value = "";
    renderTable();
  });
  $("exportButton").addEventListener("click", exportCsv);

  initialize();
})();
