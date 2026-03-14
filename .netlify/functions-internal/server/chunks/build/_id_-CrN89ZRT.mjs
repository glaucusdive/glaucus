import { _ as __nuxt_component_0 } from './nuxt-layout-D1Os6LCO.mjs';
import { computed, unref, withCtx, createVNode, createBlock, createCommentVNode, openBlock, useSSRContext } from 'vue';
import { ssrInterpolate, ssrRenderComponent } from 'vue/server-renderer';
import { u as useShopDetail, _ as _sfc_main$1 } from './DiveShopDetail-BWmKpC27.mjs';
import { a as useRoute, b as useRouter, u as useHead, n as navigateTo } from './server.mjs';
import 'vue-router';
import 'lucide-vue-next';
import './useSupabase-DR_u3VFp.mjs';
import '@supabase/supabase-js';
import '../nitro/nitro.mjs';
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

const _sfc_main = {
  __name: "[id]",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    useRouter();
    const shopId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const { shopData, pending, error } = useShopDetail(shopId);
    useHead({
      title: computed(() => shopData.value?.business_name || "Dive Shop")
    });
    const goBackToShops = () => {
      navigateTo("/shops");
    };
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      _push(`<!--[-->`);
      if (unref(pending)) {
        _push(`<div class="h-screen flex items-center justify-center"><div class="flex flex-col items-center"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div><span class="text-zinc-600 dark:text-zinc-400">Loading dive shop...</span></div></div>`);
      } else if (unref(error)) {
        _push(`<div class="h-screen flex items-center justify-center"><div class="text-center"><h1 class="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Error</h1><p class="text-zinc-600 dark:text-zinc-400">${ssrInterpolate(unref(error).message || "Failed to load dive shop")}</p><button class="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"> Back to Dive Shops </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(_component_NuxtLayout, { name: "default" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="h-full w-full"${_scopeId}>`);
            if (unref(shopId)) {
              _push2(ssrRenderComponent(_sfc_main$1, {
                "shop-id": unref(shopId),
                "show-close-button": false,
                onClose: goBackToShops
              }, null, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
          } else {
            return [
              createVNode("div", { class: "h-full w-full" }, [
                unref(shopId) ? (openBlock(), createBlock(_sfc_main$1, {
                  key: 0,
                  "shop-id": unref(shopId),
                  "show-close-button": false,
                  onClose: goBackToShops
                }, null, 8, ["shop-id"])) : createCommentVNode("", true)
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<!--]-->`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/shops/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-CrN89ZRT.mjs.map
