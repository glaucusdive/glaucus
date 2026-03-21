import { _ as __nuxt_component_0 } from './nuxt-layout-6ihe2rVK.mjs';
import { a as useRoute, b as useRouter, _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, computed, ref, mergeProps, withCtx, unref, createTextVNode, createVNode, createBlock, createCommentVNode, toDisplayString, openBlock, withModifiers, withDirectives, isRef, vModelText, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrInterpolate, ssrRenderClass, ssrRenderAttr, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { u as useAuth } from './useAuth-8ihLM1hW.mjs';
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
import './useSupabase-eANk4KtY.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    const router = useRouter();
    const isSignUp = computed(() => route.path === "/auth/signup" || route.query.signup === "1");
    const { signInWithGoogle, signUpWithEmail, signInWithEmail, signInWithMagicLink } = useAuth();
    const email = ref("");
    const password = ref("");
    const displayName = ref("");
    const magicLinkOnly = ref(false);
    const loading = ref(false);
    const message = ref("");
    const messageSuccess = ref(false);
    function setMessage(text, success) {
      message.value = text;
      messageSuccess.value = success;
    }
    async function handleGoogle() {
      loading.value = true;
      message.value = "";
      try {
        const redirect = route.query.redirect || "/";
        await signInWithGoogle(redirect);
        await router.push(redirect);
      } catch (e) {
        const err = e;
        setMessage(err?.message ?? "Sign in with Google failed", false);
      } finally {
        loading.value = false;
      }
    }
    async function handleEmail() {
      loading.value = true;
      message.value = "";
      try {
        if (magicLinkOnly.value) {
          await signInWithMagicLink(email.value);
          setMessage("Check your email for the sign-in link.", true);
        } else if (isSignUp.value) {
          await signUpWithEmail(email.value, password.value, displayName.value || void 0);
          setMessage("Check your email to confirm your account, then sign in.", true);
        } else {
          await signInWithEmail(email.value, password.value);
          const redirect = route.query.redirect || "/";
          await router.push(redirect);
        }
      } catch (e) {
        const err = e;
        setMessage(err?.message ?? "Something went wrong", false);
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-center"${_scopeId}><div class="w-full max-w-md space-y-6"${_scopeId}><h1 class="text-2xl font-bold text-zinc-900 dark:text-white text-center"${_scopeId}>${ssrInterpolate(unref(isSignUp) ? "Create account" : "Sign in")}</h1>`);
            if (unref(message)) {
              _push2(`<div class="${ssrRenderClass([unref(messageSuccess) ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200", "p-3 rounded-md text-sm"])}"${_scopeId}>${ssrInterpolate(unref(message))}</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<button type="button" class="w-full flex items-center justify-center gap-2 py-3 px-4 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer font-medium"${_scopeId}><svg class="w-5 h-5" viewBox="0 0 24 24"${_scopeId}><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"${_scopeId}></path><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"${_scopeId}></path><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"${_scopeId}></path><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"${_scopeId}></path></svg> Continue with Google </button><div class="relative"${_scopeId}><div class="absolute inset-0 flex items-center"${_scopeId}><div class="w-full border-t border-zinc-300 dark:border-zinc-600"${_scopeId}></div></div><div class="relative flex justify-center text-sm"${_scopeId}><span class="px-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"${_scopeId}>or</span></div></div><form class="space-y-3"${_scopeId}>`);
            if (unref(isSignUp)) {
              _push2(`<div class="flex flex-col gap-1"${_scopeId}><label for="displayName" class="text-xs font-medium text-zinc-700 dark:text-zinc-300"${_scopeId}>Display name (optional)</label><input id="displayName"${ssrRenderAttr("value", unref(displayName))} type="text" autocomplete="name" class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"${_scopeId}></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<div class="flex flex-col gap-1"${_scopeId}><label for="email" class="text-xs font-medium text-zinc-700 dark:text-zinc-300"${_scopeId}>Email</label><input id="email"${ssrRenderAttr("value", unref(email))} type="email" required autocomplete="email" class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500" placeholder="you@example.com"${_scopeId}></div>`);
            if (!unref(magicLinkOnly)) {
              _push2(`<div class="flex flex-col gap-1"${_scopeId}><label for="password" class="text-xs font-medium text-zinc-700 dark:text-zinc-300"${_scopeId}>Password</label><input id="password"${ssrRenderAttr("value", unref(password))} type="password"${ssrIncludeBooleanAttr(!unref(magicLinkOnly)) ? " required" : ""} autocomplete="password" class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"${_scopeId}></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<div class="flex flex-col gap-2"${_scopeId}><button type="submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} class="w-full py-3 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"${_scopeId}>${ssrInterpolate(unref(loading) ? "Please wait…" : unref(magicLinkOnly) ? "Send magic link" : unref(isSignUp) ? "Sign up" : "Sign in")}</button>`);
            if (!unref(magicLinkOnly)) {
              _push2(`<button type="button" class="w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"${_scopeId}> Use magic link instead </button>`);
            } else {
              _push2(`<button type="button" class="w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"${_scopeId}> Use password instead </button>`);
            }
            _push2(`</div></form><p class="text-center text-sm text-zinc-600 dark:text-zinc-400"${_scopeId}>`);
            if (unref(isSignUp)) {
              _push2(ssrRenderComponent(_component_NuxtLink, {
                to: "/auth",
                class: "underline hover:no-underline"
              }, {
                default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(`Already have an account? Sign in`);
                  } else {
                    return [
                      createTextVNode("Already have an account? Sign in")
                    ];
                  }
                }),
                _: 1
              }, _parent2, _scopeId));
            } else {
              _push2(ssrRenderComponent(_component_NuxtLink, {
                to: "/auth/signup",
                class: "underline hover:no-underline"
              }, {
                default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(`Create an account`);
                  } else {
                    return [
                      createTextVNode("Create an account")
                    ];
                  }
                }),
                _: 1
              }, _parent2, _scopeId));
            }
            _push2(`</p></div></div>`);
          } else {
            return [
              createVNode("div", { class: "min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-center" }, [
                createVNode("div", { class: "w-full max-w-md space-y-6" }, [
                  createVNode("h1", { class: "text-2xl font-bold text-zinc-900 dark:text-white text-center" }, toDisplayString(unref(isSignUp) ? "Create account" : "Sign in"), 1),
                  unref(message) ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: ["p-3 rounded-md text-sm", unref(messageSuccess) ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"]
                  }, toDisplayString(unref(message)), 3)) : createCommentVNode("", true),
                  createVNode("button", {
                    type: "button",
                    onClick: handleGoogle,
                    class: "w-full flex items-center justify-center gap-2 py-3 px-4 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer font-medium"
                  }, [
                    (openBlock(), createBlock("svg", {
                      class: "w-5 h-5",
                      viewBox: "0 0 24 24"
                    }, [
                      createVNode("path", {
                        fill: "currentColor",
                        d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      }),
                      createVNode("path", {
                        fill: "currentColor",
                        d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      }),
                      createVNode("path", {
                        fill: "currentColor",
                        d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      }),
                      createVNode("path", {
                        fill: "currentColor",
                        d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      })
                    ])),
                    createTextVNode(" Continue with Google ")
                  ]),
                  createVNode("div", { class: "relative" }, [
                    createVNode("div", { class: "absolute inset-0 flex items-center" }, [
                      createVNode("div", { class: "w-full border-t border-zinc-300 dark:border-zinc-600" })
                    ]),
                    createVNode("div", { class: "relative flex justify-center text-sm" }, [
                      createVNode("span", { class: "px-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400" }, "or")
                    ])
                  ]),
                  createVNode("form", {
                    onSubmit: withModifiers(handleEmail, ["prevent"]),
                    class: "space-y-3"
                  }, [
                    unref(isSignUp) ? (openBlock(), createBlock("div", {
                      key: 0,
                      class: "flex flex-col gap-1"
                    }, [
                      createVNode("label", {
                        for: "displayName",
                        class: "text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      }, "Display name (optional)"),
                      withDirectives(createVNode("input", {
                        id: "displayName",
                        "onUpdate:modelValue": ($event) => isRef(displayName) ? displayName.value = $event : null,
                        type: "text",
                        autocomplete: "name",
                        class: "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [vModelText, unref(displayName)]
                      ])
                    ])) : createCommentVNode("", true),
                    createVNode("div", { class: "flex flex-col gap-1" }, [
                      createVNode("label", {
                        for: "email",
                        class: "text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      }, "Email"),
                      withDirectives(createVNode("input", {
                        id: "email",
                        "onUpdate:modelValue": ($event) => isRef(email) ? email.value = $event : null,
                        type: "email",
                        required: "",
                        autocomplete: "email",
                        class: "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
                        placeholder: "you@example.com"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [vModelText, unref(email)]
                      ])
                    ]),
                    !unref(magicLinkOnly) ? (openBlock(), createBlock("div", {
                      key: 1,
                      class: "flex flex-col gap-1"
                    }, [
                      createVNode("label", {
                        for: "password",
                        class: "text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      }, "Password"),
                      withDirectives(createVNode("input", {
                        id: "password",
                        "onUpdate:modelValue": ($event) => isRef(password) ? password.value = $event : null,
                        type: "password",
                        required: !unref(magicLinkOnly),
                        autocomplete: "password",
                        class: "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                      }, null, 8, ["onUpdate:modelValue", "required"]), [
                        [vModelText, unref(password)]
                      ])
                    ])) : createCommentVNode("", true),
                    createVNode("div", { class: "flex flex-col gap-2" }, [
                      createVNode("button", {
                        type: "submit",
                        disabled: unref(loading),
                        class: "w-full py-3 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"
                      }, toDisplayString(unref(loading) ? "Please wait…" : unref(magicLinkOnly) ? "Send magic link" : unref(isSignUp) ? "Sign up" : "Sign in"), 9, ["disabled"]),
                      !unref(magicLinkOnly) ? (openBlock(), createBlock("button", {
                        key: 0,
                        type: "button",
                        onClick: ($event) => magicLinkOnly.value = true,
                        class: "w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      }, " Use magic link instead ", 8, ["onClick"])) : (openBlock(), createBlock("button", {
                        key: 1,
                        type: "button",
                        onClick: ($event) => magicLinkOnly.value = false,
                        class: "w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      }, " Use password instead ", 8, ["onClick"]))
                    ])
                  ], 32),
                  createVNode("p", { class: "text-center text-sm text-zinc-600 dark:text-zinc-400" }, [
                    unref(isSignUp) ? (openBlock(), createBlock(_component_NuxtLink, {
                      key: 0,
                      to: "/auth",
                      class: "underline hover:no-underline"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("Already have an account? Sign in")
                      ]),
                      _: 1
                    })) : (openBlock(), createBlock(_component_NuxtLink, {
                      key: 1,
                      to: "/auth/signup",
                      class: "underline hover:no-underline"
                    }, {
                      default: withCtx(() => [
                        createTextVNode("Create an account")
                      ]),
                      _: 1
                    }))
                  ])
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/auth/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-BWlK1plF.mjs.map
