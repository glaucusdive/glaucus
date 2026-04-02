import { _ as __nuxt_component_0 } from './nuxt-layout-BbbkkobY.mjs';
import { _ as __nuxt_component_0$1, n as navigateTo } from './server.mjs';
import { defineComponent, ref, computed, mergeProps, withCtx, createTextVNode, unref, createVNode, createBlock, openBlock, Fragment, renderList, toDisplayString, createCommentVNode, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderClass, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { u as useAuth } from './useAuth-BWS1ISvo.mjs';
import 'vue-router';
import '../nitro/nitro.mjs';
import '@supabase/supabase-js';
import 'chrono-node';
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
import './useSupabase-G2CWeDSk.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "drafts",
  __ssrInlineRender: true,
  setup(__props) {
    const { accessToken } = useAuth();
    const activeTab = ref("incomplete");
    const drafts = ref([]);
    const sentSubmissions = ref([]);
    const draftsLoading = ref(true);
    const sentLoading = ref(true);
    const resumeLoading = ref(null);
    const deleteLoading = ref(null);
    const expandedSubmissionIds = ref(/* @__PURE__ */ new Set());
    const incompleteDrafts = computed(
      () => drafts.value.filter((d) => d.isReady !== true)
    );
    function formatDate(iso) {
      try {
        const d = new Date(iso);
        return d.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
      } catch {
        return "";
      }
    }
    async function resumeDraft(d) {
      if (!accessToken.value) return;
      resumeLoading.value = d.id;
      try {
        const one = await $fetch(`/api/booking/drafts/${d.id}`, {
          headers: { Authorization: `Bearer ${accessToken.value}` }
        });
        if (false) ;
        await navigateTo("/");
      } finally {
        resumeLoading.value = null;
      }
    }
    async function deleteDraft(id) {
      if (!accessToken.value) return;
      deleteLoading.value = id;
      try {
        await $fetch(`/api/booking/drafts/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken.value}` }
        });
        drafts.value = drafts.value.filter((d) => d.id !== id);
      } finally {
        deleteLoading.value = null;
      }
    }
    function toggleSubmissionDetails(id) {
      const next = new Set(expandedSubmissionIds.value);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      expandedSubmissionIds.value = next;
    }
    function asString(v) {
      return typeof v === "string" ? v : "";
    }
    function asArray(v) {
      return Array.isArray(v) ? v : [];
    }
    function formatDateRange(payload) {
      const start = asString(payload.startDate).trim();
      const end = asString(payload.endDate).trim();
      if (!start && !end) return "—";
      if (!start) return end;
      if (!end) return start;
      return `${start} to ${end}`;
    }
    function countDivers(payload) {
      return asArray(payload.divers).length;
    }
    function formatContact(payload) {
      const name = asString(payload.name).trim();
      const email = asString(payload.email).trim();
      if (!name && !email) return "—";
      if (!name) return email;
      if (!email) return name;
      return `${name} (${email})`;
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto"${_scopeId}>`);
            _push2(ssrRenderComponent(_component_NuxtLink, {
              to: "/profile",
              class: "inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(` ← Profile `);
                } else {
                  return [
                    createTextVNode(" ← Profile ")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2"${_scopeId}>My forms</h1><p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6"${_scopeId}>Track incomplete drafts and sent requests.</p><div class="inline-flex rounded-md border border-zinc-300 dark:border-zinc-600 p-1 mb-6"${_scopeId}><button type="button" class="${ssrRenderClass([unref(activeTab) === "incomplete" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800", "px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors"])}"${_scopeId}> Incomplete </button><button type="button" class="${ssrRenderClass([unref(activeTab) === "sent" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800", "px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors"])}"${_scopeId}> Sent </button></div>`);
            if (unref(activeTab) === "incomplete") {
              _push2(`<!--[-->`);
              if (unref(draftsLoading)) {
                _push2(`<p class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>Loading incomplete forms…</p>`);
              } else if (!unref(incompleteDrafts).length) {
                _push2(`<p class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>No incomplete forms. Start a booking and use “Save as draft” to continue later.</p>`);
              } else {
                _push2(`<ul class="space-y-2"${_scopeId}><!--[-->`);
                ssrRenderList(unref(incompleteDrafts), (d) => {
                  _push2(`<li class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"${_scopeId}><div class="min-w-0 flex-1"${_scopeId}><span class="font-medium text-zinc-900 dark:text-white"${_scopeId}>${ssrInterpolate(d.shopName || "Dive shop")}</span><span class="text-sm text-zinc-500 dark:text-zinc-400 ml-2"${_scopeId}>${ssrInterpolate(d.updated_at ? formatDate(d.updated_at) : "")}</span></div><div class="flex gap-2 shrink-0"${_scopeId}><button type="button"${ssrIncludeBooleanAttr(unref(resumeLoading) === d.id) ? " disabled" : ""} class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"${_scopeId}>${ssrInterpolate(unref(resumeLoading) === d.id ? "Opening…" : "Resume")}</button><button type="button"${ssrIncludeBooleanAttr(unref(deleteLoading) === d.id) ? " disabled" : ""} class="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer transition-colors"${_scopeId}>${ssrInterpolate(unref(deleteLoading) === d.id ? "Deleting…" : "Delete")}</button></div></li>`);
                });
                _push2(`<!--]--></ul>`);
              }
              _push2(`<!--]-->`);
            } else {
              _push2(`<!--[-->`);
              if (unref(sentLoading)) {
                _push2(`<p class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>Loading sent forms…</p>`);
              } else if (!unref(sentSubmissions).length) {
                _push2(`<p class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>No sent forms yet.</p>`);
              } else {
                _push2(`<ul class="space-y-2"${_scopeId}><!--[-->`);
                ssrRenderList(unref(sentSubmissions), (s) => {
                  _push2(`<li class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"${_scopeId}><div class="flex flex-wrap items-center justify-between gap-2"${_scopeId}><div class="min-w-0 flex-1"${_scopeId}><span class="font-medium text-zinc-900 dark:text-white"${_scopeId}>${ssrInterpolate(s.shopName || "Dive shop")}</span><span class="text-sm text-zinc-500 dark:text-zinc-400 ml-2"${_scopeId}>${ssrInterpolate(formatDate(s.sent_at || s.created_at))}</span></div><button type="button" class="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"${_scopeId}>${ssrInterpolate(unref(expandedSubmissionIds).has(s.id) ? "Hide details" : "View details")}</button></div>`);
                  if (unref(expandedSubmissionIds).has(s.id)) {
                    _push2(`<div class="mt-3 text-sm text-zinc-600 dark:text-zinc-300 space-y-1"${_scopeId}><p${_scopeId}><span class="font-medium"${_scopeId}>Dates:</span> ${ssrInterpolate(formatDateRange(s.payload))}</p><p${_scopeId}><span class="font-medium"${_scopeId}>Divers:</span> ${ssrInterpolate(countDivers(s.payload))}</p><p${_scopeId}><span class="font-medium"${_scopeId}>Contact:</span> ${ssrInterpolate(formatContact(s.payload))}</p></div>`);
                  } else {
                    _push2(`<!---->`);
                  }
                  _push2(`</li>`);
                });
                _push2(`<!--]--></ul>`);
              }
              _push2(`<!--]-->`);
            }
            _push2(`</div>`);
          } else {
            return [
              createVNode("div", { class: "max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto" }, [
                createVNode(_component_NuxtLink, {
                  to: "/profile",
                  class: "inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer"
                }, {
                  default: withCtx(() => [
                    createTextVNode(" ← Profile ")
                  ]),
                  _: 1
                }),
                createVNode("h1", { class: "text-xl font-bold text-zinc-900 dark:text-white mb-2" }, "My forms"),
                createVNode("p", { class: "text-sm text-zinc-500 dark:text-zinc-400 mb-6" }, "Track incomplete drafts and sent requests."),
                createVNode("div", { class: "inline-flex rounded-md border border-zinc-300 dark:border-zinc-600 p-1 mb-6" }, [
                  createVNode("button", {
                    type: "button",
                    class: ["px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors", unref(activeTab) === "incomplete" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"],
                    onClick: ($event) => activeTab.value = "incomplete"
                  }, " Incomplete ", 10, ["onClick"]),
                  createVNode("button", {
                    type: "button",
                    class: ["px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors", unref(activeTab) === "sent" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"],
                    onClick: ($event) => activeTab.value = "sent"
                  }, " Sent ", 10, ["onClick"])
                ]),
                unref(activeTab) === "incomplete" ? (openBlock(), createBlock(Fragment, { key: 0 }, [
                  unref(draftsLoading) ? (openBlock(), createBlock("p", {
                    key: 0,
                    class: "text-sm text-zinc-500 dark:text-zinc-400"
                  }, "Loading incomplete forms…")) : !unref(incompleteDrafts).length ? (openBlock(), createBlock("p", {
                    key: 1,
                    class: "text-sm text-zinc-500 dark:text-zinc-400"
                  }, "No incomplete forms. Start a booking and use “Save as draft” to continue later.")) : (openBlock(), createBlock("ul", {
                    key: 2,
                    class: "space-y-2"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(incompleteDrafts), (d) => {
                      return openBlock(), createBlock("li", {
                        key: d.id,
                        class: "flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      }, [
                        createVNode("div", { class: "min-w-0 flex-1" }, [
                          createVNode("span", { class: "font-medium text-zinc-900 dark:text-white" }, toDisplayString(d.shopName || "Dive shop"), 1),
                          createVNode("span", { class: "text-sm text-zinc-500 dark:text-zinc-400 ml-2" }, toDisplayString(d.updated_at ? formatDate(d.updated_at) : ""), 1)
                        ]),
                        createVNode("div", { class: "flex gap-2 shrink-0" }, [
                          createVNode("button", {
                            type: "button",
                            onClick: ($event) => resumeDraft(d),
                            disabled: unref(resumeLoading) === d.id,
                            class: "px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"
                          }, toDisplayString(unref(resumeLoading) === d.id ? "Opening…" : "Resume"), 9, ["onClick", "disabled"]),
                          createVNode("button", {
                            type: "button",
                            onClick: ($event) => deleteDraft(d.id),
                            disabled: unref(deleteLoading) === d.id,
                            class: "px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer transition-colors"
                          }, toDisplayString(unref(deleteLoading) === d.id ? "Deleting…" : "Delete"), 9, ["onClick", "disabled"])
                        ])
                      ]);
                    }), 128))
                  ]))
                ], 64)) : (openBlock(), createBlock(Fragment, { key: 1 }, [
                  unref(sentLoading) ? (openBlock(), createBlock("p", {
                    key: 0,
                    class: "text-sm text-zinc-500 dark:text-zinc-400"
                  }, "Loading sent forms…")) : !unref(sentSubmissions).length ? (openBlock(), createBlock("p", {
                    key: 1,
                    class: "text-sm text-zinc-500 dark:text-zinc-400"
                  }, "No sent forms yet.")) : (openBlock(), createBlock("ul", {
                    key: 2,
                    class: "space-y-2"
                  }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(sentSubmissions), (s) => {
                      return openBlock(), createBlock("li", {
                        key: s.id,
                        class: "p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      }, [
                        createVNode("div", { class: "flex flex-wrap items-center justify-between gap-2" }, [
                          createVNode("div", { class: "min-w-0 flex-1" }, [
                            createVNode("span", { class: "font-medium text-zinc-900 dark:text-white" }, toDisplayString(s.shopName || "Dive shop"), 1),
                            createVNode("span", { class: "text-sm text-zinc-500 dark:text-zinc-400 ml-2" }, toDisplayString(formatDate(s.sent_at || s.created_at)), 1)
                          ]),
                          createVNode("button", {
                            type: "button",
                            class: "px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors",
                            onClick: ($event) => toggleSubmissionDetails(s.id)
                          }, toDisplayString(unref(expandedSubmissionIds).has(s.id) ? "Hide details" : "View details"), 9, ["onClick"])
                        ]),
                        unref(expandedSubmissionIds).has(s.id) ? (openBlock(), createBlock("div", {
                          key: 0,
                          class: "mt-3 text-sm text-zinc-600 dark:text-zinc-300 space-y-1"
                        }, [
                          createVNode("p", null, [
                            createVNode("span", { class: "font-medium" }, "Dates:"),
                            createTextVNode(" " + toDisplayString(formatDateRange(s.payload)), 1)
                          ]),
                          createVNode("p", null, [
                            createVNode("span", { class: "font-medium" }, "Divers:"),
                            createTextVNode(" " + toDisplayString(countDivers(s.payload)), 1)
                          ]),
                          createVNode("p", null, [
                            createVNode("span", { class: "font-medium" }, "Contact:"),
                            createTextVNode(" " + toDisplayString(formatContact(s.payload)), 1)
                          ])
                        ])) : createCommentVNode("", true)
                      ]);
                    }), 128))
                  ]))
                ], 64))
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/profile/drafts.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=drafts-CmxQ1Spk.mjs.map
