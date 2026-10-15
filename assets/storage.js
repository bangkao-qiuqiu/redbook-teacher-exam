(function () {
  "use strict";

  const LOCAL_KEY = "redbook_exam_results_v1";
  const config = window.APP_CONFIG || {};
  let clientPromise = null;

  function cloudConfigured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-supabase-sdk]");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.dataset.supabaseSdk = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("云端组件加载失败"));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (!cloudConfigured()) return null;
    if (!clientPromise) {
      clientPromise = (async () => {
        await loadSdk();
        return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
      })();
    }
    return clientPromise;
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeLocal(records) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
  }

  function saveLocal(record) {
    const records = readLocal();
    records.unshift(record);
    writeLocal(records.slice(0, 500));
  }

  async function saveResult(record) {
    saveLocal(record);
    if (!cloudConfigured()) return { mode: "local" };

    try {
      const client = await getClient();
      const { error } = await client.from("exam_results").insert(record);
      if (error) throw error;
      return { mode: "cloud" };
    } catch (error) {
      console.error("Cloud score sync failed", error);
      return { mode: "local", error };
    }
  }

  async function signIn(email, password) {
    const client = await getClient();
    if (!client) throw new Error("尚未配置云端成绩库");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function getSession() {
    const client = await getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function signOut() {
    const client = await getClient();
    if (client) await client.auth.signOut();
  }

  async function listCloudResults() {
    const client = await getClient();
    if (!client) return readLocal();
    const { data, error } = await client
      .from("exam_results")
      .select("id,teacher_name,exam_date,paper_id,score,correct_count,passed,duration_seconds,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data || [];
  }

  window.ScoreStore = {
    cloudConfigured,
    getClient,
    getSession,
    listLocalResults: readLocal,
    listCloudResults,
    saveResult,
    signIn,
    signOut
  };
})();
