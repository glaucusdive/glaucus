import { a as useRoute, _ as __nuxt_component_0$1, k as __nuxt_component_1$1 } from './server.mjs';
import { computed, ref, mergeProps, unref, withCtx, createVNode, createTextVNode, watch, renderSlot, defineComponent, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr, ssrRenderSlot, ssrInterpolate, ssrRenderList, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { u as useChatSessions, _ as _imports_0 } from './useChatSessions-DRpcVOcE.mjs';
import { X, User, LogIn, LogOut, Sun, Moon, Star } from 'lucide-vue-next';
import { u as useDrawer } from './useDrawer-DEsd6Mko.mjs';
import { u as useAuth } from './useAuth-8ihLM1hW.mjs';
import { u as useSupabase } from './useSupabase-eANk4KtY.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
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
import 'vue-router';
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

const _sfc_main$4 = {
  __name: "NavLink",
  __ssrInlineRender: true,
  props: {
    to: {
      type: String,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ["click"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const route = useRoute();
    const isActive = computed(() => route.path === props.to);
    const handleClick = (event) => {
      emit("click", event);
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      if (!__props.disabled) {
        _push(ssrRenderComponent(_component_NuxtLink, mergeProps({
          to: __props.to,
          class: [
            "text-sm font-medium bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 px-4 py-2 rounded-sm transition-colors inline-flex items-center gap-2 w-full",
            unref(isActive) ? "!bg-zinc-200/50 dark:!bg-zinc-800/50 !text-black dark:!text-white" : "text-zinc-600 dark:text-zinc-400"
          ],
          onClick: handleClick
        }, _attrs), {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
            } else {
              return [
                renderSlot(_ctx.$slots, "default")
              ];
            }
          }),
          _: 3
        }, _parent));
      } else {
        _push(`<span${ssrRenderAttrs(mergeProps({ class: [
          "text-sm font-medium bg-transparent px-4 py-2 rounded-sm transition-colors opacity-50 cursor-not-allowed text-zinc-600 dark:text-zinc-400 inline-flex items-center gap-2 w-full"
        ] }, _attrs))}>`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</span>`);
      }
    };
  }
};
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/NavLink.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const getInitialTheme = () => {
  {
    return "light";
  }
};
const isDark = ref(getInitialTheme() === "dark");
const useTheme = () => {
  watch(isDark, (newValue) => {
  });
  const toggleTheme = () => {
    console.log(`[Theme] Toggling from ${isDark.value ? "dark" : "light"} to ${!isDark.value ? "dark" : "light"}`);
    isDark.value = !isDark.value;
  };
  const setDark = () => {
    isDark.value = true;
  };
  const setLight = () => {
    isDark.value = false;
  };
  return {
    isDark,
    toggleTheme,
    setDark,
    setLight
  };
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "BookingForm",
  __ssrInlineRender: true,
  props: {
    shopId: {
      type: String,
      required: true
    },
    shopName: {
      type: String,
      required: true
    },
    /** Pre-fill form from chat-collected booking payload or resumed draft */
    initialPayload: {
      type: Object,
      default: void 0
    },
    /** When resuming a draft, pass draft id to update existing draft on save */
    draftId: {
      type: String,
      default: void 0
    }
  },
  setup(__props) {
    const props = __props;
    useSupabase();
    const { isSignedIn } = useAuth();
    const today = computed(() => {
      const date = /* @__PURE__ */ new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });
    const formData = ref({
      shopId: props.shopId,
      name: "",
      email: "",
      numberOfDivers: 1,
      divers: [
        {
          name: "",
          certificationNumber: "",
          numberOfDives: "",
          height: "",
          heightUnit: "cm",
          weight: "",
          weightUnit: "kg",
          gear: []
        }
      ],
      startDate: "",
      endDate: "",
      desiredDiveSites: []
    });
    function applyInitialPayload() {
      const p = props.initialPayload;
      if (!p || typeof p !== "object") return;
      if (p.shopId != null) formData.value.shopId = String(p.shopId);
      if (p.name != null) formData.value.name = String(p.name);
      if (p.email != null) formData.value.email = String(p.email);
      if (p.startDate != null) formData.value.startDate = String(p.startDate);
      if (p.endDate != null) formData.value.endDate = String(p.endDate);
      const numDivers = p.numberOfDivers != null && Number(p.numberOfDivers) >= 1 ? Number(p.numberOfDivers) : 1;
      formData.value.numberOfDivers = numDivers;
      if (Array.isArray(p.divers) && p.divers.length > 0) {
        formData.value.divers = p.divers.slice(0, numDivers).map((d) => {
          const item = d && typeof d === "object" ? d : {};
          return {
            name: item.name ?? "",
            certificationNumber: item.certificationNumber ?? "",
            numberOfDives: item.numberOfDives ?? "",
            height: item.height ?? "",
            heightUnit: item.heightUnit === "ft-in" ? "ft-in" : "cm",
            weight: item.weight ?? "",
            weightUnit: item.weightUnit === "lbs" ? "lbs" : "kg",
            gear: Array.isArray(item.gear) ? item.gear.map((g) => ({ gearType: g && typeof g === "object" ? g.gearType : "" })) : []
          };
        });
        while (formData.value.divers.length < numDivers) {
          formData.value.divers.push({
            name: "",
            certificationNumber: "",
            numberOfDives: "",
            height: "",
            heightUnit: "cm",
            weight: "",
            weightUnit: "kg",
            gear: []
          });
        }
      } else {
        updateDiversCount(numDivers);
      }
      if (Array.isArray(p.desiredDiveSites)) formData.value.desiredDiveSites = p.desiredDiveSites.filter(Boolean);
    }
    watch(() => props.initialPayload, () => applyInitialPayload(), { deep: true });
    watch(() => formData.value.name, (newName) => {
      if (formData.value.divers[0]) {
        formData.value.divers[0].name = newName;
      }
    });
    const updateDiversCount = (count) => {
      const currentCount = formData.value.divers.length;
      if (count > currentCount) {
        for (let i = currentCount; i < count; i++) {
          formData.value.divers.push({
            name: "",
            certificationNumber: "",
            numberOfDives: "",
            height: "",
            heightUnit: "cm",
            weight: "",
            weightUnit: "kg",
            gear: []
          });
        }
      } else if (count < currentCount) {
        formData.value.divers = formData.value.divers.slice(0, count);
      }
    };
    const gearTypes = [
      "Wetsuit",
      "Drysuit",
      "BCD",
      "Regulator",
      "Fins",
      "Mask",
      "Snorkel",
      "Dive Computer",
      "Weight Belt",
      "Tank"
    ];
    const diveSites = ref([]);
    const diveSitesLoading = ref(true);
    const submitLoading = ref(false);
    const submitError = ref("");
    const draftLoading = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col h-full" }, _attrs))}><div class="w-full h-10 lg:h-18 p-1 border-b border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center"><div class="w-full flex items-center justify-between px-2 overflow-auto"><h2 class="text-base font-medium truncate text-zinc-900 dark:text-white">Book with ${ssrInterpolate(__props.shopName)}</h2><button class="lg:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors cursor-pointer text-zinc-900 dark:text-white">`);
      _push(ssrRenderComponent(unref(X), { class: "w-5 h-5" }, null, _parent));
      _push(`</button></div></div><div class="w-full h-full overflow-y-auto"><form class="flex flex-col gap-2 relative pt-2"><h3 class="text-base font-bold px-2 text-zinc-900 dark:text-white">Trip Information</h3><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2"><label for="name" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Name</label><input type="text" id="name"${ssrRenderAttr("value", formData.value.name)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></fieldset><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2"><label for="email" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Email</label><input type="email" id="email"${ssrRenderAttr("value", formData.value.email)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></fieldset><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2"><label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Dates for Diving</label><div class="flex flex-col gap-1"><label for="startDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Start Date</label><input type="date" id="startDate"${ssrRenderAttr("value", formData.value.startDate)}${ssrRenderAttr("min", today.value)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex flex-col gap-1"><label for="endDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">End Date</label><input type="date" id="endDate"${ssrRenderAttr("value", formData.value.endDate)}${ssrRenderAttr("min", formData.value.startDate || today.value)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div></fieldset><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2"><label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Desired Dive Sites (optional)</label>`);
      if (diveSitesLoading.value) {
        _push(`<div class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">Loading dive sites…</div>`);
      } else if (diveSites.value.length === 0) {
        _push(`<div class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">No dive sites listed for this shop.</div>`);
      } else {
        _push(`<div class="flex flex-col gap-1 px-2"><!--[-->`);
        ssrRenderList(diveSites.value, (site) => {
          _push(`<label class="flex items-center gap-2 p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer"><input type="checkbox"${ssrRenderAttr("value", site.name)}${ssrIncludeBooleanAttr(Array.isArray(formData.value.desiredDiveSites) ? ssrLooseContain(formData.value.desiredDiveSites, site.name) : formData.value.desiredDiveSites) ? " checked" : ""} class="cursor-pointer"><span class="text-sm text-zinc-900 dark:text-white">${ssrInterpolate(site.name)}</span></label>`);
        });
        _push(`<!--]--></div>`);
      }
      _push(`</fieldset><hr class="border-zinc-300 dark:border-zinc-700"><h3 class="text-base font-bold px-2 text-zinc-900 dark:text-white">Diver Information</h3><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2"><label for="numberOfDivers" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Number of Divers</label><input type="number" id="numberOfDivers"${ssrRenderAttr("value", formData.value.numberOfDivers)} min="1" required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></fieldset><!--[-->`);
      ssrRenderList(formData.value.divers, (diver, index) => {
        _push(`<div class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2"><h3 class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Diver ${ssrInterpolate(index + 1)}</h3><div class="flex flex-col gap-1"><label${ssrRenderAttr("for", `diver-name-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Name</label><input type="text"${ssrRenderAttr("id", `diver-name-${index}`)}${ssrRenderAttr("value", diver.name)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex flex-col gap-1"><label${ssrRenderAttr("for", `diver-cert-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Certification Number</label><input type="text"${ssrRenderAttr("id", `diver-cert-${index}`)}${ssrRenderAttr("value", diver.certificationNumber)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex flex-col gap-1"><label${ssrRenderAttr("for", `diver-dives-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Number of Dives Completed</label><input type="text"${ssrRenderAttr("id", `diver-dives-${index}`)}${ssrRenderAttr("value", diver.numberOfDives)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex gap-2"><div class="flex flex-col gap-1 flex-1"><label${ssrRenderAttr("for", `diver-height-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Height</label><input type="text"${ssrRenderAttr("id", `diver-height-${index}`)}${ssrRenderAttr("value", diver.height)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex flex-col gap-1 w-20"><label${ssrRenderAttr("for", `diver-height-unit-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label><select${ssrRenderAttr("id", `diver-height-unit-${index}`)} class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"><option value="ft-in"${ssrIncludeBooleanAttr(Array.isArray(diver.heightUnit) ? ssrLooseContain(diver.heightUnit, "ft-in") : ssrLooseEqual(diver.heightUnit, "ft-in")) ? " selected" : ""}>ft&#39; in&quot;</option><option value="cm"${ssrIncludeBooleanAttr(Array.isArray(diver.heightUnit) ? ssrLooseContain(diver.heightUnit, "cm") : ssrLooseEqual(diver.heightUnit, "cm")) ? " selected" : ""}>cm</option></select></div></div><div class="flex gap-2"><div class="flex flex-col gap-1 flex-1"><label${ssrRenderAttr("for", `diver-weight-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Weight</label><input type="text"${ssrRenderAttr("id", `diver-weight-${index}`)}${ssrRenderAttr("value", diver.weight)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"></div><div class="flex flex-col gap-1 w-20"><label${ssrRenderAttr("for", `diver-weight-unit-${index}`)} class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label><select${ssrRenderAttr("id", `diver-weight-unit-${index}`)} class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"><option value="kg"${ssrIncludeBooleanAttr(Array.isArray(diver.weightUnit) ? ssrLooseContain(diver.weightUnit, "kg") : ssrLooseEqual(diver.weightUnit, "kg")) ? " selected" : ""}>kg</option><option value="lbs"${ssrIncludeBooleanAttr(Array.isArray(diver.weightUnit) ? ssrLooseContain(diver.weightUnit, "lbs") : ssrLooseEqual(diver.weightUnit, "lbs")) ? " selected" : ""}>lbs</option></select></div></div><div class="flex flex-col gap-2"><div class="flex items-center justify-between px-2"><label class="text-xs text-zinc-600 dark:text-zinc-400">Rental Gear</label><button type="button" class="text-xs bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-3 py-1 rounded-sm font-medium cursor-pointer text-zinc-900 dark:text-white"> + Add Gear </button></div><!--[-->`);
        ssrRenderList(diver.gear, (gear, gearIndex) => {
          _push(`<div class="bg-white dark:bg-zinc-900 rounded-md flex flex-col gap-2 p-2 border border-zinc-200 dark:border-zinc-700"><div class="flex items-center justify-between"><span class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Gear Item ${ssrInterpolate(gearIndex + 1)}</span><button type="button" class="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium cursor-pointer"> Remove </button></div><div class="flex flex-col gap-1"><label${ssrRenderAttr("for", `diver-${index}-gear-type-${gearIndex}`)} class="text-xs text-zinc-600 dark:text-zinc-400">Gear Type</label><select${ssrRenderAttr("id", `diver-${index}-gear-type-${gearIndex}`)} required class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"><option value=""${ssrIncludeBooleanAttr(Array.isArray(gear.gearType) ? ssrLooseContain(gear.gearType, "") : ssrLooseEqual(gear.gearType, "")) ? " selected" : ""}>Select gear type</option><!--[-->`);
          ssrRenderList(gearTypes, (type) => {
            _push(`<option${ssrRenderAttr("value", type)}${ssrIncludeBooleanAttr(Array.isArray(gear.gearType) ? ssrLooseContain(gear.gearType, type) : ssrLooseEqual(gear.gearType, type)) ? " selected" : ""}>${ssrInterpolate(type)}</option>`);
          });
          _push(`<!--]--></select></div></div>`);
        });
        _push(`<!--]--></div></div>`);
      });
      _push(`<!--]-->`);
      if (submitError.value) {
        _push(`<div class="mx-2 p-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">${ssrInterpolate(submitError.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="mx-2 flex gap-2">`);
      if (!unref(isSignedIn)) {
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/auth",
          class: "flex-1 text-center py-2 px-3 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Sign in to save draft `);
            } else {
              return [
                createTextVNode(" Sign in to save draft ")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<button type="button"${ssrIncludeBooleanAttr(draftLoading.value) ? " disabled" : ""} class="flex-1 py-2 px-3 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer transition-colors">${ssrInterpolate(draftLoading.value ? "Saving…" : "Save as draft")}</button>`);
      }
      _push(`</div><div class="sticky bottom-0 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 p-2 mt-2"><button type="submit"${ssrIncludeBooleanAttr(submitLoading.value) ? " disabled" : ""} class="bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">${ssrInterpolate(submitLoading.value ? "Sending…" : "Submit Booking Request")}</button></div></form></div></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/BookingForm.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const BookingForm = Object.assign(_sfc_main$3, { __name: "BookingForm" });
const _sfc_main$2 = {
  __name: "ShopReviewForm",
  __ssrInlineRender: true,
  props: {
    shopId: {
      type: String,
      required: true
    },
    shopName: {
      type: String,
      default: "Dive shop"
    },
    initialRating: {
      type: Number,
      default: null
    },
    initialBody: {
      type: String,
      default: ""
    },
    isEditing: {
      type: Boolean,
      default: false
    },
    reviewId: {
      type: String,
      default: null
    },
    /** Called after successful save */
    onSubmitted: {
      type: Function,
      default: null
    },
    /** Called after successful delete */
    onDeleted: {
      type: Function,
      default: null
    }
  },
  setup(__props) {
    const props = __props;
    const { closeDrawer } = useDrawer();
    const { isSignedIn } = useAuth();
    useSupabase();
    const rating = ref(typeof props.initialRating === "number" && props.initialRating >= 1 && props.initialRating <= 5 ? props.initialRating : 5);
    const body = ref(props.initialBody ?? "");
    const submitting = ref(false);
    const deleting = ref(false);
    const submitError = ref("");
    watch(() => props.initialRating, (v) => {
      if (typeof v === "number" && v >= 1 && v <= 5) rating.value = v;
    });
    watch(() => props.initialBody, (v) => {
      if (typeof v === "string") body.value = v;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col h-full min-h-0" }, _attrs))}><div class="w-full h-10 lg:h-18 p-1 border-b border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center"><div class="w-full flex items-center justify-between px-2 overflow-auto"><h2 class="text-base font-medium truncate text-zinc-900 dark:text-white">${ssrInterpolate(__props.isEditing ? "Edit review" : "Review")} · ${ssrInterpolate(__props.shopName)}</h2><button type="button" class="lg:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors cursor-pointer text-zinc-900 dark:text-white">`);
      _push(ssrRenderComponent(unref(X), { class: "w-5 h-5" }, null, _parent));
      _push(`</button></div></div><div class="w-full flex-1 min-h-0 overflow-y-auto p-2">`);
      if (!unref(isSignedIn)) {
        _push(`<div class="flex flex-col gap-3 p-2"><p class="text-sm text-zinc-600 dark:text-zinc-400"> Sign in to leave a review for this dive shop. </p>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/auth",
          class: "inline-flex justify-center rounded-md border border-zinc-900 dark:border-zinc-100 py-2 px-4 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800",
          onClick: unref(closeDrawer)
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` Sign in `);
            } else {
              return [
                createTextVNode(" Sign in ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<form class="flex flex-col gap-3"><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2"><legend class="text-xs uppercase font-medium px-1 text-zinc-900 dark:text-white">Rating</legend><div class="flex items-center gap-1 px-1" role="group" aria-label="Star rating"><!--[-->`);
        ssrRenderList(5, (n) => {
          _push(`<button type="button" class="p-1 rounded-sm hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer text-zinc-900 dark:text-yellow-500"${ssrRenderAttr("aria-pressed", n <= unref(rating))}>`);
          _push(ssrRenderComponent(unref(Star), {
            class: ["w-6 h-6", n <= unref(rating) ? "fill-current" : "fill-none stroke-current text-zinc-400"]
          }, null, _parent));
          _push(`</button>`);
        });
        _push(`<!--]--><span class="text-sm text-zinc-600 dark:text-zinc-400 ml-1">${ssrInterpolate(unref(rating))} / 5</span></div></fieldset><fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2"><label for="review-body" class="text-xs uppercase font-medium px-1 text-zinc-900 dark:text-white">Comment</label><textarea id="review-body" rows="6" required minlength="1" placeholder="Share your experience…" class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm resize-y min-h-[120px]">${ssrInterpolate(unref(body))}</textarea></fieldset>`);
        if (unref(submitError)) {
          _push(`<p class="text-sm text-red-600 dark:text-red-400 px-1">${ssrInterpolate(unref(submitError))}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button type="submit"${ssrIncludeBooleanAttr(unref(submitting) || unref(deleting) || !unref(body).trim()) ? " disabled" : ""} class="mx-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">${ssrInterpolate(unref(submitting) ? "Saving…" : __props.isEditing ? "Update review" : "Submit review")}</button>`);
        if (__props.isEditing && __props.reviewId) {
          _push(`<button type="button"${ssrIncludeBooleanAttr(unref(submitting) || unref(deleting)) ? " disabled" : ""} class="mx-2 mb-2 border border-red-600/60 dark:border-red-500/60 text-red-700 dark:text-red-400 font-medium py-2 px-4 rounded-md transition-colors w-full cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed">${ssrInterpolate(unref(deleting) ? "Deleting…" : "Delete review")}</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</form>`);
      }
      _push(`</div></div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ShopReviewForm.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<svg${ssrRenderAttrs(mergeProps({
    width: "100%",
    height: "100%",
    viewBox: "0 0 534 126",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, _attrs))}><path d="M168.702 98.5854L171.905 85.2634H204.96V98.5854H168.702ZM188.731 2.25732L159.349 122.667H143.975L173.357 2.25732H188.731ZM189.073 2.25732L218.455 122.667H203.252L173.698 2.25732H189.073Z" fill="currentColor"></path><path d="M32.1871 71.9837V58.6032H66.7459V71.9837H32.1871ZM51.3299 93.1554V59.1113H66.7459V93.1554H51.3299ZM0 93.1554V31.6728H15.4159V93.1554H0ZM0 31.6728C0 25.4625 1.41172 19.9861 4.23515 15.2436C7.05857 10.3882 11.0114 6.66202 16.0935 4.06496C21.1757 1.35499 26.992 0 33.5423 0V13.3805C27.8955 13.3805 23.4345 14.9613 20.1593 18.123C16.997 21.2846 15.4159 25.8012 15.4159 31.6728H0ZM0 92.986H15.4159C15.4159 98.8576 16.997 103.431 20.1593 106.705C23.4345 109.867 27.8955 111.448 33.5423 111.448V124.828C26.992 124.828 21.1757 123.473 16.0935 120.763C11.0114 118.053 7.05857 114.327 4.23515 109.585C1.41172 104.842 0 99.3093 0 92.986ZM53.7016 36.0766C53.024 28.9629 50.8782 23.43 47.2642 19.478C43.7632 15.413 39.1327 13.3805 33.3729 13.3805V0C42.9726 0 50.7653 2.93581 56.7509 8.80742C62.8495 14.679 66.52 22.809 67.7623 33.1972L53.7016 36.0766ZM66.7459 92.986C66.7459 99.3093 65.3342 104.842 62.5107 109.585C59.6873 114.327 55.7345 118.053 50.6523 120.763C45.6831 123.473 39.9233 124.828 33.3729 124.828V111.448C39.0198 111.448 43.4243 109.867 46.5866 106.705C49.7488 103.431 51.3299 98.8576 51.3299 92.986H66.7459Z" fill="currentColor"></path><path d="M90.1673 122.495V109.022H134.007V122.495H90.1673ZM79.7617 122.495V2.25732H95.2848V122.495H79.7617Z" fill="currentColor"></path><path d="M278.014 93.312V2.17383H293.838V93.312H278.014ZM225.496 93.312V2.17383H241.321V93.312H225.496ZM293.838 93.1414C293.838 99.3993 292.389 104.975 289.491 109.867C286.593 114.646 282.535 118.401 277.318 121.131C272.217 123.748 266.304 125.057 259.58 125.057V111.574C265.377 111.574 269.898 109.981 273.144 106.795C276.39 103.495 278.014 98.9442 278.014 93.1414H293.838ZM225.496 93.1414H241.321C241.321 98.9442 242.944 103.495 246.19 106.795C249.552 109.981 254.131 111.574 259.928 111.574V125.057C253.204 125.057 247.233 123.748 242.016 121.131C236.8 118.401 232.742 114.646 229.844 109.867C226.945 104.975 225.496 99.3993 225.496 93.1414Z" fill="currentColor"></path><path d="M306.004 93.1554V31.6728H321.42V93.1554H306.004ZM306.004 31.6728C306.004 25.4625 307.416 19.9861 310.239 15.2436C313.062 10.3882 317.015 6.66202 322.097 4.06496C327.18 1.35499 332.996 0 339.546 0V13.3805C333.899 13.3805 329.438 14.9613 326.163 18.123C323.001 21.2846 321.42 25.8012 321.42 31.6728H306.004ZM306.004 92.986H321.42C321.42 98.8577 323.001 103.431 326.163 106.705C329.438 109.867 333.899 111.448 339.546 111.448V124.828C332.996 124.828 327.18 123.473 322.097 120.763C317.015 118.053 313.062 114.327 310.239 109.585C307.416 104.842 306.004 99.3093 306.004 92.986ZM359.706 36.0766C359.028 28.9629 356.882 23.43 353.268 19.478C349.767 15.413 345.137 13.3805 339.377 13.3805V0C348.976 0 356.769 2.93581 362.755 8.80742C368.853 14.679 372.524 22.809 373.766 33.1972L359.706 36.0766ZM359.706 88.7517L373.766 91.4617C372.524 101.963 368.853 110.149 362.755 116.021C356.769 121.892 348.976 124.828 339.377 124.828V111.448C345.137 111.448 349.767 109.472 353.268 105.52C356.882 101.455 359.028 95.8654 359.706 88.7517Z" fill="currentColor"></path><path d="M437.785 93.312V2.17383H453.61V93.312H437.785ZM385.268 93.312V2.17383H401.092V93.312H385.268ZM453.61 93.1414C453.61 99.3993 452.161 104.975 449.262 109.867C446.364 114.646 442.306 118.401 437.089 121.131C431.988 123.748 426.076 125.057 419.352 125.057V111.574C425.148 111.574 429.67 109.981 432.916 106.795C436.162 103.495 437.785 98.9442 437.785 93.1414H453.61ZM385.268 93.1414H401.092C401.092 98.9442 402.715 103.495 405.962 106.795C409.324 109.981 413.903 111.574 419.7 111.574V125.057C412.975 125.057 407.005 123.748 401.788 121.131C396.571 118.401 392.513 114.646 389.615 109.867C386.717 104.975 385.268 99.3993 385.268 93.1414Z" fill="currentColor"></path><path d="M518.513 95.6218C518.513 91.4249 517.322 87.7384 514.939 84.5623C512.557 81.2729 509.494 78.2102 505.75 75.3745C502.006 72.5387 497.978 69.6462 493.667 66.6971C489.469 63.7479 485.498 60.5151 481.755 56.9988C478.011 53.4824 474.947 49.5124 472.565 45.0886C470.182 40.5514 468.991 35.3336 468.991 29.4352H484.477C484.477 33.5187 485.669 37.2052 488.051 40.4946C490.434 43.6707 493.497 46.7333 497.241 49.6825C500.985 52.5183 504.956 55.4107 509.153 58.3599C513.464 61.3091 517.492 64.5419 521.236 68.0582C524.98 71.4611 528.043 75.4312 530.425 79.9684C532.808 84.3922 533.999 89.61 533.999 95.6218H518.513ZM468.991 29.7755C468.991 23.5368 470.409 18.2056 473.246 13.7818C476.082 9.358 480.053 5.95509 485.158 3.57305C490.263 1.19102 496.106 0 502.686 0V13.2714C497.014 13.2714 492.533 14.7459 489.242 17.6951C486.066 20.6443 484.477 24.6711 484.477 29.7755H468.991ZM533.999 95.2815C533.999 101.407 532.581 106.738 529.745 111.275C526.908 115.699 522.938 119.102 517.832 121.484C512.84 123.866 506.998 125.057 500.304 125.057V111.615C505.977 111.615 510.401 110.198 513.578 107.362C516.868 104.413 518.513 100.386 518.513 95.2815H533.999ZM518.683 28.2442C518.116 23.1398 516.301 19.3966 513.238 17.0146C510.288 14.5191 506.771 13.2714 502.686 13.2714V0C508.019 0 512.84 1.07759 517.152 3.23276C521.463 5.38794 525.037 8.33713 527.873 12.0803C530.709 15.8235 532.468 20.2473 533.148 25.3517L518.683 28.2442ZM479.883 88.816C480.563 95.9621 482.662 101.577 486.179 105.66C489.81 109.63 494.518 111.615 500.304 111.615V125.057C490.661 125.057 482.776 122.108 476.649 116.209C470.636 110.311 467.006 102.144 465.758 91.7085L479.883 88.816Z" fill="currentColor"></path></svg>`);
}
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Logo.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const Logo = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["ssrRender", _sfc_ssrRender]]), { __name: "Logo" });
const _sfc_main = {
  __name: "default",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    computed(() => {
      const p = route.path;
      return p === "/" || p.startsWith("/auth") || p.startsWith("/profile");
    });
    useChatSessions();
    useTheme();
    const { isSignedIn } = useAuth();
    const { isOpen, contentType, drawerData, drawerOpenKey, isMobileMenuOpen, shouldAnimateMenu, closeMobileMenu } = useDrawer();
    const isDesktop = ref(true);
    const handleCloseMobileMenu = () => {
      shouldAnimateMenu.value = true;
      closeMobileMenu();
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      const _component_ClientOnly = __nuxt_component_1$1;
      const _component_NavLink = _sfc_main$4;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "h-dvh w-dvw overflow-hidden" }, _attrs))}><div class="h-full w-full lg:flex lg:flex-row">`);
      if (unref(isMobileMenuOpen)) {
        _push(`<div class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(isMobileMenuOpen) || isDesktop.value) {
        _push(`<div class="w-full lg:w-56 h-full shrink-0 bg-zinc-50 dark:bg-black flex flex-col justify-between p-2 absolute lg:relative z-50"><div><div class="h-fit flex flex-row justify-between items-center p-2 lg:p-4">`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/",
          onClick: handleCloseMobileMenu,
          class: "w-[120px] h-auto flex flex-row items-center justify-center gap-2"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<img${ssrRenderAttr("src", _imports_0)} alt="Logo" class="w-[40px] h-full"${_scopeId}>`);
              _push2(ssrRenderComponent(Logo, { class: "*:fill-black *:dark:fill-white" }, null, _parent2, _scopeId));
            } else {
              return [
                createVNode("img", {
                  src: _imports_0,
                  alt: "Logo",
                  class: "w-[40px] h-full"
                }),
                createVNode(Logo, { class: "*:fill-black *:dark:fill-white" })
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`<button class="w-6 h-6 lg:hidden flex items-center justify-center cursor-pointer text-zinc-900 dark:text-white">`);
        _push(ssrRenderComponent(unref(X), { class: "w-full h-full" }, null, _parent));
        _push(`</button></div></div><nav class="w-full flex flex-col gap-1">`);
        _push(ssrRenderComponent(_component_ClientOnly, null, {}, _parent));
        if (unref(isSignedIn)) {
          _push(ssrRenderComponent(_component_NavLink, {
            to: "/profile",
            onClick: handleCloseMobileMenu
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(ssrRenderComponent(unref(User), {
                  class: "w-4 h-4 shrink-0 opacity-80",
                  "stroke-width": "1.75"
                }, null, _parent2, _scopeId));
                _push2(` Profile `);
              } else {
                return [
                  createVNode(unref(User), {
                    class: "w-4 h-4 shrink-0 opacity-80",
                    "stroke-width": "1.75"
                  }),
                  createTextVNode(" Profile ")
                ];
              }
            }),
            _: 1
          }, _parent));
        } else {
          _push(ssrRenderComponent(_component_NavLink, {
            to: "/auth",
            onClick: handleCloseMobileMenu
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(ssrRenderComponent(unref(LogIn), {
                  class: "w-4 h-4 shrink-0 opacity-80",
                  "stroke-width": "1.75"
                }, null, _parent2, _scopeId));
                _push2(` Sign in `);
              } else {
                return [
                  createVNode(unref(LogIn), {
                    class: "w-4 h-4 shrink-0 opacity-80",
                    "stroke-width": "1.75"
                  }),
                  createTextVNode(" Sign in ")
                ];
              }
            }),
            _: 1
          }, _parent));
        }
        if (unref(isSignedIn)) {
          _push(`<button type="button" class="w-full flex items-center gap-2 text-left px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-sm transition-colors cursor-pointer bg-transparent">`);
          _push(ssrRenderComponent(unref(LogOut), {
            class: "w-4 h-4 shrink-0 opacity-80",
            "stroke-width": "1.75"
          }, null, _parent));
          _push(` Sign out </button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</nav><div class="w-full p-2 shrink-0">`);
        _push(ssrRenderComponent(_component_ClientOnly, null, {
          fallback: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<div class="w-full h-18 flex items-center justify-center rounded-full gap-0 p-1 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white cursor-pointer relative before:content-[&#39;&#39;] before:absolute before:inset-1 before:rounded-full before:bg-zinc-200 dark:before:bg-zinc-700 before:w-[calc(50%-4px)] before:z-[-1] before:transition-transform before:duration-300 before:ease-in-out before:left-1 before:translate-x-0"${_scopeId}><div class="w-full h-full flex items-center justify-center rounded-full"${_scopeId}>`);
              _push2(ssrRenderComponent(unref(Sun), {
                class: "w-8 h-8 opacity-100",
                "stroke-width": "1"
              }, null, _parent2, _scopeId));
              _push2(`</div><div class="w-full h-full flex items-center justify-center rounded-full"${_scopeId}>`);
              _push2(ssrRenderComponent(unref(Moon), {
                class: "w-8 h-8 opacity-30",
                "stroke-width": "1"
              }, null, _parent2, _scopeId));
              _push2(`</div></div>`);
            } else {
              return [
                createVNode("div", { class: "w-full h-18 flex items-center justify-center rounded-full gap-0 p-1 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white cursor-pointer relative before:content-[''] before:absolute before:inset-1 before:rounded-full before:bg-zinc-200 dark:before:bg-zinc-700 before:w-[calc(50%-4px)] before:z-[-1] before:transition-transform before:duration-300 before:ease-in-out before:left-1 before:translate-x-0" }, [
                  createVNode("div", { class: "w-full h-full flex items-center justify-center rounded-full" }, [
                    createVNode(unref(Sun), {
                      class: "w-8 h-8 opacity-100",
                      "stroke-width": "1"
                    })
                  ]),
                  createVNode("div", { class: "w-full h-full flex items-center justify-center rounded-full" }, [
                    createVNode(unref(Moon), {
                      class: "w-8 h-8 opacity-30",
                      "stroke-width": "1"
                    })
                  ])
                ])
              ];
            }
          })
        }, _parent));
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="p-2 lg:pl-0 grow h-dvh w-dvw min-w-0 flex flex-row gap-2 relative"><div class="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm lg:rounded-xl h-full flex-1 min-w-0 relative overflow-hidden">`);
      ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
      _push(`</div>`);
      if (unref(isOpen)) {
        _push(`<div class="w-auto lg:w-[20%] lg:min-w-[380px] lg:max-w-[420px] h-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl absolute lg:relative bottom-2 lg:bottom-auto top-2 lg:top-auto right-2 lg:right-auto left-2 lg:left-auto flex flex-col justify-start overflow-hidden z-50">`);
        if (unref(contentType) === "booking-form") {
          _push(ssrRenderComponent(BookingForm, {
            key: "booking-" + unref(drawerOpenKey),
            "shop-id": unref(drawerData).shopId,
            "shop-name": unref(drawerData).shopName,
            "initial-payload": unref(drawerData).bookingPayload,
            "draft-id": unref(drawerData).draftId
          }, null, _parent));
        } else if (unref(contentType) === "review-form") {
          _push(ssrRenderComponent(_sfc_main$2, {
            key: "review-" + unref(drawerOpenKey),
            "shop-id": unref(drawerData).shopId,
            "shop-name": unref(drawerData).shopName || "Dive shop",
            "initial-rating": unref(drawerData).initialRating,
            "initial-body": unref(drawerData).initialBody,
            "is-editing": unref(drawerData).isEditing,
            "review-id": unref(drawerData).reviewId,
            "on-submitted": unref(drawerData).onSubmitted,
            "on-deleted": unref(drawerData).onDeleted
          }, null, _parent));
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/default.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=default-D5fqILPz.mjs.map
