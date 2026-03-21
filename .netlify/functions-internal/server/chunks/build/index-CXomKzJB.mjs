import { _ as __nuxt_component_0 } from './nuxt-layout-DSk-Zbla.mjs';
import { _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, mergeProps, withCtx, createVNode, useSSRContext } from 'vue';
import { ssrRenderComponent } from 'vue/server-renderer';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4"${_scopeId}><h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-6"${_scopeId}>Profile</h1><nav class="flex flex-col gap-2 max-w-md"${_scopeId}>`);
            _push2(ssrRenderComponent(_component_NuxtLink, {
              to: "/profile/defaults",
              class: "flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<span class="font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200"${_scopeId2}>Booking defaults</span><span class="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"${_scopeId2}>→</span>`);
                } else {
                  return [
                    createVNode("span", { class: "font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200" }, "Booking defaults"),
                    createVNode("span", { class: "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" }, "→")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(ssrRenderComponent(_component_NuxtLink, {
              to: "/profile/drafts",
              class: "flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<span class="font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200"${_scopeId2}>My drafts</span><span class="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"${_scopeId2}>→</span>`);
                } else {
                  return [
                    createVNode("span", { class: "font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200" }, "My drafts"),
                    createVNode("span", { class: "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" }, "→")
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`</nav></div>`);
          } else {
            return [
              createVNode("div", { class: "min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4" }, [
                createVNode("h1", { class: "text-xl font-bold text-zinc-900 dark:text-white mb-6" }, "Profile"),
                createVNode("nav", { class: "flex flex-col gap-2 max-w-md" }, [
                  createVNode(_component_NuxtLink, {
                    to: "/profile/defaults",
                    class: "flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
                  }, {
                    default: withCtx(() => [
                      createVNode("span", { class: "font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200" }, "Booking defaults"),
                      createVNode("span", { class: "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" }, "→")
                    ]),
                    _: 1
                  }),
                  createVNode(_component_NuxtLink, {
                    to: "/profile/drafts",
                    class: "flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
                  }, {
                    default: withCtx(() => [
                      createVNode("span", { class: "font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200" }, "My drafts"),
                      createVNode("span", { class: "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" }, "→")
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
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/profile/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-CXomKzJB.mjs.map
