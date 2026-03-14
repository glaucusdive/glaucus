import { _ as __nuxt_component_0 } from './nuxt-layout-D1Os6LCO.mjs';
import { _ as __nuxt_component_0$1 } from './server.mjs';
import { defineComponent, ref, mergeProps, withCtx, createTextVNode, unref, createVNode, createBlock, openBlock, withModifiers, createCommentVNode, withDirectives, vModelText, Fragment, renderList, toDisplayString, vModelSelect, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttr, ssrRenderList, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrRenderClass } from 'vue/server-renderer';
import { u as useAuth } from './useAuth-BUYZlfj2.mjs';
import { u as useSupabase } from './useSupabase-DR_u3VFp.mjs';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "defaults",
  __ssrInlineRender: true,
  setup(__props) {
    const { user } = useAuth();
    const { client } = useSupabase();
    const gearTypes = ["Wetsuit", "Drysuit", "BCD", "Regulator", "Fins", "Mask", "Snorkel", "Dive Computer", "Weight Belt", "Tank"];
    const defaultsForm = ref({
      name: "",
      email: "",
      divers: []
    });
    const defaultsLoading = ref(true);
    const defaultsSaving = ref(false);
    const defaultsSaveMessage = ref("");
    const defaultsSaveSuccess = ref(false);
    function addDefaultDiver() {
      defaultsForm.value.divers.push({
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
    function removeDefaultDiver(idx) {
      defaultsForm.value.divers.splice(idx, 1);
    }
    function addDiverGearFromSelect(idx) {
      const v = defaultsForm.value.divers[idx]?.gearToAdd;
      if (!v) return;
      if (!defaultsForm.value.divers[idx].gear.some((g) => g.gearType === v)) {
        defaultsForm.value.divers[idx].gear.push({ gearType: v });
      }
      defaultsForm.value.divers[idx].gearToAdd = "";
    }
    function removeDiverGear(diverIdx, gearIdx) {
      defaultsForm.value.divers[diverIdx].gear.splice(gearIdx, 1);
    }
    async function saveDefaults() {
      if (!user.value?.id) return;
      defaultsSaving.value = true;
      defaultsSaveMessage.value = "";
      try {
        const default_divers = defaultsForm.value.divers.map((d) => ({
          name: d.name ?? "",
          certification_number: d.certificationNumber ?? "",
          number_of_dives: d.numberOfDives ?? "",
          height: d.height ?? "",
          height_unit: d.heightUnit ?? "cm",
          weight: d.weight ?? "",
          weight_unit: d.weightUnit ?? "kg",
          gear: (d.gear || []).map((g) => ({ gear_type: g.gearType ?? "" }))
        }));
        const { error } = await client.from("profiles").update({
          display_name: defaultsForm.value.name || null,
          email: defaultsForm.value.email || null,
          default_divers,
          default_diver: default_divers[0] ? {
            name: default_divers[0].name,
            certification_number: default_divers[0].certification_number,
            number_of_dives: default_divers[0].number_of_dives,
            height: default_divers[0].height,
            height_unit: default_divers[0].height_unit,
            weight: default_divers[0].weight,
            weight_unit: default_divers[0].weight_unit,
            gear: default_divers[0].gear
          } : null
        }).eq("id", user.value.id);
        if (error) {
          defaultsSaveSuccess.value = false;
          defaultsSaveMessage.value = error.message || "Failed to save";
        } else {
          defaultsSaveSuccess.value = true;
          defaultsSaveMessage.value = "Defaults saved. Future bookings will use this info.";
        }
      } catch (e) {
        defaultsSaveSuccess.value = false;
        defaultsSaveMessage.value = e?.message ?? "Failed to save";
      } finally {
        defaultsSaving.value = false;
      }
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLayout = __nuxt_component_0;
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(ssrRenderComponent(_component_NuxtLayout, mergeProps({ name: "default" }, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4"${_scopeId}>`);
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
            _push2(`<h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2"${_scopeId}>Booking defaults</h1><p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6"${_scopeId}>This info is used to prefill bookings. You can set it here or it’ll be saved from your first completed booking.</p>`);
            if (unref(defaultsLoading)) {
              _push2(`<div class="text-sm text-zinc-500 dark:text-zinc-400"${_scopeId}>Loading…</div>`);
            } else {
              _push2(`<form class="space-y-4 max-w-xl"${_scopeId}><div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3"${_scopeId}><h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300"${_scopeId}>Contact</h2><div${_scopeId}><label for="profile-name" class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1"${_scopeId}>Name</label><input id="profile-name"${ssrRenderAttr("value", unref(defaultsForm).name)} type="text" class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm" placeholder="Your name"${_scopeId}></div><div${_scopeId}><label for="profile-email" class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1"${_scopeId}>Email</label><input id="profile-email"${ssrRenderAttr("value", unref(defaultsForm).email)} type="email" class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm" placeholder="you@example.com"${_scopeId}></div></div><div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-4"${_scopeId}><div class="flex items-center justify-between"${_scopeId}><h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300"${_scopeId}>Default divers</h2><button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"${_scopeId}>+ Add diver</button></div><!--[-->`);
              ssrRenderList(unref(defaultsForm).divers, (diver, idx) => {
                _push2(`<div class="border border-zinc-200 dark:border-zinc-600 rounded-md p-3 space-y-2"${_scopeId}><div class="flex justify-between items-center"${_scopeId}><span class="text-xs font-medium text-zinc-500 dark:text-zinc-400"${_scopeId}>Diver ${ssrInterpolate(idx + 1)}</span>`);
                if (unref(defaultsForm).divers.length > 1) {
                  _push2(`<button type="button" class="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"${_scopeId}>Remove</button>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2"${_scopeId}><div${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Name</label><input${ssrRenderAttr("value", diver.name)} type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}></div><div${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Certification #</label><input${ssrRenderAttr("value", diver.certificationNumber)} type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}></div><div${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Number of dives</label><input${ssrRenderAttr("value", diver.numberOfDives)} type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" placeholder="e.g. 21"${_scopeId}></div><div class="flex gap-2"${_scopeId}><div class="flex-1"${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Height</label><input${ssrRenderAttr("value", diver.height)} type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}></div><div class="w-20"${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Unit</label><select class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}><option value="cm"${ssrIncludeBooleanAttr(Array.isArray(diver.heightUnit) ? ssrLooseContain(diver.heightUnit, "cm") : ssrLooseEqual(diver.heightUnit, "cm")) ? " selected" : ""}${_scopeId}>cm</option><option value="ft-in"${ssrIncludeBooleanAttr(Array.isArray(diver.heightUnit) ? ssrLooseContain(diver.heightUnit, "ft-in") : ssrLooseEqual(diver.heightUnit, "ft-in")) ? " selected" : ""}${_scopeId}>ft &amp; in</option></select></div></div><div class="flex gap-2"${_scopeId}><div class="flex-1"${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Weight</label><input${ssrRenderAttr("value", diver.weight)} type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}></div><div class="w-20"${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5"${_scopeId}>Unit</label><select class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"${_scopeId}><option value="kg"${ssrIncludeBooleanAttr(Array.isArray(diver.weightUnit) ? ssrLooseContain(diver.weightUnit, "kg") : ssrLooseEqual(diver.weightUnit, "kg")) ? " selected" : ""}${_scopeId}>kg</option><option value="lbs"${ssrIncludeBooleanAttr(Array.isArray(diver.weightUnit) ? ssrLooseContain(diver.weightUnit, "lbs") : ssrLooseEqual(diver.weightUnit, "lbs")) ? " selected" : ""}${_scopeId}>lbs</option></select></div></div></div><div${_scopeId}><label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1"${_scopeId}>Past rental gear</label><div class="flex flex-wrap gap-2"${_scopeId}><!--[-->`);
                ssrRenderList(diver.gear, (g, gi) => {
                  _push2(`<span class="inline-flex items-center gap-1 rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"${_scopeId}>${ssrInterpolate(g.gearType || "Gear")} <button type="button" class="hover:text-red-600 dark:hover:text-red-400 cursor-pointer" aria-label="Remove"${_scopeId}>×</button></span>`);
                });
                _push2(`<!--]--><select class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-white"${_scopeId}><option value=""${ssrIncludeBooleanAttr(Array.isArray(diver.gearToAdd) ? ssrLooseContain(diver.gearToAdd, "") : ssrLooseEqual(diver.gearToAdd, "")) ? " selected" : ""}${_scopeId}>Add gear…</option><!--[-->`);
                ssrRenderList(gearTypes, (t) => {
                  _push2(`<option${ssrRenderAttr("value", t)}${ssrIncludeBooleanAttr(Array.isArray(diver.gearToAdd) ? ssrLooseContain(diver.gearToAdd, t) : ssrLooseEqual(diver.gearToAdd, t)) ? " selected" : ""}${_scopeId}>${ssrInterpolate(t)}</option>`);
                });
                _push2(`<!--]--></select></div></div></div>`);
              });
              _push2(`<!--]--></div>`);
              if (unref(defaultsSaveMessage)) {
                _push2(`<div class="${ssrRenderClass([unref(defaultsSaveSuccess) ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400", "text-sm"])}"${_scopeId}>${ssrInterpolate(unref(defaultsSaveMessage))}</div>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`<button type="submit"${ssrIncludeBooleanAttr(unref(defaultsSaving)) ? " disabled" : ""} class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"${_scopeId}>${ssrInterpolate(unref(defaultsSaving) ? "Saving…" : "Save defaults")}</button></form>`);
            }
            _push2(`</div>`);
          } else {
            return [
              createVNode("div", { class: "min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4" }, [
                createVNode(_component_NuxtLink, {
                  to: "/profile",
                  class: "inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer"
                }, {
                  default: withCtx(() => [
                    createTextVNode(" ← Profile ")
                  ]),
                  _: 1
                }),
                createVNode("h1", { class: "text-xl font-bold text-zinc-900 dark:text-white mb-2" }, "Booking defaults"),
                createVNode("p", { class: "text-sm text-zinc-500 dark:text-zinc-400 mb-6" }, "This info is used to prefill bookings. You can set it here or it’ll be saved from your first completed booking."),
                unref(defaultsLoading) ? (openBlock(), createBlock("div", {
                  key: 0,
                  class: "text-sm text-zinc-500 dark:text-zinc-400"
                }, "Loading…")) : (openBlock(), createBlock("form", {
                  key: 1,
                  onSubmit: withModifiers(saveDefaults, ["prevent"]),
                  class: "space-y-4 max-w-xl"
                }, [
                  createVNode("div", { class: "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3" }, [
                    createVNode("h2", { class: "text-sm font-medium text-zinc-700 dark:text-zinc-300" }, "Contact"),
                    createVNode("div", null, [
                      createVNode("label", {
                        for: "profile-name",
                        class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-1"
                      }, "Name"),
                      withDirectives(createVNode("input", {
                        id: "profile-name",
                        "onUpdate:modelValue": ($event) => unref(defaultsForm).name = $event,
                        type: "text",
                        class: "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm",
                        placeholder: "Your name"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [vModelText, unref(defaultsForm).name]
                      ])
                    ]),
                    createVNode("div", null, [
                      createVNode("label", {
                        for: "profile-email",
                        class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-1"
                      }, "Email"),
                      withDirectives(createVNode("input", {
                        id: "profile-email",
                        "onUpdate:modelValue": ($event) => unref(defaultsForm).email = $event,
                        type: "email",
                        class: "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm",
                        placeholder: "you@example.com"
                      }, null, 8, ["onUpdate:modelValue"]), [
                        [vModelText, unref(defaultsForm).email]
                      ])
                    ])
                  ]),
                  createVNode("div", { class: "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-4" }, [
                    createVNode("div", { class: "flex items-center justify-between" }, [
                      createVNode("h2", { class: "text-sm font-medium text-zinc-700 dark:text-zinc-300" }, "Default divers"),
                      createVNode("button", {
                        type: "button",
                        onClick: addDefaultDiver,
                        class: "text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      }, "+ Add diver")
                    ]),
                    (openBlock(true), createBlock(Fragment, null, renderList(unref(defaultsForm).divers, (diver, idx) => {
                      return openBlock(), createBlock("div", {
                        key: idx,
                        class: "border border-zinc-200 dark:border-zinc-600 rounded-md p-3 space-y-2"
                      }, [
                        createVNode("div", { class: "flex justify-between items-center" }, [
                          createVNode("span", { class: "text-xs font-medium text-zinc-500 dark:text-zinc-400" }, "Diver " + toDisplayString(idx + 1), 1),
                          unref(defaultsForm).divers.length > 1 ? (openBlock(), createBlock("button", {
                            key: 0,
                            type: "button",
                            onClick: ($event) => removeDefaultDiver(idx),
                            class: "text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          }, "Remove", 8, ["onClick"])) : createCommentVNode("", true)
                        ]),
                        createVNode("div", { class: "grid grid-cols-1 sm:grid-cols-2 gap-2" }, [
                          createVNode("div", null, [
                            createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Name"),
                            withDirectives(createVNode("input", {
                              "onUpdate:modelValue": ($event) => diver.name = $event,
                              type: "text",
                              class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                            }, null, 8, ["onUpdate:modelValue"]), [
                              [vModelText, diver.name]
                            ])
                          ]),
                          createVNode("div", null, [
                            createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Certification #"),
                            withDirectives(createVNode("input", {
                              "onUpdate:modelValue": ($event) => diver.certificationNumber = $event,
                              type: "text",
                              class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                            }, null, 8, ["onUpdate:modelValue"]), [
                              [vModelText, diver.certificationNumber]
                            ])
                          ]),
                          createVNode("div", null, [
                            createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Number of dives"),
                            withDirectives(createVNode("input", {
                              "onUpdate:modelValue": ($event) => diver.numberOfDives = $event,
                              type: "text",
                              class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white",
                              placeholder: "e.g. 21"
                            }, null, 8, ["onUpdate:modelValue"]), [
                              [vModelText, diver.numberOfDives]
                            ])
                          ]),
                          createVNode("div", { class: "flex gap-2" }, [
                            createVNode("div", { class: "flex-1" }, [
                              createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Height"),
                              withDirectives(createVNode("input", {
                                "onUpdate:modelValue": ($event) => diver.height = $event,
                                type: "text",
                                class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                              }, null, 8, ["onUpdate:modelValue"]), [
                                [vModelText, diver.height]
                              ])
                            ]),
                            createVNode("div", { class: "w-20" }, [
                              createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Unit"),
                              withDirectives(createVNode("select", {
                                "onUpdate:modelValue": ($event) => diver.heightUnit = $event,
                                class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                              }, [
                                createVNode("option", { value: "cm" }, "cm"),
                                createVNode("option", { value: "ft-in" }, "ft & in")
                              ], 8, ["onUpdate:modelValue"]), [
                                [vModelSelect, diver.heightUnit]
                              ])
                            ])
                          ]),
                          createVNode("div", { class: "flex gap-2" }, [
                            createVNode("div", { class: "flex-1" }, [
                              createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Weight"),
                              withDirectives(createVNode("input", {
                                "onUpdate:modelValue": ($event) => diver.weight = $event,
                                type: "text",
                                class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                              }, null, 8, ["onUpdate:modelValue"]), [
                                [vModelText, diver.weight]
                              ])
                            ]),
                            createVNode("div", { class: "w-20" }, [
                              createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5" }, "Unit"),
                              withDirectives(createVNode("select", {
                                "onUpdate:modelValue": ($event) => diver.weightUnit = $event,
                                class: "w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white"
                              }, [
                                createVNode("option", { value: "kg" }, "kg"),
                                createVNode("option", { value: "lbs" }, "lbs")
                              ], 8, ["onUpdate:modelValue"]), [
                                [vModelSelect, diver.weightUnit]
                              ])
                            ])
                          ])
                        ]),
                        createVNode("div", null, [
                          createVNode("label", { class: "block text-xs text-zinc-500 dark:text-zinc-400 mb-1" }, "Past rental gear"),
                          createVNode("div", { class: "flex flex-wrap gap-2" }, [
                            (openBlock(true), createBlock(Fragment, null, renderList(diver.gear, (g, gi) => {
                              return openBlock(), createBlock("span", {
                                key: gi,
                                class: "inline-flex items-center gap-1 rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"
                              }, [
                                createTextVNode(toDisplayString(g.gearType || "Gear") + " ", 1),
                                createVNode("button", {
                                  type: "button",
                                  onClick: ($event) => removeDiverGear(idx, gi),
                                  class: "hover:text-red-600 dark:hover:text-red-400 cursor-pointer",
                                  "aria-label": "Remove"
                                }, "×", 8, ["onClick"])
                              ]);
                            }), 128)),
                            withDirectives(createVNode("select", {
                              "onUpdate:modelValue": ($event) => diver.gearToAdd = $event,
                              onChange: ($event) => addDiverGearFromSelect(idx),
                              class: "rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-white"
                            }, [
                              createVNode("option", { value: "" }, "Add gear…"),
                              (openBlock(), createBlock(Fragment, null, renderList(gearTypes, (t) => {
                                return createVNode("option", {
                                  key: t,
                                  value: t
                                }, toDisplayString(t), 9, ["value"]);
                              }), 64))
                            ], 40, ["onUpdate:modelValue", "onChange"]), [
                              [vModelSelect, diver.gearToAdd]
                            ])
                          ])
                        ])
                      ]);
                    }), 128))
                  ]),
                  unref(defaultsSaveMessage) ? (openBlock(), createBlock("div", {
                    key: 0,
                    class: ["text-sm", unref(defaultsSaveSuccess) ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"]
                  }, toDisplayString(unref(defaultsSaveMessage)), 3)) : createCommentVNode("", true),
                  createVNode("button", {
                    type: "submit",
                    disabled: unref(defaultsSaving),
                    class: "px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"
                  }, toDisplayString(unref(defaultsSaving) ? "Saving…" : "Save defaults"), 9, ["disabled"])
                ], 32))
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/profile/defaults.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=defaults-BIPwOlsc.mjs.map
