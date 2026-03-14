import { _ as __nuxt_component_0 } from './nuxt-layout-CjyLX7FU.mjs';
import { ref, computed, watch, mergeProps, withCtx, unref, createVNode, Transition, createBlock, createCommentVNode, openBlock, Fragment, renderList, toDisplayString, withModifiers, withDirectives, vModelText, nextTick, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttr, ssrRenderClass, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderAttrs } from 'vue/server-renderer';
import { _ as _imports_0 } from './virtual_public-Ch7PIFET.mjs';
import { Menu, ChevronRight, ArrowUp, Star, MapPin, Languages, Globe, Phone, Mail } from 'lucide-vue-next';
import gsap from 'gsap';
import { _ as _sfc_main$3 } from './DiveShopDetail-G563NIeI.mjs';
import { u as useDrawer } from './useSupabase-CXasCJo6.mjs';
import { a as useRoute, u as useHead } from './server.mjs';
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
    shopId: {
      type: String,
      required: true
    }
  },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(_sfc_main$3, mergeProps({
        "shop-id": __props.shopId,
        "show-close-button": true,
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
const readCache = () => {
  return null;
};
const writeCache = (state) => {
  return;
};
const useSearchCache = () => {
  const getCache = () => readCache();
  const setCache = (state) => {
    writeCache({ ...state });
  };
  const clearCache = () => {
  };
  return {
    getCache,
    setCache,
    clearCache
  };
};
const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    const userInput = ref("");
    const chatInputRef = ref(null);
    const isLoading = ref(false);
    const messages = ref([]);
    const messagesContainer = ref(null);
    const isRestoringCache = ref(true);
    const abortController = ref(null);
    const selectedShopId = ref(null);
    const pendingBookingPayload = ref(null);
    const mobileDetailShopId = ref(null);
    const isPageLoading = ref(true);
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
    const getInitialDesktop = () => {
      {
        return true;
      }
    };
    const isDesktop = ref(getInitialDesktop());
    const exampleQueries = [
      "I want to do wreck diving in Bali from Jan 1-7, 2026",
      "Looking for beginner-friendly dive shops in the Maldives",
      "Find highly rated dive shops in Thailand",
      "Shops in Mexico that offer advanced certification courses"
    ];
    const { setCache } = useSearchCache();
    const { openMobileMenu, openDrawer } = useDrawer();
    const persistCache = () => {
      if (isRestoringCache.value) return;
      setCache({
        messages: messages.value,
        userInput: userInput.value,
        lastQuery: typeof route.query.q === "string" ? route.query.q : null
      });
    };
    watch([messages, userInput], persistCache, { deep: true });
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
        const response = await $fetch("/api/ai-search", {
          method: "POST",
          signal: currentAbortController.signal,
          body: {
            message,
            history: messages.value.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
              role: m.role,
              content: m.content
            })),
            selectedShopId: selectedShopId.value || void 0,
            lastShops,
            shopsAlreadyShownCount,
            lastIntent,
            lastBookingShopId,
            ...inBookingFlow && lastBookingShopName ? { lastBookingShopName } : {},
            ...inBookingFlow && lastPayload ? { bookingPayload: lastPayload } : {},
            ...pendingBookingPayload.value ? { pendingBookingPayload: pendingBookingPayload.value } : {}
          }
        });
        if (currentAbortController.signal.aborted) {
          return;
        }
        if (response.success) {
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
                desiredDiveSites: Array.isArray(storedPayload.desiredDiveSites) ? storedPayload.desiredDiveSites : [],
                divers: (storedPayload.divers ?? []).map((d) => ({
                  name: d.name ?? "",
                  certificationNumber: d.certificationNumber ?? "",
                  numberOfDives: d.numberOfDives ?? "",
                  height: d.height ?? "",
                  heightUnit: d.heightUnit ?? "cm",
                  weight: d.weight ?? "",
                  weightUnit: d.weightUnit ?? "kg",
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
            diveSiteOptions: response.diveSiteOptions || void 0
          });
          if (response.pendingBookingPayload) {
            pendingBookingPayload.value = response.pendingBookingPayload;
            selectedShopId.value = null;
          } else {
            pendingBookingPayload.value = null;
          }
          if (response.intent === "booking" && response.shopId) {
            selectedShopId.value = response.shopId;
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
      return last.role === "assistant" && prev.role === "user";
    });
    const stepBack = () => {
      if (!canStepBack.value) return;
      messages.value = messages.value.slice(0, -2);
      persistCache();
    };
    const clearConversation = () => {
      if (abortController.value) {
        abortController.value.abort();
        abortController.value = null;
      }
      messages.value = [];
      userInput.value = "";
      isLoading.value = false;
      selectedShopId.value = null;
      pendingBookingPayload.value = null;
      mobileDetailShopId.value = null;
    };
    const handleShopSelected = (shop) => {
      selectedShopId.value = shop.id;
    };
    const handleViewDetails = (shop) => {
      selectedShopId.value = shop.id;
      mobileDetailShopId.value = shop.id;
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
    const closeShopDetail = () => {
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
              _push2(`<div class="fixed inset-0 z-[100] bg-white dark:bg-zinc-900 flex items-center justify-center"${_scopeId}><img${ssrRenderAttr("src", _imports_0)} alt="Glaucus" class="w-24 h-24"${_scopeId}></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<div class="flex flex-col h-full w-full relative"${_scopeId}><div class="min-h-10 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0"${_scopeId}><div class="flex items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700"${_scopeId}><button class="flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer"${_scopeId}>`);
            _push2(ssrRenderComponent(unref(Menu), { class: "w-5 h-5" }, null, _parent2, _scopeId));
            _push2(`</button><h1 class="text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white overflow-auto truncate"${_scopeId}> Dive Shop Search</h1></div><div class="flex items-center gap-1 p-1 lg:p-4"${_scopeId}>`);
            if (canStepBack.value) {
              _push2(`<button class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer" title="Remove last message and your last reply so you can redo that step"${_scopeId}> Step back </button>`);
            } else {
              _push2(`<!---->`);
            }
            if (messages.value.length > 0) {
              _push2(`<button class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer"${_scopeId}> New Chat </button>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div></div><div class="flex-1 flex flex-row overflow-hidden relative"${_scopeId}><div class="${ssrRenderClass([
              "flex flex-col h-full transition-all duration-300 ease-in-out relative",
              selectedShopId.value ? "w-full lg:w-1/2" : "w-full"
            ])}"${_scopeId}><div class="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-2 *:max-w-3xl *:mx-auto *:w-full"${_scopeId}>`);
            if (messages.value.length === 0) {
              _push2(`<div class="flex flex-col items-center justify-center gap-8 h-full"${_scopeId}><div class="text-center space-y-4 flex flex-col items-center"${_scopeId}><h2 class="max-w-2xl lg:text-2xl font-bold text-zinc-900 dark:text-white"${_scopeId}> Tell me what you&#39;re looking for in your diving experience, and I&#39;ll help you find the best dive shops. </h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4"${_scopeId}><!--[-->`);
              ssrRenderList(exampleQueries, (example) => {
                _push2(`<button class="text-left p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900"${_scopeId}><p class="text-sm text-zinc-700 dark:text-zinc-300"${_scopeId}>${ssrInterpolate(example)}</p></button>`);
              });
              _push2(`<!--]--></div></div></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--[-->`);
            ssrRenderList(messages.value, (msg, index) => {
              _push2(`<div class=""${_scopeId}>`);
              if (msg.role === "user") {
                _push2(`<div class="flex justify-end"${_scopeId}><div class="max-w-[80%] bg-blue-600 text-white rounded-lg p-2"${_scopeId}><p class="text-sm lg:text-base"${_scopeId}>${ssrInterpolate(msg.content)}</p></div></div>`);
              } else if (msg.role === "assistant") {
                _push2(`<div class="flex justify-start"${_scopeId}><div class="md:max-w-[90%] flex-1 min-w-0 flex flex-col gap-2"${_scopeId}><div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2"${_scopeId}><p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis"${_scopeId}>${ssrInterpolate(msg.content)}</p>`);
                if (bookingShopForDrawer.value && !(msg.shops && msg.shops.length > 0)) {
                  _push2(`<button type="button" class="w-10 shrink-0 self-stretch flex items-center justify-center rounded-smimage.png border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer" aria-label="Open booking form"${_scopeId}>`);
                  _push2(ssrRenderComponent(unref(ChevronRight), { class: "w-5 h-5" }, null, _parent2, _scopeId));
                  _push2(`</button>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div>`);
                if (msg.shops && msg.shops.length > 0) {
                  _push2(`<div class="flex flex-col gap-2 md:p-2"${_scopeId}><div class="flex items-center gap-2 text-sm text-zinc-600"${_scopeId}><span class="font-medium"${_scopeId}>Top Results:</span></div><div class="grid grid-cols-1 gap-3"${_scopeId}><!--[-->`);
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
                    _push2(`<div class="text-sm text-zinc-500"${_scopeId}>${ssrInterpolate(getResultsRangeLabel(index))}</div>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`</div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (msg.selectableOptions && msg.selectableOptions.length > 0 || msg.shops?.length && selectedShopId.value && selectedShopName.value) {
                  _push2(`<div class="flex flex-wrap gap-2 p-2"${_scopeId}>`);
                  if (msg.shops?.length && selectedShopId.value && selectedShopName.value) {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"${_scopeId}> Let&#39;s book ${ssrInterpolate(selectedShopName.value)}</button>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`<!--[-->`);
                  ssrRenderList((msg.selectableOptions || []).filter((o) => o.label !== "Load next 20"), (opt, i) => {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"${_scopeId}>${ssrInterpolate(opt.label)}</button>`);
                  });
                  _push2(`<!--]--></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (Array.isArray(msg.rentalEquipmentOptions)) {
                  _push2(`<div class="flex flex-wrap gap-2 p-2"${_scopeId}><!--[-->`);
                  ssrRenderList(msg.rentalEquipmentOptions, (eq) => {
                    _push2(`<button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"${_scopeId}>${ssrInterpolate(eq.name)}</button>`);
                  });
                  _push2(`<!--]--><button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"${_scopeId}> None </button><button type="button" class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"${_scopeId}> Done </button></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (msg.diveSiteOptions && msg.diveSiteOptions.length > 0) {
                  _push2(`<div class="flex flex-wrap gap-2"${_scopeId}><div class="flex gap-2 w-full"${_scopeId}><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"${_scopeId}> Any </button><button type="button" class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"${_scopeId}> Done </button></div><!--[-->`);
                  ssrRenderList(msg.diveSiteOptions, (site) => {
                    _push2(`<button type="button" class="w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"${_scopeId}>${ssrInterpolate(site.name)}</button>`);
                  });
                  _push2(`<!--]--></div>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div></div>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            });
            _push2(`<!--]-->`);
            if (isLoading.value) {
              _push2(`<div class="flex justify-start"${_scopeId}><div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3"${_scopeId}><div class="flex items-center gap-2"${_scopeId}><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600"${_scopeId}></div><span class="text-sm text-zinc-900 dark:text-zinc-200"${_scopeId}>typing...</span></div></div></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div><div class="flex items-stretch justify-center z-100 overflow-hidden"${_scopeId}><div class="bg-transparent p-0.5 pt-0 backdrop-blur-sm md:min-w-md max-w-4xl w-full rounded-full"${_scopeId}><div class="${ssrRenderClass([
              "p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-full relative overflow-x-hidden overflow-y-visible gradient-container z-0",
              isLoading.value ? "animate-ring-gradient !bg-[#02C8FF]" : ""
            ])}"${_scopeId}><form class="w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10"${_scopeId}><div class="flex items-center gap-1.5 w-full min-w-0"${_scopeId}><div class="flex-1 min-w-0 h-full"${_scopeId}><input${ssrRenderAttr("value", userInput.value)} type="text"${ssrIncludeBooleanAttr(isLoading.value) ? " disabled" : ""} placeholder="Ask me anything about dive shops..." class="w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4"${_scopeId}></div><div class="h-full shrink-0"${_scopeId}><button type="submit"${ssrIncludeBooleanAttr(isLoading.value || !userInput.value.trim()) ? " disabled" : ""} class="p-2 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20"${_scopeId}>`);
            if (!isLoading.value) {
              _push2(ssrRenderComponent(unref(ArrowUp), { class: "w-6 h-6" }, null, _parent2, _scopeId));
            } else {
              _push2(`<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"${_scopeId}></div>`);
            }
            _push2(`</button></div></div></form></div></div></div></div>`);
            if (selectedShopId.value && isDesktop.value) {
              _push2(`<div class="w-1/2 h-full border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden"${_scopeId}>`);
              _push2(ssrRenderComponent(_sfc_main$1, {
                key: selectedShopId.value,
                "shop-id": selectedShopId.value,
                onClose: closeShopDetail
              }, null, _parent2, _scopeId));
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (mobileDetailShopId.value && !isDesktop.value) {
              _push2(`<div class="fixed inset-0 z-50 lg:hidden"${_scopeId}><div class="absolute inset-0 bg-black/50"${_scopeId}></div><div class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 h-full overflow-hidden"${_scopeId}>`);
              _push2(ssrRenderComponent(_sfc_main$1, {
                key: mobileDetailShopId.value,
                "shop-id": mobileDetailShopId.value,
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
                    class: "fixed inset-0 z-[100] bg-white dark:bg-zinc-900 flex items-center justify-center"
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
                createVNode("div", { class: "min-h-10 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0" }, [
                  createVNode("div", { class: "flex items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700" }, [
                    createVNode("button", {
                      onClick: unref(openMobileMenu),
                      class: "flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer"
                    }, [
                      createVNode(unref(Menu), { class: "w-5 h-5" })
                    ], 8, ["onClick"]),
                    createVNode("h1", { class: "text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white overflow-auto truncate" }, " Dive Shop Search")
                  ]),
                  createVNode("div", { class: "flex items-center gap-1 p-1 lg:p-4" }, [
                    canStepBack.value ? (openBlock(), createBlock("button", {
                      key: 0,
                      onClick: stepBack,
                      class: "text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer",
                      title: "Remove last message and your last reply so you can redo that step"
                    }, " Step back ")) : createCommentVNode("", true),
                    messages.value.length > 0 ? (openBlock(), createBlock("button", {
                      key: 1,
                      onClick: clearConversation,
                      class: "text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer"
                    }, " New Chat ")) : createCommentVNode("", true)
                  ])
                ]),
                createVNode("div", { class: "flex-1 flex flex-row overflow-hidden relative" }, [
                  createVNode("div", {
                    class: [
                      "flex flex-col h-full transition-all duration-300 ease-in-out relative",
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
                      (openBlock(true), createBlock(Fragment, null, renderList(messages.value, (msg, index) => {
                        return openBlock(), createBlock("div", {
                          key: index,
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
                              createVNode("div", { class: "bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2" }, [
                                createVNode("p", { class: "text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis" }, toDisplayString(msg.content), 1),
                                bookingShopForDrawer.value && !(msg.shops && msg.shops.length > 0) ? (openBlock(), createBlock("button", {
                                  key: 0,
                                  type: "button",
                                  onClick: openBookingFormDrawer,
                                  class: "w-10 shrink-0 self-stretch flex items-center justify-center rounded-smimage.png border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer",
                                  "aria-label": "Open booking form"
                                }, [
                                  createVNode(unref(ChevronRight), { class: "w-5 h-5" })
                                ])) : createCommentVNode("", true)
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
                                }, toDisplayString(getResultsRangeLabel(index)), 1)) : createCommentVNode("", true)
                              ])) : createCommentVNode("", true),
                              msg.selectableOptions && msg.selectableOptions.length > 0 || msg.shops?.length && selectedShopId.value && selectedShopName.value ? (openBlock(), createBlock("div", {
                                key: 1,
                                class: "flex flex-wrap gap-2 p-2"
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
                                    class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                  }, toDisplayString(opt.label), 9, ["onClick"]);
                                }), 128))
                              ])) : createCommentVNode("", true),
                              Array.isArray(msg.rentalEquipmentOptions) ? (openBlock(), createBlock("div", {
                                key: 2,
                                class: "flex flex-wrap gap-2 p-2"
                              }, [
                                (openBlock(true), createBlock(Fragment, null, renderList(msg.rentalEquipmentOptions, (eq) => {
                                  return openBlock(), createBlock("button", {
                                    key: eq.id,
                                    type: "button",
                                    onClick: ($event) => sendMessage(eq.name),
                                    class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                  }, toDisplayString(eq.name), 9, ["onClick"]);
                                }), 128)),
                                createVNode("button", {
                                  type: "button",
                                  onClick: ($event) => sendMessage("none"),
                                  class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                                }, " None ", 8, ["onClick"]),
                                createVNode("button", {
                                  type: "button",
                                  onClick: ($event) => sendMessage("done"),
                                  class: "px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                }, " Done ", 8, ["onClick"])
                              ])) : createCommentVNode("", true),
                              msg.diveSiteOptions && msg.diveSiteOptions.length > 0 ? (openBlock(), createBlock("div", {
                                key: 3,
                                class: "flex flex-wrap gap-2"
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
                              ])) : createCommentVNode("", true)
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
                            createVNode("span", { class: "text-sm text-zinc-900 dark:text-zinc-200" }, "typing...")
                          ])
                        ])
                      ])) : createCommentVNode("", true)
                    ], 512),
                    createVNode("div", { class: "flex items-stretch justify-center z-100 overflow-hidden" }, [
                      createVNode("div", { class: "bg-transparent p-0.5 pt-0 backdrop-blur-sm md:min-w-md max-w-4xl w-full rounded-full" }, [
                        createVNode("div", {
                          class: [
                            "p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-full relative overflow-x-hidden overflow-y-visible gradient-container z-0",
                            isLoading.value ? "animate-ring-gradient !bg-[#02C8FF]" : ""
                          ]
                        }, [
                          createVNode("form", {
                            class: "w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10",
                            onSubmit: withModifiers(handleSubmit, ["prevent"])
                          }, [
                            createVNode("div", { class: "flex items-center gap-1.5 w-full min-w-0" }, [
                              createVNode("div", { class: "flex-1 min-w-0 h-full" }, [
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
                          "shop-id": selectedShopId.value,
                          onClose: closeShopDetail
                        }, null, 8, ["shop-id"]))
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
                        createVNode("div", { class: "absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 h-full overflow-hidden" }, [
                          (openBlock(), createBlock(_sfc_main$1, {
                            key: mobileDetailShopId.value,
                            "shop-id": mobileDetailShopId.value,
                            onClose: closeShopDetail
                          }, null, 8, ["shop-id"]))
                        ])
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

export { _sfc_main as default };
//# sourceMappingURL=index-BzXQb7ne.mjs.map
