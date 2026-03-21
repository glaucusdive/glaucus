import { _ as __nuxt_component_0 } from './nuxt-layout-BF9m2Lkn.mjs';
import { d as useSeoMeta, e as useAsyncData, f as _sfc_main$d, n as navigateTo } from './server.mjs';
import { withAsyncContext, mergeProps, withCtx, unref, createBlock, openBlock, createVNode, toDisplayString, Fragment, renderList, createCommentVNode, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderAttr } from 'vue/server-renderer';
import { Menu } from 'lucide-vue-next';
import { u as useDrawer } from './useDrawer-DEsd6Mko.mjs';
import { u as useSupabase } from './useSupabase-G2CWeDSk.mjs';
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

const _sfc_main = {
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    useSeoMeta({
      robots: "noindex, follow"
    });
    const { client } = useSupabase();
    const { toggleMobileMenu } = useDrawer();
    const navigateToShop = (shop) => {
      const segment = shop.slug || shop.id;
      navigateTo(`/shops/${segment}`);
    };
    const { data: diveshops, pending, error } = ([__temp, __restore] = withAsyncContext(async () => useAsyncData("diveshops", async () => {
      try {
        console.log("Fetching dive shops data...");
        const { data, error: supabaseError } = await client.from("diveshops").select("*, country:countries(name), region:regions(name)").order("business_name");
        if (supabaseError) {
          console.error("Supabase error:", supabaseError);
          throw supabaseError;
        }
        console.log("Fetched data:", data);
        return data || [];
      } catch (err) {
        console.error("Error fetching dive shops:", err);
        throw err;
      }
    }, {
      server: false,
      // Don't cache on server
      lazy: false,
      // Fetch immediately
      default: () => []
      // Default empty array
    })), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      const _component_UIcon = _sfc_main$d;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (unref(pending)) {
              _push2(`<div class="flex items-center justify-center p-8"${_scopeId}><div class="flex flex-col items-center"${_scopeId}><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"${_scopeId}></div><span class="text-zinc-600 dark:text-zinc-400"${_scopeId}>Loading dive shops...</span></div></div>`);
            } else if (unref(error)) {
              _push2(`<div class="flex items-center justify-center p-8"${_scopeId}><div class="text-center"${_scopeId}><h1 class="text-2xl font-bold text-red-600 dark:text-red-500 mb-2"${_scopeId}>Error</h1><p class="text-zinc-600 dark:text-zinc-400"${_scopeId}>${ssrInterpolate(unref(error).message || "Failed to load dive shops")}</p></div></div>`);
            } else if (unref(diveshops) && unref(diveshops).length > 0) {
              _push2(`<div class="h-full w-full flex flex-col"${_scopeId}><div class="sticky left-0 top-0 z-10 border-b border-zinc-200 dark:border-zinc-700 w-full lg:h-[72px] flex flex-row justify-start items-center divide-x divide-zinc-200 dark:divide-zinc-700 shrink-0"${_scopeId}><div class="p-1 flex lg:hidden items-center h-full"${_scopeId}><div class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full min-h-8 h-full flex items-center justify-center cursor-pointer px-1"${_scopeId}>`);
              _push2(ssrRenderComponent(unref(Menu), { class: "w-4 h-4 lg:w-6 lg:h-6 text-zinc-900 dark:text-white" }, null, _parent2, _scopeId));
              _push2(`</div></div><div class="p-1 px-2 lg:p-4 flex items-center justify-between h-full grow"${_scopeId}><h2 class="text-xl font-semibold text-zinc-900 dark:text-white whitespace-nowrap"${_scopeId}>Dive Shops Directory</h2><div class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap"${_scopeId}>${ssrInterpolate(unref(diveshops).length)} shops </div></div></div><div class="overflow-scroll h-full w-full"${_scopeId}><div class="w-fit"${_scopeId}><div class="bg-zinc-100 dark:bg-zinc-800 grid auto-cols-auto grid-flow-col gap-4 px-6 py-3 sticky top-0 z-10 w-fit lg:w-full"${_scopeId}><div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-96"${_scopeId}>Business Name </div><div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-64"${_scopeId}>Location</div><div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-64"${_scopeId}>Contact</div><div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-48"${_scopeId}>Website</div><div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-48"${_scopeId}>Rating</div></div><!--[-->`);
              ssrRenderList(unref(diveshops), (shop) => {
                _push2(`<div class="grid auto-cols-auto grid-flow-col gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 w-fit lg:w-full cursor-pointer"${_scopeId}><div class="font-medium text-zinc-900 dark:text-white w-96 hover:text-blue-600 dark:hover:text-blue-400"${_scopeId}>${ssrInterpolate(shop.business_name)}</div><div class="w-64"${_scopeId}><div class="text-sm text-zinc-900 dark:text-white"${_scopeId}>${ssrInterpolate([shop.locale, shop.country?.name ?? shop.country].filter(Boolean).join(", "))}</div>`);
                if (shop.street_address) {
                  _push2(`<div class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>${ssrInterpolate(shop.street_address)}</div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (shop.region?.name ?? shop.region) {
                  _push2(`<div class="text-xs text-zinc-400 dark:text-zinc-500"${_scopeId}>${ssrInterpolate(shop.region?.name ?? shop.region)}</div>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div><div class="space-y-1 w-64"${_scopeId}>`);
                if (shop.phone) {
                  _push2(`<div class="flex items-center gap-1"${_scopeId}>`);
                  _push2(ssrRenderComponent(_component_UIcon, {
                    name: "i-heroicons-phone",
                    class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                  }, null, _parent2, _scopeId));
                  _push2(`<a${ssrRenderAttr("href", `tel:${shop.phone}`)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"${_scopeId}>${ssrInterpolate(shop.phone)}</a></div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (shop.email) {
                  _push2(`<div class="flex items-center gap-1"${_scopeId}>`);
                  _push2(ssrRenderComponent(_component_UIcon, {
                    name: "i-heroicons-envelope",
                    class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                  }, null, _parent2, _scopeId));
                  _push2(`<a${ssrRenderAttr("href", `mailto:${shop.email}`)} class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"${_scopeId}>${ssrInterpolate(shop.email)}</a></div>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div><div class="w-48"${_scopeId}>`);
                if (shop.website_url) {
                  _push2(`<div class="flex items-center gap-1"${_scopeId}>`);
                  _push2(ssrRenderComponent(_component_UIcon, {
                    name: "i-heroicons-globe-alt",
                    class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                  }, null, _parent2, _scopeId));
                  _push2(`<a${ssrRenderAttr("href", shop.website_url)} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"${_scopeId}> Visit Website </a></div>`);
                } else {
                  _push2(`<span class="text-zinc-400 dark:text-zinc-500 text-sm"${_scopeId}>No website</span>`);
                }
                _push2(`</div><div class="w-48"${_scopeId}>`);
                if (shop.google_rating) {
                  _push2(`<div class="flex items-center gap-1"${_scopeId}>`);
                  _push2(ssrRenderComponent(_component_UIcon, {
                    name: "i-heroicons-star",
                    class: "h-4 w-4 text-yellow-500"
                  }, null, _parent2, _scopeId));
                  _push2(`<span class="text-sm font-medium text-zinc-900 dark:text-white"${_scopeId}>${ssrInterpolate(shop.google_rating)}</span></div>`);
                } else {
                  _push2(`<span class="text-zinc-400 dark:text-zinc-500 text-sm"${_scopeId}>No rating</span>`);
                }
                _push2(`</div></div>`);
              });
              _push2(`<!--]--></div></div></div>`);
            } else if (unref(diveshops) && unref(diveshops).length === 0) {
              _push2(`<div class="text-center flex flex-col justify-center items-center p-8"${_scopeId}>`);
              _push2(ssrRenderComponent(_component_UIcon, {
                name: "i-heroicons-information-circle",
                class: "h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4"
              }, null, _parent2, _scopeId));
              _push2(`<h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2"${_scopeId}>No dive shops found</h3><p class="text-zinc-500 dark:text-zinc-400"${_scopeId}>There are no dive shops in the database.</p></div>`);
            } else {
              _push2(`<div class="text-center flex flex-col justify-center items-center p-8"${_scopeId}>`);
              _push2(ssrRenderComponent(_component_UIcon, {
                name: "i-heroicons-arrow-path",
                class: "animate-spin h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4"
              }, null, _parent2, _scopeId));
              _push2(`<h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2"${_scopeId}>Loading...</h3><p class="text-zinc-500 dark:text-zinc-400"${_scopeId}>Please wait while we load the dive shops data.</p></div>`);
            }
          } else {
            return [
              unref(pending) ? (openBlock(), createBlock("div", {
                key: 0,
                class: "flex items-center justify-center p-8"
              }, [
                createVNode("div", { class: "flex flex-col items-center" }, [
                  createVNode("div", { class: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" }),
                  createVNode("span", { class: "text-zinc-600 dark:text-zinc-400" }, "Loading dive shops...")
                ])
              ])) : unref(error) ? (openBlock(), createBlock("div", {
                key: 1,
                class: "flex items-center justify-center p-8"
              }, [
                createVNode("div", { class: "text-center" }, [
                  createVNode("h1", { class: "text-2xl font-bold text-red-600 dark:text-red-500 mb-2" }, "Error"),
                  createVNode("p", { class: "text-zinc-600 dark:text-zinc-400" }, toDisplayString(unref(error).message || "Failed to load dive shops"), 1)
                ])
              ])) : unref(diveshops) && unref(diveshops).length > 0 ? (openBlock(), createBlock("div", {
                key: 2,
                class: "h-full w-full flex flex-col"
              }, [
                createVNode("div", { class: "sticky left-0 top-0 z-10 border-b border-zinc-200 dark:border-zinc-700 w-full lg:h-[72px] flex flex-row justify-start items-center divide-x divide-zinc-200 dark:divide-zinc-700 shrink-0" }, [
                  createVNode("div", { class: "p-1 flex lg:hidden items-center h-full" }, [
                    createVNode("div", {
                      onClick: unref(toggleMobileMenu),
                      class: "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full min-h-8 h-full flex items-center justify-center cursor-pointer px-1"
                    }, [
                      createVNode(unref(Menu), { class: "w-4 h-4 lg:w-6 lg:h-6 text-zinc-900 dark:text-white" })
                    ], 8, ["onClick"])
                  ]),
                  createVNode("div", { class: "p-1 px-2 lg:p-4 flex items-center justify-between h-full grow" }, [
                    createVNode("h2", { class: "text-xl font-semibold text-zinc-900 dark:text-white whitespace-nowrap" }, "Dive Shops Directory"),
                    createVNode("div", { class: "flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap" }, toDisplayString(unref(diveshops).length) + " shops ", 1)
                  ])
                ]),
                createVNode("div", { class: "overflow-scroll h-full w-full" }, [
                  createVNode("div", { class: "w-fit" }, [
                    createVNode("div", { class: "bg-zinc-100 dark:bg-zinc-800 grid auto-cols-auto grid-flow-col gap-4 px-6 py-3 sticky top-0 z-10 w-fit lg:w-full" }, [
                      createVNode("div", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-96" }, "Business Name "),
                      createVNode("div", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-64" }, "Location"),
                      createVNode("div", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-64" }, "Contact"),
                      createVNode("div", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-48" }, "Website"),
                      createVNode("div", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-48" }, "Rating")
                    ]),
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(diveshops), (shop) => {
                      return openBlock(), createBlock("div", {
                        key: shop.id,
                        class: "grid auto-cols-auto grid-flow-col gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 w-fit lg:w-full cursor-pointer",
                        onClick: ($event) => navigateToShop(shop)
                      }, [
                        createVNode("div", { class: "font-medium text-zinc-900 dark:text-white w-96 hover:text-blue-600 dark:hover:text-blue-400" }, toDisplayString(shop.business_name), 1),
                        createVNode("div", { class: "w-64" }, [
                          createVNode("div", { class: "text-sm text-zinc-900 dark:text-white" }, toDisplayString([shop.locale, shop.country?.name ?? shop.country].filter(Boolean).join(", ")), 1),
                          shop.street_address ? (openBlock(), createBlock("div", {
                            key: 0,
                            class: "text-sm text-zinc-500 dark:text-zinc-400"
                          }, toDisplayString(shop.street_address), 1)) : createCommentVNode("", true),
                          shop.region?.name ?? shop.region ? (openBlock(), createBlock("div", {
                            key: 1,
                            class: "text-xs text-zinc-400 dark:text-zinc-500"
                          }, toDisplayString(shop.region?.name ?? shop.region), 1)) : createCommentVNode("", true)
                        ]),
                        createVNode("div", { class: "space-y-1 w-64" }, [
                          shop.phone ? (openBlock(), createBlock("div", {
                            key: 0,
                            class: "flex items-center gap-1"
                          }, [
                            createVNode(_component_UIcon, {
                              name: "i-heroicons-phone",
                              class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                            }),
                            createVNode("a", {
                              href: `tel:${shop.phone}`,
                              class: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                            }, toDisplayString(shop.phone), 9, ["href"])
                          ])) : createCommentVNode("", true),
                          shop.email ? (openBlock(), createBlock("div", {
                            key: 1,
                            class: "flex items-center gap-1"
                          }, [
                            createVNode(_component_UIcon, {
                              name: "i-heroicons-envelope",
                              class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                            }),
                            createVNode("a", {
                              href: `mailto:${shop.email}`,
                              class: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                            }, toDisplayString(shop.email), 9, ["href"])
                          ])) : createCommentVNode("", true)
                        ]),
                        createVNode("div", { class: "w-48" }, [
                          shop.website_url ? (openBlock(), createBlock("div", {
                            key: 0,
                            class: "flex items-center gap-1"
                          }, [
                            createVNode(_component_UIcon, {
                              name: "i-heroicons-globe-alt",
                              class: "h-4 w-4 text-zinc-400 dark:text-zinc-500"
                            }),
                            createVNode("a", {
                              href: shop.website_url,
                              target: "_blank",
                              rel: "noopener noreferrer",
                              class: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                            }, " Visit Website ", 8, ["href"])
                          ])) : (openBlock(), createBlock("span", {
                            key: 1,
                            class: "text-zinc-400 dark:text-zinc-500 text-sm"
                          }, "No website"))
                        ]),
                        createVNode("div", { class: "w-48" }, [
                          shop.google_rating ? (openBlock(), createBlock("div", {
                            key: 0,
                            class: "flex items-center gap-1"
                          }, [
                            createVNode(_component_UIcon, {
                              name: "i-heroicons-star",
                              class: "h-4 w-4 text-yellow-500"
                            }),
                            createVNode("span", { class: "text-sm font-medium text-zinc-900 dark:text-white" }, toDisplayString(shop.google_rating), 1)
                          ])) : (openBlock(), createBlock("span", {
                            key: 1,
                            class: "text-zinc-400 dark:text-zinc-500 text-sm"
                          }, "No rating"))
                        ])
                      ], 8, ["onClick"]);
                    }), 128))
                  ])
                ])
              ])) : unref(diveshops) && unref(diveshops).length === 0 ? (openBlock(), createBlock("div", {
                key: 3,
                class: "text-center flex flex-col justify-center items-center p-8"
              }, [
                createVNode(_component_UIcon, {
                  name: "i-heroicons-information-circle",
                  class: "h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4"
                }),
                createVNode("h3", { class: "text-lg font-medium text-zinc-900 dark:text-white mb-2" }, "No dive shops found"),
                createVNode("p", { class: "text-zinc-500 dark:text-zinc-400" }, "There are no dive shops in the database.")
              ])) : (openBlock(), createBlock("div", {
                key: 4,
                class: "text-center flex flex-col justify-center items-center p-8"
              }, [
                createVNode(_component_UIcon, {
                  name: "i-heroicons-arrow-path",
                  class: "animate-spin h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4"
                }),
                createVNode("h3", { class: "text-lg font-medium text-zinc-900 dark:text-white mb-2" }, "Loading..."),
                createVNode("p", { class: "text-zinc-500 dark:text-zinc-400" }, "Please wait while we load the dive shops data.")
              ]))
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/shops/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-DfZZXPfb.mjs.map
