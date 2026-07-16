/* ============================================================
   storage.js
   Handles all persistence for the CSC Digital Case Officer.
   Everything lives in localStorage no backend required.
   Nothing in this file knows about conversation logic or the DOM.
   ============================================================ */

const CSCStorage = (() => {

  const SESSION_KEY = "csc_chat_session_v2";
  const THEME_KEY = "csc_chat_theme";

  /* ---- Session (conversation transcript + collected case data) ---- */

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("CSCStorage: could not read session", err);
      return null;
    }
  }

  function saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {
      console.warn("CSCStorage: could not save session", err);
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.warn("CSCStorage: could not clear session", err);
    }
  }

  function createEmptySession() {
    return {
      messages: [],        // { from: 'bot'|'user', text, timestamp }
      caseData: {},         // structured answers collected during the flow
      flowKey: null,          // which incident flow is active
      stepIndex: 0,             // current position within that flow
      stage: "listening",         // 'listening' | 'clarifying' | 'categoryFallback' | 'flow' | 'summary'
      clarifyAttempts: 0,
      completed: false,
      lastSummary: null
    };
  }

  /* ---- Theme (light / dark) ---- */

  function getTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.warn("CSCStorage: could not save theme", err);
    }
  }

  return {
    getSession,
    saveSession,
    clearSession,
    createEmptySession,
    getTheme,
    saveTheme
  };

})();