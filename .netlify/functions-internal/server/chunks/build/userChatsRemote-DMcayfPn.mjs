import { N as publicAssetsURL } from '../nitro/nitro.mjs';
import { ref, computed } from 'vue';

const _imports_0 = publicAssetsURL("/images/glaucus-logo-emblem.svg");
function trimStr(s) {
  return typeof s === "string" ? s.trim() : "";
}
function truncateTitle(s, max = 40) {
  const t = trimStr(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}
function diveTypeLabel(raw) {
  if (raw === "Liveaboard") return "Liveaboard";
  if (raw === "Dive Resort") return "Resort";
  if (raw === "Dive Shop") return "Dive Shop";
  return raw.trim() || "";
}
function placeFromFilters(f) {
  const locale = trimStr(f.locale);
  if (locale) return locale;
  const region = trimStr(f.region);
  if (region) return region;
  const country = trimStr(f.country);
  if (country) return country;
  return "";
}
function normalizeKey(s) {
  return trimStr(s).toLowerCase().replace(/\s+/g, " ");
}
function clipShopFragment(raw) {
  let s = trimStr(raw);
  const andMatch = /\s+and\s+/i.exec(s);
  if (andMatch && andMatch.index > 0) s = s.slice(0, andMatch.index).trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 8) s = words.slice(0, 8).join(" ");
  return s;
}
function toTitleCasePhrase(s) {
  return clipShopFragment(s).split(/\s+/).filter(Boolean).map((w) => {
    if (!w.length) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}
function extractShopNameHintFromUserText(text) {
  const t = trimStr(text);
  if (!t) return null;
  const patterns = [
    /\bdive\s+with\s+([^.,!?\n]+)/i,
    /\bbook(?:ing)?\s+with\s+([^.,!?\n]+)/i,
    /\bbook(?:ing)?\s+at\s+([^.,!?\n]+)/i,
    /\bshops?\s+(?:called|named)\s+([^.,!?\n]+)/i
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const raw = clipShopFragment(trimStr(m[1]));
      if (raw.length >= 2 && raw.length <= 80) return raw;
    }
  }
  return null;
}
function extractHintFromMessages(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    const hint = extractShopNameHintFromUserText(trimStr(m.content));
    if (hint) return hint;
  }
  return null;
}
function matchHintToShopInMessages(messages, hint) {
  const h = normalizeKey(hint);
  if (h.length < 2) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant" || !Array.isArray(m.shops)) continue;
    for (const shop of m.shops) {
      const bn = trimStr(shop?.business_name);
      if (!bn) continue;
      const bnKey = normalizeKey(bn);
      if (bnKey === h || bnKey.includes(h) || h.includes(bnKey)) return bn;
    }
  }
  return null;
}
function resolveChosenShopName(messages, selectedShopId) {
  const sid = trimStr(selectedShopId);
  if (!sid) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant") continue;
    const shops = m.shops;
    if (Array.isArray(shops)) {
      const shop = shops.find((s) => s?.id === sid);
      const bn = trimStr(shop?.business_name);
      if (bn) return bn;
    }
    if (trimStr(m.shopId) === sid) {
      const n = trimStr(m.shopName);
      if (n) return n;
    }
  }
  return "";
}
function latestAssistantShopDisplayName(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant") continue;
    const sid = trimStr(m.shopId);
    const name = trimStr(m.shopName);
    if (sid && name) return name;
  }
  return "";
}
function deriveChatTitle(messages, context) {
  if (!Array.isArray(messages) || messages.length === 0) return "Chat";
  const fromSelection = resolveChosenShopName(messages, context?.selectedShopId);
  if (fromSelection) return truncateTitle(fromSelection);
  const fromBooking = latestAssistantShopDisplayName(messages);
  if (fromBooking) return truncateTitle(fromBooking);
  const statedHint = extractHintFromMessages(messages);
  if (statedHint) {
    const official = matchHintToShopInMessages(messages, statedHint);
    if (official) return truncateTitle(official);
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant" || !m.filters || typeof m.filters !== "object") continue;
    const f = m.filters;
    const place = placeFromFilters(f);
    const dt = Array.isArray(f.diveTypes) && f.diveTypes.length > 0 ? diveTypeLabel(String(f.diveTypes[0])) : "";
    if (place && dt) return `${place} ${dt} Trip`;
    if (place) return `${place} Trip`;
    if (dt) return `${dt} Trip`;
  }
  if (statedHint) return truncateTitle(toTitleCasePhrase(statedHint));
  const firstUser = messages.find((m) => m?.role === "user" && trimStr(m.content));
  const line = trimStr(firstUser?.content);
  if (line) {
    return truncateTitle(line, 40);
  }
  return "Chat";
}
function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function emptySession() {
  const now = Date.now();
  return {
    id: newId(),
    title: "Chat",
    updatedAt: now,
    messages: [],
    userInput: "",
    lastQuery: null,
    timestamp: now,
    selectedShopId: null,
    mobileDetailShopId: null,
    drawerOpen: false,
    drawerShopId: null,
    drawerShopName: null
  };
}
function ensureChatsRoot() {
  {
    const s2 = emptySession();
    return { version: 1, activeSessionId: s2.id, sessions: [s2] };
  }
}
function normalizeRoot(root) {
  let sessions = root.sessions.filter((s) => s && typeof s.id === "string");
  if (sessions.length === 0) {
    const s = emptySession();
    return { version: 1, activeSessionId: s.id, sessions: [s] };
  }
  if (!sessions.some((s) => s.id === root.activeSessionId)) {
    return { version: 1, activeSessionId: sessions[0].id, sessions };
  }
  return { version: 1, activeSessionId: root.activeSessionId, sessions };
}
function getActiveSession(root) {
  return root.sessions.find((s) => s.id === root.activeSessionId) ?? null;
}
function payloadToSessionFields(state) {
  return {
    messages: state.messages ?? [],
    userInput: state.userInput ?? "",
    lastQuery: state.lastQuery ?? null,
    timestamp: Date.now(),
    selectedShopId: state.selectedShopId ?? null,
    mobileDetailShopId: state.mobileDetailShopId ?? null,
    drawerOpen: state.drawerOpen ?? false,
    drawerShopId: state.drawerShopId ?? null,
    drawerShopName: state.drawerShopName ?? null
  };
}
function persistActiveChatsRoot(root, state) {
  const now = Date.now();
  const messages = state.messages ?? [];
  const title = deriveChatTitle(messages, { selectedShopId: state.selectedShopId ?? null });
  const fields = payloadToSessionFields(state);
  const sessions = root.sessions.map((s) => {
    if (s.id !== root.activeSessionId) return s;
    return {
      ...s,
      ...fields,
      title,
      updatedAt: now,
      timestamp: now
    };
  });
  const next = { version: 1, activeSessionId: root.activeSessionId, sessions };
  return next;
}
function archiveActiveAndStartNewChatsRoot(root, state) {
  const messages = state.messages ?? [];
  if (messages.length === 0) {
    const active = getActiveSession(root);
    if (!active) {
      const s = emptySession();
      const next3 = { version: 1, activeSessionId: s.id, sessions: [s] };
      return next3;
    }
    const cleared = {
      ...active,
      messages: [],
      userInput: "",
      lastQuery: null,
      title: "Chat",
      updatedAt: Date.now(),
      timestamp: Date.now(),
      selectedShopId: null,
      mobileDetailShopId: null,
      drawerOpen: false,
      drawerShopId: null,
      drawerShopName: null
    };
    const sessions2 = root.sessions.map((s) => s.id === active.id ? cleared : s);
    const next2 = { version: 1, activeSessionId: active.id, sessions: sessions2 };
    return next2;
  }
  const now = Date.now();
  const title = deriveChatTitle(messages, { selectedShopId: state.selectedShopId ?? null });
  const fields = payloadToSessionFields(state);
  const oldActiveId = root.activeSessionId;
  const prev = getActiveSession(root) ?? { ...emptySession(), id: oldActiveId };
  const saved = {
    ...prev,
    ...fields,
    id: oldActiveId,
    title,
    updatedAt: now,
    timestamp: now
  };
  const newSess = emptySession();
  const rest = root.sessions.filter((s) => s.id !== oldActiveId);
  const sessions = [newSess, saved, ...rest].slice(0, 3);
  const next = { version: 1, activeSessionId: newSess.id, sessions };
  return next;
}
function setActiveSessionIdChatsRoot(root, sessionId) {
  if (!root.sessions.some((s) => s.id === sessionId)) return null;
  const next = { version: 1, activeSessionId: sessionId, sessions: root.sessions };
  return next;
}
const useSearchCache = () => {
  const getCache = () => {
    return null;
  };
  const setCache = (state) => {
    let root = ensureChatsRoot();
    root = normalizeRoot(root);
    persistActiveChatsRoot(root, state);
  };
  const clearCache = () => {
  };
  return {
    getCache,
    setCache,
    clearCache
  };
};
const pendingNewChat = ref(false);
const pendingSwitchSessionId = ref(null);
const sidebarTick = ref(0);
function notifyChatSidebarUpdated() {
  sidebarTick.value++;
}
function useChatSessions() {
  const sidebarChats = computed(() => {
    sidebarTick.value;
    return [];
  });
  function requestNewChat() {
    pendingNewChat.value = true;
  }
  function requestSwitchSession(id) {
    pendingSwitchSessionId.value = id;
  }
  function consumePendingNewChat() {
    if (!pendingNewChat.value) return false;
    pendingNewChat.value = false;
    return true;
  }
  function consumePendingSwitch() {
    const id = pendingSwitchSessionId.value;
    pendingSwitchSessionId.value = null;
    return id;
  }
  function applyNewChatFromPage(pageState) {
    let root = ensureChatsRoot();
    root = archiveActiveAndStartNewChatsRoot(root, pageState);
    notifyChatSidebarUpdated();
    return root;
  }
  function applySwitchFromPage(sessionId, pageState) {
    let root = ensureChatsRoot();
    root = persistActiveChatsRoot(root, pageState);
    const switched = setActiveSessionIdChatsRoot(root, sessionId);
    if (!switched) return null;
    notifyChatSidebarUpdated();
    return switched;
  }
  return {
    sidebarChats,
    pendingNewChat,
    pendingSwitchSessionId,
    requestNewChat,
    requestSwitchSession,
    consumePendingNewChat,
    consumePendingSwitch,
    applyNewChatFromPage,
    applySwitchFromPage
  };
}
const chatRemoteHydrateTick = ref(0);

export { _imports_0 as _, useSearchCache as a, chatRemoteHydrateTick as c, getActiveSession as g, notifyChatSidebarUpdated as n, useChatSessions as u };
//# sourceMappingURL=userChatsRemote-DMcayfPn.mjs.map
