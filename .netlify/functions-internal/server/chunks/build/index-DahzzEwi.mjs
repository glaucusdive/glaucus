import { _ as __nuxt_component_0 } from './nuxt-layout-CrmWeqUx.mjs';
import { useSSRContext, ref, watch, computed, mergeProps, withCtx, unref, createVNode, Transition, createBlock, createCommentVNode, openBlock, Fragment, renderList, toDisplayString, withModifiers, withDirectives, vModelText, nextTick } from 'vue';
import { ssrRenderComponent, ssrRenderAttr, ssrRenderClass, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderAttrs } from 'vue/server-renderer';
import { u as useChatSessions, c as chatRemoteHydrateTick, g as getActiveSession, _ as _imports_0, a as useSearchCache, n as notifyChatSidebarUpdated } from './userChatsRemote-DMcayfPn.mjs';
import { Menu, ChevronRight, ArrowUp, Star, MapPin, Languages, Globe, Phone, Mail } from 'lucide-vue-next';
import gsap from 'gsap';
import { _ as _sfc_main$3 } from './DiveShopDetail-BrxtYs6x.mjs';
import { u as useDrawer } from './useDrawer-5AAmvDVV.mjs';
import { u as useAuth } from './useAuth-BWS1ISvo.mjs';
import { u as useSupabase } from './useSupabase-G2CWeDSk.mjs';
import { a as useRoute, b as useState, u as useHead } from './server.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import 'vue-router';
import '../nitro/nitro.mjs';
import '@supabase/supabase-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@iconify/utils';
import 'consola';
import 'tailwindcss/colors';
import '@iconify/vue';
import 'reka-ui';
import '@vueuse/core';
import 'tailwind-variants';
import '@iconify/utils/lib/css/icon';
import 'perfect-debounce';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';

const _sfc_main$2 = {
  __name: "CardSearchResult",
  __ssrInlineRender: true,
  props: {
    shop: {
      type: Object,
      required: true
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  emits: ["shop-selected", "view-details"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const shopTypeDisplay = computed(() => {
      const raw = props.shop?.type;
      if (!raw || typeof raw !== "string") return "";
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.length ? parts.join(" | ") : "";
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: [
          "flex flex-row gap-3 p-4 border rounded-lg hover:shadow-md transition-all bg-white dark:bg-zinc-900",
          __props.active ? "border-white dark:border-white" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
        ]
      }, _attrs))}><div class="flex flex-col gap-3 flex-1 min-w-0 cursor-pointer"><div class="flex flex-row justify-between items-start gap-2"><h3 class="text-lg font-semibold text-zinc-900 dark:text-white hover:text-blue-600">${ssrInterpolate(__props.shop.business_name)}</h3>`);
      if (__props.shop.google_rating) {
        _push(`<div class="flex items-center gap-1 shrink-0">`);
        _push(ssrRenderComponent(unref(Star), { class: "w-4 h-4 text-yellow-500 fill-yellow-500" }, null, _parent));
        _push(`<span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">${ssrInterpolate(__props.shop.google_rating)}</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (shopTypeDisplay.value) {
        _push(`<p class="text-sm text-zinc-500 dark:text-zinc-400">${ssrInterpolate(shopTypeDisplay.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">`);
      _push(ssrRenderComponent(unref(MapPin), { class: "w-4 h-4 shrink-0 mt-0.5" }, null, _parent));
      _push(`<div class="flex flex-col"><span class="font-medium">${ssrInterpolate([__props.shop.locale, __props.shop.country?.name ?? __props.shop.country].filter(Boolean).join(", "))}</span>`);
      if (__props.shop.street_address) {
        _push(`<span class="text-zinc-50 dark:text-zinc-400">${ssrInterpolate(__props.shop.street_address)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
      if (__props.shop.languages && __props.shop.languages.length > 0) {
        _push(`<div class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-100">`);
        _push(ssrRenderComponent(unref(Languages), { class: "w-4 h-4 shrink-0" }, null, _parent));
        _push(`<span>${ssrInterpolate(__props.shop.languages.join(", "))}</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="flex flex-wrap gap-3 text-sm">`);
      if (__props.shop.website_url) {
        _push(`<a${ssrRenderAttr("href", __props.shop.website_url)} target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 text-blue-600 hover:text-blue-800">`);
        _push(ssrRenderComponent(unref(Globe), { class: "w-4 h-4" }, null, _parent));
        _push(`<span>Website</span></a>`);
      } else {
        _push(`<!---->`);
      }
      if (__props.shop.phone) {
        _push(`<a${ssrRenderAttr("href", `tel:${__props.shop.phone}`)} class="flex items-center gap-1 text-blue-600 hover:text-blue-800">`);
        _push(ssrRenderComponent(unref(Phone), { class: "w-4 h-4" }, null, _parent));
        _push(`<span>Call</span></a>`);
      } else {
        _push(`<!---->`);
      }
      if (__props.shop.email) {
        _push(`<a${ssrRenderAttr("href", `mailto:${__props.shop.email}`)} class="flex items-center gap-1 text-blue-600 hover:text-blue-800">`);
        _push(ssrRenderComponent(unref(Mail), { class: "w-4 h-4" }, null, _parent));
        _push(`<span>Email</span></a>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><button type="button" class="w-10 shrink-0 self-stretch flex items-center justify-center rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer" aria-label="View details">`);
      _push(ssrRenderComponent(unref(ChevronRight), { class: "w-5 h-5" }, null, _parent));
      _push(`</button></div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CardSearchResult.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "ShopDetailPanel",
  __ssrInlineRender: true,
  props: {
    shopLookup: {
      type: String,
      required: true
    },
    isInBookingFlow: {
      type: Boolean,
      default: false
    },
    isFormOpen: {
      type: Boolean,
      default: false
    },
    onStartBooking: {
      type: Function,
      default: null
    },
    onShowForm: {
      type: Function,
      default: null
    },
    onHideForm: {
      type: Function,
      default: null
    }
  },
  emits: ["close"],
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$3, mergeProps({
        "shop-lookup": __props.shopLookup,
        "show-close-button": true,
        "is-in-booking-flow": __props.isInBookingFlow,
        "is-form-open": __props.isFormOpen,
        "on-start-booking": __props.onStartBooking,
        "on-show-form": __props.onShowForm,
        "on-hide-form": __props.onHideForm,
        onClose: ($event) => _ctx.$emit("close")
      }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ShopDetailPanel.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
function normalizeExisting(existingRaw) {
  if (!Array.isArray(existingRaw)) return [];
  return existingRaw.map((e) => {
    const r = e;
    const gearRaw = r.gear;
    const gear = Array.isArray(gearRaw) ? gearRaw.map((g) => ({
      gear_type: String(g.gear_type ?? g.gearType ?? "")
    })) : [];
    return {
      name: String(r.name ?? ""),
      certification_number: String(r.certification_number ?? ""),
      number_of_dives: String(r.number_of_dives ?? ""),
      height: String(r.height ?? ""),
      height_unit: String(r.height_unit ?? "ft-in"),
      weight: String(r.weight ?? ""),
      weight_unit: String(r.weight_unit ?? "lbs"),
      gear,
      times_used: typeof r.times_used === "number" ? r.times_used : void 0
    };
  });
}
function diverRowFromBookingLike(d) {
  return {
    name: d.name ?? "",
    certification_number: d.certificationNumber ?? "",
    number_of_dives: d.numberOfDives ?? "",
    height: d.height ?? "",
    height_unit: d.heightUnit ?? "ft-in",
    weight: d.weight ?? "",
    weight_unit: d.weightUnit ?? "lbs",
    gear: (d.gear || []).map((g) => ({ gear_type: g?.gearType ?? "" }))
  };
}
function pickField(prev, next) {
  const nt = String(next ?? "").trim();
  if (nt !== "") return String(next);
  return String(prev ?? "").trim();
}
function mergeGear(prev, next) {
  const nextHas = next.some((g) => String(g.gear_type ?? "").trim() !== "");
  if (nextHas) return next;
  return prev ?? [];
}
function mergeDiverIncremental(prev, next) {
  const name = (next.name || "").trim() || (prev?.name ?? "");
  return {
    name,
    certification_number: pickField(prev?.certification_number, next.certification_number),
    number_of_dives: pickField(prev?.number_of_dives, next.number_of_dives),
    height: pickField(prev?.height, next.height),
    height_unit: pickField(prev?.height_unit, next.height_unit) || "ft-in",
    weight: pickField(prev?.weight, next.weight),
    weight_unit: pickField(prev?.weight_unit, next.weight_unit) || "lbs",
    gear: mergeGear(prev?.gear, next.gear),
    times_used: prev?.times_used ?? 0
  };
}
function mergeCompletedBooking(existingRaw, payloadDivers) {
  const existing = existingRaw;
  const byName = /* @__PURE__ */ new Map();
  for (const e of existing) {
    const k = String(e.name ?? "").trim().toLowerCase();
    if (k) byName.set(k, e);
  }
  const merged = [];
  for (const d of payloadDivers) {
    const base = diverRowFromBookingLike(d);
    const row = {
      name: base.name,
      certification_number: base.certification_number,
      number_of_dives: base.number_of_dives,
      height: base.height,
      height_unit: base.height_unit,
      weight: base.weight,
      weight_unit: base.weight_unit,
      gear: base.gear
    };
    const k = row.name.trim().toLowerCase();
    const prev = k ? byName.get(k) : void 0;
    const times_used = prev ? (prev.times_used ?? 0) + 1 : 1;
    merged.push({ ...row, times_used });
    if (k) byName.set(k, { ...row, times_used });
  }
  for (const e of existing) {
    const k = String(e.name ?? "").trim().toLowerCase();
    if (k && !byName.has(k)) {
      const [one] = normalizeExisting([e]);
      if (one) merged.push(one);
    }
  }
  return merged.sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0));
}
function mergeIncremental(existingRaw, payloadDivers) {
  const existing = normalizeExisting(existingRaw);
  const byNameInit = /* @__PURE__ */ new Map();
  for (const e of existing) {
    const k = e.name.trim().toLowerCase();
    if (k) byNameInit.set(k, { ...e });
  }
  const byKey = /* @__PURE__ */ new Map();
  for (const d of payloadDivers) {
    const next = diverRowFromBookingLike(d);
    const k = next.name.trim().toLowerCase();
    if (!k) continue;
    const prevRow = byKey.get(k) ?? byNameInit.get(k);
    byKey.set(k, mergeDiverIncremental(prevRow, next));
  }
  const merged = [...byKey.values()];
  for (const e of existing) {
    const k = e.name.trim().toLowerCase();
    if (k && !byKey.has(k)) merged.push(e);
  }
  return merged.sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0));
}
function mergeDefaultDiversFromBookingPayload(existingDefaultDivers, payloadDivers, options) {
  const existing = Array.isArray(existingDefaultDivers) ? existingDefaultDivers : [];
  const divers = Array.isArray(payloadDivers) ? payloadDivers : [];
  if (options.bumpTimesUsed) {
    return mergeCompletedBooking(existing, divers);
  }
  return mergeIncremental(existing, divers);
}
function defaultDiverJsonFromFirst(first) {
  if (!first?.name?.trim()) return null;
  return {
    name: first.name,
    certification_number: first.certification_number,
    number_of_dives: first.number_of_dives,
    height: first.height,
    height_unit: first.height_unit,
    weight: first.weight,
    weight_unit: first.weight_unit,
    gear: first.gear
  };
}
const SHOP_DETAIL_CLOSE_GUARD_MS = 800;
const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    const { isSignedIn, user } = useAuth();
    const { client } = useSupabase();
    const profilePrefillSnapshot = ref(null);
    async function loadProfilePrefill() {
      if (!isSignedIn.value) {
        profilePrefillSnapshot.value = null;
        return;
      }
      try {
        const { data } = await client.from("profiles").select("display_name, email, default_diver, default_divers").single();
        if (data) {
          const defaultDivers = Array.isArray(data.default_divers) && data.default_divers.length > 0 ? data.default_divers.map((d) => ({
            name: d.name,
            certification_number: d.certification_number,
            number_of_dives: d.number_of_dives,
            height: d.height,
            height_unit: d.height_unit,
            weight: d.weight,
            weight_unit: d.weight_unit,
            gear: Array.isArray(d.gear) ? d.gear.map((g) => ({ gear_type: g.gear_type ?? g.gearType })) : [],
            times_used: typeof d.times_used === "number" ? d.times_used : void 0
          })) : null;
          const dd = data.default_diver && typeof data.default_diver === "object" ? data.default_diver : null;
          profilePrefillSnapshot.value = {
            name: data.display_name ?? void 0,
            email: data.email ?? void 0,
            defaultDivers: defaultDivers ?? void 0,
            defaultDiver: !defaultDivers && dd ? {
              name: dd.name,
              certification_number: dd.certification_number,
              number_of_dives: dd.number_of_dives,
              height: dd.height,
              height_unit: dd.height_unit,
              weight: dd.weight,
              weight_unit: dd.weight_unit
            } : void 0
          };
        }
      } catch {
        profilePrefillSnapshot.value = null;
      }
    }
    watch(isSignedIn, async (signedIn) => {
      if (!signedIn) {
        profilePrefillSnapshot.value = null;
        return;
      }
      await loadProfilePrefill();
    }, { immediate: true });
    async function syncProfileFromChatPayload(payload) {
      if (!user.value?.id || !payload) return;
      const divers = payload.divers;
      if (!Array.isArray(divers) || divers.length === 0) return;
      const hasNamed = divers.some((d) => d?.name && String(d.name).trim());
      if (!hasNamed) return;
      try {
        const { data: profile } = await client.from("profiles").select("default_divers").eq("id", user.value.id).single();
        const default_divers = mergeDefaultDiversFromBookingPayload(profile?.default_divers, divers, { bumpTimesUsed: false });
        const patch = {
          default_divers,
          default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? void 0
        };
        if (payload.name && String(payload.name).trim()) patch.display_name = String(payload.name).trim();
        if (payload.email && String(payload.email).trim()) patch.email = String(payload.email).trim();
        await client.from("profiles").update(patch).eq("id", user.value.id);
        await loadProfilePrefill();
      } catch (e) {
        console.warn("[profile sync from chat]", e);
      }
    }
    async function syncProfileAfterChatBookingSent(body) {
      if (!user.value?.id || !Array.isArray(body.divers) || body.divers.length === 0) return;
      try {
        const { data: profile } = await client.from("profiles").select("default_divers").eq("id", user.value.id).single();
        const default_divers = mergeDefaultDiversFromBookingPayload(profile?.default_divers, body.divers, { bumpTimesUsed: true });
        await client.from("profiles").update({
          display_name: body.name ?? void 0,
          email: body.email ?? void 0,
          default_divers,
          default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? void 0
        }).eq("id", user.value.id);
        await loadProfilePrefill();
      } catch (e) {
        console.warn("[profile sync after chat booking]", e);
      }
    }
    const userInput = ref("");
    const chatInputRef = ref(null);
    const isLoading = ref(false);
    const messages = ref([]);
    const messagesContainer = ref(null);
    const isRestoringCache = ref(true);
    watch(
      [isRestoringCache, isSignedIn, messages],
      () => {
        return;
      },
      { deep: true }
    );
    const abortController = ref(null);
    const selectedShopId = ref(null);
    const pendingBookingPayload = ref(null);
    const mobileDetailShopId = ref(null);
    useState("glaucus-session-entry-path", () => "");
    useState("glaucus-chat-index-boot-finished", () => false);
    function shouldShowChatBootLoader() {
      return true;
    }
    const isPageLoading = ref(shouldShowChatBootLoader());
    const selectedShopName = computed(() => {
      if (!selectedShopId.value) return null;
      const msgWithShops = [...messages.value].reverse().find((m) => m.shops?.length);
      const shop = msgWithShops?.shops?.find((s) => s.id === selectedShopId.value);
      if (shop?.business_name) return shop.business_name;
      const bookingMsg = [...messages.value].reverse().find((m) => m.shopId === selectedShopId.value && m.shopName);
      return bookingMsg?.shopName ?? null;
    });
    const lastBookingPayload = computed(() => {
      const m = [...messages.value].reverse().find((m2) => {
        if (m2.role !== "assistant" || m2.intent !== "booking") return false;
        return m2.payload != null || m2 && "bookingPayload" in m2 && m2.bookingPayload != null;
      });
      const p = m && (m.payload !== void 0 ? m.payload : m.bookingPayload);
      return p ?? void 0;
    });
    const bookingShopForDrawer = computed(() => {
      if (selectedShopId.value && selectedShopName.value) return { id: selectedShopId.value, name: selectedShopName.value };
      const m = [...messages.value].reverse().find((m2) => m2.role === "assistant" && (m2.shopId || m2.shops?.length));
      if (m?.shopId && m?.shopName) return { id: m.shopId, name: m.shopName };
      const shop = m?.shops?.[0];
      if (shop) return { id: shop.id, name: shop.business_name };
      return null;
    });
    const activeChipMessageIndex = computed(() => {
      const list = messages.value;
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m.role !== "assistant") continue;
        const hasSelectable = m.selectableOptions && m.selectableOptions.length > 0;
        const hasGear = Array.isArray(m.rentalEquipmentOptions) && m.rentalEquipmentOptions.length > 0;
        const hasCourses = m.courseOptions && m.courseOptions.length > 0;
        const hasDiveSites = m.diveSiteOptions && m.diveSiteOptions.length > 0;
        const hasBookChip = m.shops?.length && selectedShopId.value && selectedShopName.value;
        if (hasSelectable || hasGear || hasCourses || hasDiveSites || hasBookChip) return i;
      }
      return -1;
    });
    function isInBookingFlowForShop(shopId) {
      if (!shopId || bookingShopForDrawer.value?.id !== shopId) return false;
      return messages.value.some((m) => m.role === "assistant" && m.intent === "booking");
    }
    function handleStartBookingFromPanel(shopId, shopName) {
      selectedShopId.value = shopId;
      sendMessage(shopName ? `Let's book ${shopName}` : "Let's book this");
    }
    function handleShowFormFromPanel() {
      openBookingFormDrawer();
    }
    function handleHideFormFromPanel() {
      closeDrawer();
    }
    const getInitialDesktop = () => {
      {
        return true;
      }
    };
    const isDesktop = ref(getInitialDesktop());
    let shopDetailCloseGuardUntil = 0;
    function armShopDetailCloseGuard() {
      shopDetailCloseGuardUntil = Date.now() + SHOP_DETAIL_CLOSE_GUARD_MS;
    }
    const exampleQueries = [
      "I want to do wreck diving in Bali from Jan 1-7, 2026",
      "Looking for beginner-friendly dive shops in the Maldives",
      "Find highly rated dive shops in Thailand",
      "Shops in Mexico that offer advanced certification courses"
    ];
    const { setCache } = useSearchCache();
    const {
      applyNewChatFromPage,
      applySwitchFromPage,
      consumePendingNewChat,
      consumePendingSwitch,
      pendingNewChat,
      pendingSwitchSessionId
    } = useChatSessions();
    const { openMobileMenu, openDrawer, closeDrawer, isOpen, contentType, drawerData, updateBookingPayloadIfOpen } = useDrawer();
    const isBookingFormOpen = computed(() => isOpen.value && contentType.value === "booking-form");
    function buildPageCachePayload() {
      const drawerWasOpen = isOpen.value && contentType.value === "booking-form";
      return {
        messages: messages.value,
        userInput: userInput.value,
        lastQuery: typeof route.query.q === "string" ? route.query.q : null,
        selectedShopId: selectedShopId.value,
        mobileDetailShopId: mobileDetailShopId.value,
        drawerOpen: drawerWasOpen,
        drawerShopId: drawerWasOpen ? drawerData.shopId ?? null : null,
        drawerShopName: drawerWasOpen ? drawerData.shopName ?? null : null
      };
    }
    async function hydrateFromRecord(cachedState) {
      isRestoringCache.value = true;
      closeDrawer();
      messages.value = cachedState.messages || [];
      userInput.value = cachedState.userInput || "";
      selectedShopId.value = cachedState.selectedShopId ?? null;
      mobileDetailShopId.value = cachedState.mobileDetailShopId ?? null;
      pendingBookingPayload.value = null;
      isLoading.value = false;
      if (abortController.value) {
        abortController.value.abort();
        abortController.value = null;
      }
      isRestoringCache.value = false;
      await nextTick();
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (cachedState.drawerOpen && cachedState.drawerShopId) {
            const payload = [...cachedState.messages || []].reverse().find((m) => {
              if (m?.role !== "assistant" || m?.intent !== "booking") return false;
              return m.payload != null || m && "bookingPayload" in m && m.bookingPayload != null;
            });
            const bookingPayload = payload && (payload.payload !== void 0 ? payload.payload : payload.bookingPayload);
            openDrawer("booking-form", {
              shopId: cachedState.drawerShopId,
              shopName: cachedState.drawerShopName || "Dive shop",
              bookingPayload: bookingPayload ?? void 0
            });
          }
        }, 300);
      });
    }
    watch(chatRemoteHydrateTick, () => {
      if (route.path !== "/") return;
      return;
    });
    watch(pendingNewChat, () => {
      if (!consumePendingNewChat()) return;
      if (abortController.value) {
        abortController.value.abort();
        abortController.value = null;
        isLoading.value = false;
      }
      closeDrawer();
      const root = applyNewChatFromPage(buildPageCachePayload());
      const s = getActiveSession(root);
      if (s) void hydrateFromRecord(s);
    });
    watch(pendingSwitchSessionId, (id) => {
      if (!id) return;
      const sid = consumePendingSwitch();
      if (!sid) return;
      if (abortController.value) {
        abortController.value.abort();
        abortController.value = null;
        isLoading.value = false;
      }
      closeDrawer();
      const root = applySwitchFromPage(sid, buildPageCachePayload());
      if (!root) return;
      const s = getActiveSession(root);
      if (s) void hydrateFromRecord(s);
    });
    const persistCache = () => {
      if (isRestoringCache.value) return;
      setCache(buildPageCachePayload());
      notifyChatSidebarUpdated();
    };
    watch([messages, userInput], persistCache, { deep: true });
    watch([selectedShopId, mobileDetailShopId, isOpen, drawerData], persistCache, { deep: true });
    const scrollToBottom = async () => {
      await nextTick();
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          const container = messagesContainer.value;
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
          });
        }
      });
      setTimeout(() => {
        if (messagesContainer.value) {
          const container = messagesContainer.value;
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
          });
        }
      }, 150);
    };
    watch(messages, () => {
      scrollToBottom();
    }, { deep: true, flush: "post" });
    watch(() => messages.value.length, () => {
      scrollToBottom();
    });
    function getResultsRange(msgIndex) {
      let previous = 0;
      for (let i = 0; i < msgIndex; i++) {
        const m = messages.value[i];
        if (m?.role === "assistant" && m.shops?.length) previous += m.shops.length;
      }
      const msg = messages.value[msgIndex];
      const count = msg?.shops?.length ?? 0;
      const total = msg?.totalResults ?? 0;
      return { start: previous + 1, end: previous + count, total };
    }
    function getResultsRangeLabel(msgIndex) {
      const { start, end, total } = getResultsRange(msgIndex);
      if (start === end) return `Showing result ${start} of ${total} dive shops found`;
      return `Showing results ${start}–${end} of ${total} dive shops found`;
    }
    function getSelectedGearNamesForMessage(msg) {
      const payload = msg.payload ?? msg.bookingPayload;
      const divers = payload?.divers ?? [];
      const current = divers.find((d) => !d.gearAsked);
      const gear = current?.gear ?? [];
      return new Set(gear.map((g) => (g.gearType ?? g.gear_type ?? "").toString().trim().toLowerCase()).filter(Boolean));
    }
    function getGearChipClickValue(msg, eq) {
      const selected = getSelectedGearNamesForMessage(msg);
      const name = (eq.name ?? "").toString().trim();
      if (selected.has(name.toLowerCase())) return `remove ${name}`;
      return name;
    }
    function isGearChipSelected(msg, eq) {
      return getSelectedGearNamesForMessage(msg).has((eq.name ?? "").toString().trim().toLowerCase());
    }
    function getSelectedCourseNamesForMessage(msg) {
      const payload = msg.payload ?? msg.bookingPayload;
      const list = payload?.desiredCourses;
      if (!Array.isArray(list)) return /* @__PURE__ */ new Set();
      return new Set(list.map((c) => String(c).trim().toLowerCase()).filter(Boolean));
    }
    function isCourseChipSelected(msg, course) {
      return getSelectedCourseNamesForMessage(msg).has((course.name ?? "").toString().trim().toLowerCase());
    }
    function getPendingEntityClarifyPhraseForOutgoing(outgoingMessage) {
      if (!/^entity_clarify:/i.test(String(outgoingMessage).trim())) return void 0;
      const arr = messages.value;
      for (let i = arr.length - 2; i >= 0; i--) {
        const m = arr[i];
        if (m?.role === "assistant" && m.entityClarifyPending?.phrase) {
          return m.entityClarifyPending.phrase;
        }
      }
      return void 0;
    }
    const sendMessage = async (messageText, displayText) => {
      const message = messageText ?? userInput.value.trim();
      if (!message) return;
      if (abortController.value) {
        abortController.value.abort();
        abortController.value = null;
        isLoading.value = false;
      }
      const textToShow = displayText ?? message;
      messages.value.push({
        role: "user",
        content: textToShow
      });
      userInput.value = "";
      await scrollToBottom();
      isLoading.value = true;
      abortController.value = new AbortController();
      const currentAbortController = abortController.value;
      try {
        const lastShopsFromHistory = messages.value.filter((m) => m.role === "assistant" && m.shops?.length).pop()?.shops;
        const lastShops = lastShopsFromHistory?.map((s) => ({ id: s.id, business_name: s.business_name })) ?? void 0;
        const lastAssistantMessage = [...messages.value].reverse().find((m) => m.role === "assistant");
        const inBookingFlow = lastAssistantMessage?.intent === "booking" && lastAssistantMessage?.shopId;
        const lastIntent = inBookingFlow ? "booking" : void 0;
        const lastBookingShopId = inBookingFlow ? lastAssistantMessage.shopId : void 0;
        const lastBookingShopName = inBookingFlow ? lastAssistantMessage.shopName ?? selectedShopName.value : void 0;
        const lastPayload = lastBookingPayload.value;
        const shopsAlreadyShownCount = messages.value.filter((m) => m.role === "assistant" && m.shops?.length).reduce((sum, m) => sum + (m.shops?.length ?? 0), 0);
        const pendingEntityClarifyPhrase = getPendingEntityClarifyPhraseForOutgoing(message);
        const response = await $fetch("/api/ai-search", {
          method: "POST",
          signal: currentAbortController.signal,
          body: {
            message,
            history: messages.value.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
              role: m.role,
              content: m.role === "assistant" && m.preamble ? `${m.preamble}

${m.content}` : m.content
            })),
            selectedShopId: selectedShopId.value || void 0,
            lastShops,
            shopsAlreadyShownCount,
            lastIntent,
            lastBookingShopId,
            ...inBookingFlow && lastBookingShopName ? { lastBookingShopName } : {},
            ...inBookingFlow && lastPayload ? { bookingPayload: lastPayload } : {},
            ...pendingBookingPayload.value ? { pendingBookingPayload: pendingBookingPayload.value } : {},
            ...profilePrefillSnapshot.value ? { profilePrefill: profilePrefillSnapshot.value } : {},
            ...pendingEntityClarifyPhrase ? { pendingEntityClarifyPhrase } : {}
          }
        });
        if (currentAbortController.signal.aborted) {
          return;
        }
        if (response.success) {
          if (response.searchFlowReset) {
            closeDrawer();
            selectedShopId.value = null;
            pendingBookingPayload.value = null;
            mobileDetailShopId.value = null;
            const resetContent = response.message && String(response.message).trim() ? response.message : "What type of trip are you looking for?";
            messages.value = [
              { role: "user", content: textToShow },
              {
                role: "assistant",
                content: resetContent,
                ...response.messagePreamble ? { preamble: response.messagePreamble } : {},
                shops: response.shops || [],
                totalResults: response.totalResults,
                hasMoreResults: response.hasMoreResults,
                intent: response.intent,
                bookingReady: response.bookingReady,
                payload: void 0,
                shopId: void 0,
                shopName: void 0,
                selectableOptions: response.selectableOptions,
                rentalEquipmentOptions: response.rentalEquipmentOptions || void 0,
                hideNoneForGear: response.hideNoneForGear ?? false,
                courseOptions: response.courseOptions || void 0,
                diveSiteOptions: response.diveSiteOptions || void 0,
                ...response.filters && typeof response.filters === "object" ? { filters: response.filters } : {},
                ...response.entityClarifyPending ? { entityClarifyPending: response.entityClarifyPending } : {}
              }
            ];
            isLoading.value = false;
            abortController.value = null;
            await scrollToBottom();
            return;
          }
          const storedPayload = response.bookingPayload ?? response.payload;
          const userSaidConfirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(String(message).trim()) || /^(send|submit)\s+(booking\s+)?(request)?$/i.test(String(message).trim());
          const hasValidDivers = Array.isArray(storedPayload?.divers) && storedPayload.divers.length >= 1 && storedPayload.divers.some((d) => d?.name && String(d.name).trim());
          if (response.bookingReady && storedPayload?.shopId && hasValidDivers && userSaidConfirmSend) {
            try {
              const body = {
                shopId: storedPayload.shopId,
                name: storedPayload.name ?? "",
                email: storedPayload.email ?? "",
                startDate: storedPayload.startDate ?? "",
                endDate: storedPayload.endDate ?? "",
                desiredCourses: Array.isArray(storedPayload.desiredCourses) ? storedPayload.desiredCourses : [],
                desiredDiveSites: Array.isArray(storedPayload.desiredDiveSites) ? storedPayload.desiredDiveSites : [],
                divers: (storedPayload.divers ?? []).map((d) => ({
                  name: d.name ?? "",
                  certificationNumber: d.certificationNumber ?? "",
                  numberOfDives: d.numberOfDives ?? "",
                  height: d.height ?? "",
                  heightUnit: d.heightUnit ?? "ft-in",
                  weight: d.weight ?? "",
                  weightUnit: d.weightUnit ?? "lbs",
                  gear: (d.gear ?? []).map((g) => ({ gearType: g?.gearType ?? "" }))
                }))
              };
              const bookRes = await $fetch("/api/booking", { method: "POST", body });
              if (bookRes?.sent) {
                messages.value.push({
                  role: "assistant",
                  content: "Request sent. Check your email for confirmation.",
                  shops: [],
                  totalResults: 0,
                  hasMoreResults: false,
                  intent: response.intent,
                  bookingReady: false,
                  payload: void 0,
                  shopId: response.shopId,
                  shopName: response.shopName
                });
                void syncProfileAfterChatBookingSent(body);
                return;
              }
            } catch (bookErr) {
              const err = bookErr && typeof bookErr === "object" ? bookErr : {};
              const data = err.data && typeof err.data === "object" ? err.data : {};
              const errMsg = data.resendError ?? data.message ?? data.statusMessage ?? err.statusMessage ?? err.message ?? "Failed to send email to the dive shop.";
              messages.value.push({
                role: "assistant",
                content: `${errMsg} You can try again using the arrow to open the form and submit, or contact the dive shop directly.`,
                shops: [],
                totalResults: 0,
                hasMoreResults: false,
                intent: response.intent,
                bookingReady: true,
                payload: storedPayload,
                shopId: response.shopId,
                shopName: response.shopName
              });
              return;
            }
          }
          const content = response.message && String(response.message).trim() ? response.message : "Got it — what would you like to tell me next?";
          messages.value.push({
            role: "assistant",
            content,
            ...response.messagePreamble ? { preamble: response.messagePreamble } : {},
            shops: response.shops || [],
            totalResults: response.totalResults,
            hasMoreResults: response.hasMoreResults,
            intent: response.intent,
            bookingReady: response.bookingReady,
            payload: storedPayload,
            shopId: response.shopId,
            shopName: response.shopName,
            selectableOptions: response.selectableOptions,
            rentalEquipmentOptions: response.rentalEquipmentOptions || void 0,
            hideNoneForGear: response.hideNoneForGear ?? false,
            courseOptions: response.courseOptions || void 0,
            diveSiteOptions: response.diveSiteOptions || void 0,
            ...response.filters && typeof response.filters === "object" ? { filters: response.filters } : {},
            ...response.entityClarifyPending ? { entityClarifyPending: response.entityClarifyPending } : {}
          });
          if (response.intent === "booking" && storedPayload) {
            updateBookingPayloadIfOpen(storedPayload);
            if (isSignedIn.value) {
              void syncProfileFromChatPayload(storedPayload);
            }
          }
          if (response.pendingBookingPayload) {
            pendingBookingPayload.value = response.pendingBookingPayload;
            selectedShopId.value = null;
          } else {
            pendingBookingPayload.value = null;
          }
          if (response.intent === "booking" && response.shopId) {
            selectedShopId.value = response.shopId;
          } else if (response.intent === "booking" && response.shopId == null) {
            selectedShopId.value = null;
          }
        } else {
          messages.value.push({
            role: "assistant",
            content: response.message || "Sorry, I encountered an error while searching. Please try again.",
            shops: [],
            totalResults: 0,
            hasMoreResults: false
          });
        }
      } catch (error) {
        if (error.name === "AbortError" || currentAbortController.signal.aborted) {
          return;
        }
        console.error("Search error:", error);
        if (!currentAbortController.signal.aborted) {
          messages.value.push({
            role: "assistant",
            content: "Sorry, I encountered an error while searching. Please try again.",
            shops: [],
            totalResults: 0,
            hasMoreResults: false
          });
        }
      } finally {
        if (abortController.value === currentAbortController) {
          isLoading.value = false;
          abortController.value = null;
          await scrollToBottom();
          persistCache();
          await nextTick();
          chatInputRef.value?.focus();
        }
      }
    };
    const handleSubmit = () => {
      sendMessage();
    };
    const canStepBack = computed(() => {
      const m = messages.value;
      if (m.length < 2) return false;
      const last = m[m.length - 1];
      const prev = m[m.length - 2];
      const roles = /* @__PURE__ */ new Set([last.role, prev.role]);
      return roles.has("user") && roles.has("assistant");
    });
    const stepBack = () => {
      if (!canStepBack.value) return;
      messages.value = messages.value.slice(0, -2);
      persistCache();
    };
    const handleShopSelected = (shop) => {
      armShopDetailCloseGuard();
      nextTick(() => {
        selectedShopId.value = shop.id;
      });
    };
    const handleViewDetails = (shop) => {
      armShopDetailCloseGuard();
      nextTick(() => {
        selectedShopId.value = shop.id;
        mobileDetailShopId.value = shop.id;
      });
    };
    const openBookingFormDrawer = () => {
      const shop = bookingShopForDrawer.value;
      if (!shop) return;
      openDrawer("booking-form", {
        shopId: shop.id,
        shopName: shop.name,
        bookingPayload: lastBookingPayload.value
      });
    };
    function openBookingFormDrawerFromMessage(msg) {
      const shop = bookingShopForDrawer.value || (msg.shopId && msg.shopName ? { id: msg.shopId, name: msg.shopName } : null);
      if (!shop) return;
      armShopDetailCloseGuard();
      const payload = msg.payload !== void 0 ? msg.payload : msg.bookingPayload;
      nextTick(() => {
        selectedShopId.value = shop.id;
        mobileDetailShopId.value = shop.id;
        openDrawer("booking-form", {
          shopId: shop.id,
          shopName: shop.name,
          bookingPayload: payload ?? lastBookingPayload.value
        });
      });
    }
    const closeShopDetail = () => {
      if (Date.now() < shopDetailCloseGuardUntil) return;
      if (isDesktop.value) {
        selectedShopId.value = null;
      }
      mobileDetailShopId.value = null;
    };
    const onShopPanelEnter = (el, done) => {
      gsap.from(el, {
        x: "100%",
        duration: 0.3,
        ease: "power3.out",
        onComplete: done
      });
    };
    const onShopPanelLeave = (el, done) => {
      gsap.to(el, {
        x: "100%",
        duration: 0.3,
        ease: "power3.in",
        onComplete: done
      });
    };
    const onMobileDrawerEnter = (el, done) => {
      const drawer = el.querySelector(".absolute.right-0");
      const backdrop = el.querySelector(".absolute.inset-0");
      gsap.from(backdrop, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
      });
      gsap.from(drawer, {
        x: "100%",
        duration: 0.4,
        ease: "power3.out",
        onComplete: done
      });
    };
    const onMobileDrawerLeave = (el, done) => {
      const drawer = el.querySelector(".absolute.right-0");
      const backdrop = el.querySelector(".absolute.inset-0");
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in"
      });
      gsap.to(drawer, {
        x: "100%",
        duration: 0.3,
        ease: "power3.in",
        onComplete: done
      });
    };
    const onLoadingEnter = (el, done) => {
      gsap.from(el, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
        onComplete: done
      });
    };
    const onLoadingLeave = (el, done) => {
      gsap.to(el, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: done
      });
    };
    useHead({
      title: "AI Dive Shop Search - Glaucus"
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(``);
            if (isPageLoading.value) {
              _push2(`<div class="fixed inset-0 z-[200] bg-white dark:bg-zinc-900 flex items-center justify-center" data-v-a4777d4f${_scopeId}><img${ssrRenderAttr("src", _imports_0)} alt="Glaucus" class="w-24 h-24" data-v-a4777d4f${_scopeId}></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<div class="flex flex-col h-full w-full relative" data-v-a4777d4f${_scopeId}><div class="min-h-10 min-w-0 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0" data-v-a4777d4f${_scopeId}><div class="flex min-w-0 flex-1 items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700" data-v-a4777d4f${_scopeId}><button class="flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer shrink-0" data-v-a4777d4f${_scopeId}>`);
            _push2(ssrRenderComponent(unref(Menu), { class: "w-5 h-5" }, null, _parent2, _scopeId));
            _push2(`</button><h1 class="text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white min-w-0 truncate" data-v-a4777d4f${_scopeId}> Dive Shop Search</h1></div><div class="flex shrink-0 items-center gap-1 p-1 lg:p-4" data-v-a4777d4f${_scopeId}>`);
            if (canStepBack.value) {
              _push2(`<button class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer" title="Remove last message and your last reply so you can redo that step" data-v-a4777d4f${_scopeId}> Step back </button>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div></div><div class="flex-1 flex flex-row overflow-hidden relative" data-v-a4777d4f${_scopeId}><div class="${ssrRenderClass([
              "flex min-w-0 flex-col h-full transition-all duration-300 ease-in-out relative",
              selectedShopId.value ? "w-full lg:w-1/2" : "w-full"
            ])}" data-v-a4777d4f${_scopeId}><div class="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-2 *:max-w-3xl *:mx-auto *:w-full" data-v-a4777d4f${_scopeId}>`);
            if (messages.value.length === 0) {
              _push2(`<div class="flex flex-col items-center justify-center gap-8 h-full" data-v-a4777d4f${_scopeId}><div class="text-center space-y-4 flex flex-col items-center" data-v-a4777d4f${_scopeId}><h2 class="max-w-2xl lg:text-2xl font-bold text-zinc-900 dark:text-white" data-v-a4777d4f${_scopeId}> Tell me what you&#39;re looking for in your diving experience, and I&#39;ll help you find the best dive shops. </h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4" data-v-a4777d4f${_scopeId}><!--[-->`);
              ssrRenderList(exampleQueries, (example) => {
                _push2(`<button class="text-left p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900" data-v-a4777d4f${_scopeId}><p class="text-sm text-zinc-700 dark:text-zinc-300" data-v-a4777d4f${_scopeId}>${ssrInterpolate(example)}</p></button>`);
              });
              _push2(`<!--]--></div></div></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--[-->`);
            ssrRenderList(messages.value, (msg, index2) => {
              _push2(`<div class="" data-v-a4777d4f${_scopeId}>`);
              if (msg.role === "user") {
                _push2(`<div class="flex justify-end" data-v-a4777d4f${_scopeId}><div class="max-w-[80%] bg-blue-600 text-white rounded-lg p-2" data-v-a4777d4f${_scopeId}><p class="text-sm lg:text-base" data-v-a4777d4f${_scopeId}>${ssrInterpolate(msg.content)}</p></div></div>`);
              } else if (msg.role === "assistant") {
                _push2(`<div class="flex justify-start" data-v-a4777d4f${_scopeId}><div class="md:max-w-[90%] flex-1 min-w-0 flex flex-col gap-2" data-v-a4777d4f${_scopeId}>`);
                if (msg.preamble) {
                  _push2(`<div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 chat-bubble-pop-first" data-v-a4777d4f${_scopeId}><p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap" data-v-a4777d4f${_scopeId}>${ssrInterpolate(msg.preamble)}</p></div>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`<div class="${ssrRenderClass([{ "chat-bubble-pop-follow": msg.preamble }, "flex flex-col gap-2 min-w-0"])}" data-v-a4777d4f${_scopeId}><div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2" data-v-a4777d4f${_scopeId}><p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis" data-v-a4777d4f${_scopeId}>${ssrInterpolate(msg.content)}</p>`);
                if ((bookingShopForDrawer.value || msg.shopId && msg.shopName) && !(msg.shops && msg.shops.length > 0)) {
                  _push2(`<button type="button" class="w-10 shrink-0 self-stretch flex items-center justify-center rounded-sm border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer" aria-label="Open booking form" data-v-a4777d4f${_scopeId}>`);
                  _push2(ssrRenderComponent(unref(ChevronRight), { class: "w-5 h-5" }, null, _parent2, _scopeId));
                  _push2(`</button>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div>`);
                if (msg.shops && msg.shops.length > 0) {
                  _push2(`<div class="flex flex-col gap-2 md:p-2" data-v-a4777d4f${_scopeId}><div class="flex items-center gap-2 text-sm text-zinc-600" data-v-a4777d4f${_scopeId}><span class="font-medium" data-v-a4777d4f${_scopeId}>Top Results:</span></div><div class="grid grid-cols-1 gap-3" data-v-a4777d4f${_scopeId}><!--[-->`);
                  ssrRenderList(msg.shops, (shop) => {
                    _push2(ssrRenderComponent(_sfc_main$2, {
                      key: shop.id,
                      shop,
                      active: selectedShopId.value === shop.id,
                      onShopSelected: handleShopSelected,
                      onViewDetails: handleViewDetails
                    }, null, _parent2, _scopeId));
                  });
                  _push2(`<!--]--></div>`);
                  if (msg.totalResults && msg.totalResults > msg.shops.length) {
                    _push2(`<div class="text-sm text-zinc-500" data-v-a4777d4f${_scopeId}>${ssrInterpolate(getResultsRangeLabel(index2))}</div>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`</div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (msg.selectableOptions && msg.selectableOptions.length > 0 || msg.shops?.length && selectedShopId.value && selectedShopName.value) {
                  _push2(`<div class="${ssrRenderClass([index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : "", "flex flex-wrap gap-2 p-2 transition-opacity duration-200"])}" data-v-a4777d4f${_scopeId}>`);
                  if (msg.shops?.length && selectedShopId.value && selectedShopName.value) {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer font-medium" data-v-a4777d4f${_scopeId}> Let&#39;s book ${ssrInterpolate(selectedShopName.value)}</button>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`<!--[-->`);
                  ssrRenderList((msg.selectableOptions || []).filter((o) => o.label !== "Load next 20"), (opt, i) => {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" data-v-a4777d4f${_scopeId}>${ssrInterpolate(opt.label)}</button>`);
                  });
                  _push2(`<!--]--></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (Array.isArray(msg.rentalEquipmentOptions)) {
                  _push2(`<div class="${ssrRenderClass([index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : "", "flex flex-wrap gap-2 p-2 transition-opacity duration-200"])}" data-v-a4777d4f${_scopeId}><!--[-->`);
                  ssrRenderList(msg.rentalEquipmentOptions, (eq) => {
                    _push2(`<button type="button" class="${ssrRenderClass(isGearChipSelected(msg, eq) ? "px-3 py-1.5 text-sm rounded-full border border-black dark:border-white text-black dark:text-white transition-colors cursor-pointer font-medium" : "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 dark:hover:text-white transition-colors cursor-pointer")}" data-v-a4777d4f${_scopeId}>${ssrInterpolate(eq.name)}</button>`);
                  });
                  _push2(`<!--]-->`);
                  if (!msg.hideNoneForGear) {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium" data-v-a4777d4f${_scopeId}> None </button>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer font-medium" data-v-a4777d4f${_scopeId}> Done </button></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (msg.courseOptions && msg.courseOptions.length > 0) {
                  _push2(`<div class="${ssrRenderClass([index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : "", "flex flex-wrap gap-2 transition-opacity duration-200"])}" data-v-a4777d4f${_scopeId}><div class="flex gap-2 w-full" data-v-a4777d4f${_scopeId}><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium" data-v-a4777d4f${_scopeId}> Any </button><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" data-v-a4777d4f${_scopeId}> Done </button></div><!--[-->`);
                  ssrRenderList(msg.courseOptions, (course) => {
                    _push2(`<button type="button" class="${ssrRenderClass(isCourseChipSelected(msg, course) ? "w-fit px-3 py-1.5 text-sm rounded-full border border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white font-medium transition-colors cursor-pointer" : "w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer")}" data-v-a4777d4f${_scopeId}>${ssrInterpolate(course.name)}</button>`);
                  });
                  _push2(`<!--]--></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (msg.diveSiteOptions && msg.diveSiteOptions.length > 0) {
                  _push2(`<div class="${ssrRenderClass([index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : "", "flex flex-wrap gap-2 transition-opacity duration-200"])}" data-v-a4777d4f${_scopeId}><div class="flex gap-2 w-full" data-v-a4777d4f${_scopeId}><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium" data-v-a4777d4f${_scopeId}> Any </button><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" data-v-a4777d4f${_scopeId}> Done </button></div><!--[-->`);
                  ssrRenderList(msg.diveSiteOptions, (site) => {
                    _push2(`<button type="button" class="w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer" data-v-a4777d4f${_scopeId}>${ssrInterpolate(site.name)}</button>`);
                  });
                  _push2(`<!--]--></div>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div></div></div>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            });
            _push2(`<!--]-->`);
            if (isLoading.value) {
              _push2(`<div class="flex justify-start" data-v-a4777d4f${_scopeId}><div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3" data-v-a4777d4f${_scopeId}><div class="flex items-center gap-2" data-v-a4777d4f${_scopeId}><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600" data-v-a4777d4f${_scopeId}></div><span class="text-sm text-zinc-900 dark:text-zinc-200" data-v-a4777d4f${_scopeId}>thinking...</span></div></div></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div><div class="flex items-stretch justify-center z-100 overflow-hidden" data-v-a4777d4f${_scopeId}><div class="bg-transparent p-0.5 pt-0 backdrop-blur-sm 2xl:min-w-md max-w-4xl w-full rounded-full overflow-hidden" data-v-a4777d4f${_scopeId}><div class="${ssrRenderClass([
              "p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-full relative overflow-hidden gradient-container z-0",
              isLoading.value ? "animate-ring-gradient !bg-[#02C8FF]" : ""
            ])}" data-v-a4777d4f${_scopeId}><form class="w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10 overflow-hidden" data-v-a4777d4f${_scopeId}><div class="flex items-center gap-1.5 w-full min-w-0 overflow-hidden" data-v-a4777d4f${_scopeId}><div class="flex-1 min-w-0 h-full overflow-hidden" data-v-a4777d4f${_scopeId}><input${ssrRenderAttr("value", userInput.value)} type="text"${ssrIncludeBooleanAttr(isLoading.value) ? " disabled" : ""} placeholder="Ask me anything about dive shops..." class="w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4" data-v-a4777d4f${_scopeId}></div><div class="h-full shrink-0" data-v-a4777d4f${_scopeId}><button type="submit"${ssrIncludeBooleanAttr(isLoading.value || !userInput.value.trim()) ? " disabled" : ""} class="p-2 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20" data-v-a4777d4f${_scopeId}>`);
            if (!isLoading.value) {
              _push2(ssrRenderComponent(unref(ArrowUp), { class: "w-6 h-6" }, null, _parent2, _scopeId));
            } else {
              _push2(`<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-v-a4777d4f${_scopeId}></div>`);
            }
            _push2(`</button></div></div></form></div></div></div></div>`);
            if (selectedShopId.value && isDesktop.value) {
              _push2(`<div class="w-1/2 h-full border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden" data-v-a4777d4f${_scopeId}>`);
              _push2(ssrRenderComponent(_sfc_main$1, {
                key: selectedShopId.value,
                "shop-lookup": selectedShopId.value,
                "is-in-booking-flow": isInBookingFlowForShop(selectedShopId.value),
                "is-form-open": isBookingFormOpen.value,
                "on-start-booking": handleStartBookingFromPanel,
                "on-show-form": handleShowFormFromPanel,
                "on-hide-form": handleHideFormFromPanel,
                onClose: closeShopDetail
              }, null, _parent2, _scopeId));
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (mobileDetailShopId.value && !isDesktop.value) {
              _push2(`<div class="fixed inset-0 z-50 lg:hidden" data-v-a4777d4f${_scopeId}><div class="absolute inset-0 bg-black/50" data-v-a4777d4f${_scopeId}></div><div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 h-full overflow-hidden" data-v-a4777d4f${_scopeId}>`);
              _push2(ssrRenderComponent(_sfc_main$1, {
                key: mobileDetailShopId.value,
                "shop-lookup": mobileDetailShopId.value,
                "is-in-booking-flow": isInBookingFlowForShop(mobileDetailShopId.value),
                "is-form-open": isBookingFormOpen.value,
                "on-start-booking": handleStartBookingFromPanel,
                "on-show-form": handleShowFormFromPanel,
                "on-hide-form": handleHideFormFromPanel,
                onClose: closeShopDetail
              }, null, _parent2, _scopeId));
              _push2(`</div></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div></div>`);
          } else {
            return [
              createVNode(Transition, {
                onEnter: onLoadingEnter,
                onLeave: onLoadingLeave,
                css: false
              }, {
                default: withCtx(() => [
                  isPageLoading.value ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: "fixed inset-0 z-[200] bg-white dark:bg-zinc-900 flex items-center justify-center"
                  }, [
                    createVNode("img", {
                      src: _imports_0,
                      alt: "Glaucus",
                      class: "w-24 h-24"
                    })
                  ])) : createCommentVNode("", true)
                ]),
                _: 1
              }),
              createVNode("div", { class: "flex flex-col h-full w-full relative" }, [
                createVNode("div", { class: "min-h-10 min-w-0 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0" }, [
                  createVNode("div", { class: "flex min-w-0 flex-1 items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700" }, [
                    createVNode("button", {
                      onClick: unref(openMobileMenu),
                      class: "flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer shrink-0"
                    }, [
                      createVNode(unref(Menu), { class: "w-5 h-5" })
                    ], 8, ["onClick"]),
                    createVNode("h1", { class: "text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white min-w-0 truncate" }, " Dive Shop Search")
                  ]),
                  createVNode("div", { class: "flex shrink-0 items-center gap-1 p-1 lg:p-4" }, [
                    canStepBack.value ? (openBlock(), createBlock("button", {
                      key: 0,
                      onClick: stepBack,
                      class: "text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer",
                      title: "Remove last message and your last reply so you can redo that step"
                    }, " Step back ")) : createCommentVNode("", true)
                  ])
                ]),
                createVNode("div", { class: "flex-1 flex flex-row overflow-hidden relative" }, [
                  createVNode("div", {
                    class: [
                      "flex min-w-0 flex-col h-full transition-all duration-300 ease-in-out relative",
                      selectedShopId.value ? "w-full lg:w-1/2" : "w-full"
                    ]
                  }, [
                    createVNode("div", {
                      ref_key: "messagesContainer",
                      ref: messagesContainer,
                      class: "flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-2 *:max-w-3xl *:mx-auto *:w-full"
                    }, [
                      messages.value.length === 0 ? (openBlock(), createBlock("div", {
                        key: 0,
                        class: "flex flex-col items-center justify-center gap-8 h-full"
                      }, [
                        createVNode("div", { class: "text-center space-y-4 flex flex-col items-center" }, [
                          createVNode("h2", { class: "max-w-2xl lg:text-2xl font-bold text-zinc-900 dark:text-white" }, " Tell me what you're looking for in your diving experience, and I'll help you find the best dive shops. "),
                          createVNode("div", { class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4" }, [
                            (openBlock(), createBlock(Fragment, null, renderList(exampleQueries, (example) => {
                              return createVNode("button", {
                                key: example,
                                onClick: ($event) => sendMessage(example),
                                class: "text-left p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900"
                              }, [
                                createVNode("p", { class: "text-sm text-zinc-700 dark:text-zinc-300" }, toDisplayString(example), 1)
                              ], 8, ["onClick"]);
                            }), 64))
                          ])
                        ])
                      ])) : createCommentVNode("", true),
                      (openBlock(true), createBlock(Fragment, null, renderList(messages.value, (msg, index2) => {
                        return openBlock(), createBlock("div", {
                          key: index2,
                          class: ""
                        }, [
                          msg.role === "user" ? (openBlock(), createBlock("div", {
                            key: 0,
                            class: "flex justify-end"
                          }, [
                            createVNode("div", { class: "max-w-[80%] bg-blue-600 text-white rounded-lg p-2" }, [
                              createVNode("p", { class: "text-sm lg:text-base" }, toDisplayString(msg.content), 1)
                            ])
                          ])) : msg.role === "assistant" ? (openBlock(), createBlock("div", {
                            key: 1,
                            class: "flex justify-start"
                          }, [
                            createVNode("div", { class: "md:max-w-[90%] flex-1 min-w-0 flex flex-col gap-2" }, [
                              msg.preamble ? (openBlock(), createBlock("div", {
                                key: 0,
                                class: "bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 chat-bubble-pop-first"
                              }, [
                                createVNode("p", { class: "text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap" }, toDisplayString(msg.preamble), 1)
                              ])) : createCommentVNode("", true),
                              createVNode("div", {
                                class: ["flex flex-col gap-2 min-w-0", { "chat-bubble-pop-follow": msg.preamble }]
                              }, [
                                createVNode("div", { class: "bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2" }, [
                                  createVNode("p", { class: "text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis" }, toDisplayString(msg.content), 1),
                                  (bookingShopForDrawer.value || msg.shopId && msg.shopName) && !(msg.shops && msg.shops.length > 0) ? (openBlock(), createBlock("button", {
                                    key: 0,
                                    type: "button",
                                    onClick: ($event) => openBookingFormDrawerFromMessage(msg),
                                    class: "w-10 shrink-0 self-stretch flex items-center justify-center rounded-sm border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer",
                                    "aria-label": "Open booking form"
                                  }, [
                                    createVNode(unref(ChevronRight), { class: "w-5 h-5" })
                                  ], 8, ["onClick"])) : createCommentVNode("", true)
                                ]),
                                msg.shops && msg.shops.length > 0 ? (openBlock(), createBlock("div", {
                                  key: 0,
                                  class: "flex flex-col gap-2 md:p-2"
                                }, [
                                  createVNode("div", { class: "flex items-center gap-2 text-sm text-zinc-600" }, [
                                    createVNode("span", { class: "font-medium" }, "Top Results:")
                                  ]),
                                  createVNode("div", { class: "grid grid-cols-1 gap-3" }, [
                                    (openBlock(true), createBlock(Fragment, null, renderList(msg.shops, (shop) => {
                                      return openBlock(), createBlock(_sfc_main$2, {
                                        key: shop.id,
                                        shop,
                                        active: selectedShopId.value === shop.id,
                                        onShopSelected: handleShopSelected,
                                        onViewDetails: handleViewDetails
                                      }, null, 8, ["shop", "active"]);
                                    }), 128))
                                  ]),
                                  msg.totalResults && msg.totalResults > msg.shops.length ? (openBlock(), createBlock("div", {
                                    key: 0,
                                    class: "text-sm text-zinc-500"
                                  }, toDisplayString(getResultsRangeLabel(index2)), 1)) : createCommentVNode("", true)
                                ])) : createCommentVNode("", true),
                                msg.selectableOptions && msg.selectableOptions.length > 0 || msg.shops?.length && selectedShopId.value && selectedShopName.value ? (openBlock(), createBlock("div", {
                                  key: 1,
                                  class: ["flex flex-wrap gap-2 p-2 transition-opacity duration-200", index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : ""]
                                }, [
                                  msg.shops?.length && selectedShopId.value && selectedShopName.value ? (openBlock(), createBlock("button", {
                                    key: 0,
                                    type: "button",
                                    onClick: ($event) => sendMessage(selectedShopName.value ? `Let's book ${selectedShopName.value}` : "Let's book this"),
                                    class: "px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                                  }, " Let's book " + toDisplayString(selectedShopName.value), 9, ["onClick"])) : createCommentVNode("", true),
                                  (openBlock(true), createBlock(Fragment, null, renderList((msg.selectableOptions || []).filter((o) => o.label !== "Load next 20"), (opt, i) => {
                                    return openBlock(), createBlock("button", {
                                      key: i,
                                      type: "button",
                                      onClick: ($event) => sendMessage(opt.value, opt.label),
                                      class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    }, toDisplayString(opt.label), 9, ["onClick"]);
                                  }), 128))
                                ], 2)) : createCommentVNode("", true),
                                Array.isArray(msg.rentalEquipmentOptions) ? (openBlock(), createBlock("div", {
                                  key: 2,
                                  class: ["flex flex-wrap gap-2 p-2 transition-opacity duration-200", index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : ""]
                                }, [
                                  (openBlock(true), createBlock(Fragment, null, renderList(msg.rentalEquipmentOptions, (eq) => {
                                    return openBlock(), createBlock("button", {
                                      key: eq.id,
                                      type: "button",
                                      onClick: ($event) => sendMessage(getGearChipClickValue(msg, eq)),
                                      class: isGearChipSelected(msg, eq) ? "px-3 py-1.5 text-sm rounded-full border border-black dark:border-white text-black dark:text-white transition-colors cursor-pointer font-medium" : "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                                    }, toDisplayString(eq.name), 11, ["onClick"]);
                                  }), 128)),
                                  !msg.hideNoneForGear ? (openBlock(), createBlock("button", {
                                    key: 0,
                                    type: "button",
                                    onClick: ($event) => sendMessage("none"),
                                    class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                                  }, " None ", 8, ["onClick"])) : createCommentVNode("", true),
                                  createVNode("button", {
                                    type: "button",
                                    onClick: ($event) => sendMessage("done"),
                                    class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                                  }, " Done ", 8, ["onClick"])
                                ], 2)) : createCommentVNode("", true),
                                msg.courseOptions && msg.courseOptions.length > 0 ? (openBlock(), createBlock("div", {
                                  key: 3,
                                  class: ["flex flex-wrap gap-2 transition-opacity duration-200", index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : ""]
                                }, [
                                  createVNode("div", { class: "flex gap-2 w-full" }, [
                                    createVNode("button", {
                                      type: "button",
                                      onClick: ($event) => sendMessage("any"),
                                      class: "flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                                    }, " Any ", 8, ["onClick"]),
                                    createVNode("button", {
                                      type: "button",
                                      onClick: ($event) => sendMessage("done"),
                                      class: "flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    }, " Done ", 8, ["onClick"])
                                  ]),
                                  (openBlock(true), createBlock(Fragment, null, renderList(msg.courseOptions, (course) => {
                                    return openBlock(), createBlock("button", {
                                      key: course.id,
                                      type: "button",
                                      onClick: ($event) => sendMessage(course.name),
                                      class: isCourseChipSelected(msg, course) ? "w-fit px-3 py-1.5 text-sm rounded-full border border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white font-medium transition-colors cursor-pointer" : "w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    }, toDisplayString(course.name), 11, ["onClick"]);
                                  }), 128))
                                ], 2)) : createCommentVNode("", true),
                                msg.diveSiteOptions && msg.diveSiteOptions.length > 0 ? (openBlock(), createBlock("div", {
                                  key: 4,
                                  class: ["flex flex-wrap gap-2 transition-opacity duration-200", index2 !== activeChipMessageIndex.value ? "opacity-50 pointer-events-none" : ""]
                                }, [
                                  createVNode("div", { class: "flex gap-2 w-full" }, [
                                    createVNode("button", {
                                      type: "button",
                                      onClick: ($event) => sendMessage("any"),
                                      class: "flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                                    }, " Any ", 8, ["onClick"]),
                                    createVNode("button", {
                                      type: "button",
                                      onClick: ($event) => sendMessage("done"),
                                      class: "flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    }, " Done ", 8, ["onClick"])
                                  ]),
                                  (openBlock(true), createBlock(Fragment, null, renderList(msg.diveSiteOptions, (site) => {
                                    return openBlock(), createBlock("button", {
                                      key: site.id,
                                      type: "button",
                                      onClick: ($event) => sendMessage(site.name),
                                      class: "w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    }, toDisplayString(site.name), 9, ["onClick"]);
                                  }), 128))
                                ], 2)) : createCommentVNode("", true)
                              ], 2)
                            ])
                          ])) : createCommentVNode("", true)
                        ]);
                      }), 128)),
                      isLoading.value ? (openBlock(), createBlock("div", {
                        key: 1,
                        class: "flex justify-start"
                      }, [
                        createVNode("div", { class: "bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3" }, [
                          createVNode("div", { class: "flex items-center gap-2" }, [
                            createVNode("div", { class: "animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600" }),
                            createVNode("span", { class: "text-sm text-zinc-900 dark:text-zinc-200" }, "thinking...")
                          ])
                        ])
                      ])) : createCommentVNode("", true)
                    ], 512),
                    createVNode("div", { class: "flex items-stretch justify-center z-100 overflow-hidden" }, [
                      createVNode("div", { class: "bg-transparent p-0.5 pt-0 backdrop-blur-sm 2xl:min-w-md max-w-4xl w-full rounded-full overflow-hidden" }, [
                        createVNode("div", {
                          class: [
                            "p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-full relative overflow-hidden gradient-container z-0",
                            isLoading.value ? "animate-ring-gradient !bg-[#02C8FF]" : ""
                          ]
                        }, [
                          createVNode("form", {
                            class: "w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10 overflow-hidden",
                            onSubmit: withModifiers(handleSubmit, ["prevent"])
                          }, [
                            createVNode("div", { class: "flex items-center gap-1.5 w-full min-w-0 overflow-hidden" }, [
                              createVNode("div", { class: "flex-1 min-w-0 h-full overflow-hidden" }, [
                                withDirectives(createVNode("input", {
                                  ref_key: "chatInputRef",
                                  ref: chatInputRef,
                                  "onUpdate:modelValue": ($event) => userInput.value = $event,
                                  type: "text",
                                  disabled: isLoading.value,
                                  placeholder: "Ask me anything about dive shops...",
                                  class: "w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4"
                                }, null, 8, ["onUpdate:modelValue", "disabled"]), [
                                  [vModelText, userInput.value]
                                ])
                              ]),
                              createVNode("div", { class: "h-full shrink-0" }, [
                                createVNode("button", {
                                  type: "submit",
                                  disabled: isLoading.value || !userInput.value.trim(),
                                  class: "p-2 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20"
                                }, [
                                  !isLoading.value ? (openBlock(), createBlock(unref(ArrowUp), {
                                    key: 0,
                                    class: "w-6 h-6"
                                  })) : (openBlock(), createBlock("div", {
                                    key: 1,
                                    class: "animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                                  }))
                                ], 8, ["disabled"])
                              ])
                            ])
                          ], 32)
                        ], 2)
                      ])
                    ])
                  ], 2),
                  createVNode(Transition, {
                    onEnter: onShopPanelEnter,
                    onLeave: onShopPanelLeave,
                    css: false
                  }, {
                    default: withCtx(() => [
                      selectedShopId.value && isDesktop.value ? (openBlock(), createBlock("div", {
                        key: 0,
                        class: "w-1/2 h-full border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden"
                      }, [
                        (openBlock(), createBlock(_sfc_main$1, {
                          key: selectedShopId.value,
                          "shop-lookup": selectedShopId.value,
                          "is-in-booking-flow": isInBookingFlowForShop(selectedShopId.value),
                          "is-form-open": isBookingFormOpen.value,
                          "on-start-booking": handleStartBookingFromPanel,
                          "on-show-form": handleShowFormFromPanel,
                          "on-hide-form": handleHideFormFromPanel,
                          onClose: closeShopDetail
                        }, null, 8, ["shop-lookup", "is-in-booking-flow", "is-form-open"]))
                      ])) : createCommentVNode("", true)
                    ]),
                    _: 1
                  }),
                  createVNode(Transition, {
                    onEnter: onMobileDrawerEnter,
                    onLeave: onMobileDrawerLeave,
                    css: false
                  }, {
                    default: withCtx(() => [
                      mobileDetailShopId.value && !isDesktop.value ? (openBlock(), createBlock("div", {
                        key: 0,
                        class: "fixed inset-0 z-50 lg:hidden"
                      }, [
                        createVNode("div", {
                          onClick: closeShopDetail,
                          class: "absolute inset-0 bg-black/50"
                        }),
                        createVNode("div", {
                          onClick: withModifiers(() => {
                          }, ["stop"]),
                          class: "absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 h-full overflow-hidden"
                        }, [
                          (openBlock(), createBlock(_sfc_main$1, {
                            key: mobileDetailShopId.value,
                            "shop-lookup": mobileDetailShopId.value,
                            "is-in-booking-flow": isInBookingFlowForShop(mobileDetailShopId.value),
                            "is-form-open": isBookingFormOpen.value,
                            "on-start-booking": handleStartBookingFromPanel,
                            "on-show-form": handleShowFormFromPanel,
                            "on-hide-form": handleHideFormFromPanel,
                            onClose: closeShopDetail
                          }, null, 8, ["shop-lookup", "is-in-booking-flow", "is-form-open"]))
                        ], 8, ["onClick"])
                      ])) : createCommentVNode("", true)
                    ]),
                    _: 1
                  })
                ])
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a4777d4f"]]);

export { index as default };
//# sourceMappingURL=index-DahzzEwi.mjs.map
