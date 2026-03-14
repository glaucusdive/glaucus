import { c as useAsyncData, d as createError, _ as __nuxt_component_0$1 } from './server.mjs';
import { computed, ref, mergeProps, unref, withCtx, createBlock, openBlock, createCommentVNode, toDisplayString, Fragment, renderList, createVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderClass, ssrRenderList, ssrRenderAttr, ssrRenderSlot } from 'vue/server-renderer';
import { ChevronLeft, X, MapPin, Phone, Mail, Globe } from 'lucide-vue-next';
import { a as useSupabase } from './useSupabase-CXasCJo6.mjs';

const _sfc_main$1 = {
  __name: "CardInfo",
  __ssrInlineRender: true,
  props: {
    title: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: null
    },
    items: {
      type: Array,
      default: () => []
    },
    emptyMessage: {
      type: String,
      default: "Not available"
    },
    displayMode: {
      type: String,
      default: "list",
      validator: (value) => ["list", "text"].includes(value)
    }
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1" }, _attrs))}>`);
      if (__props.image) {
        _push(`<div class="w-full h-24 xl:h-32 bg-zinc-200 dark:bg-zinc-700 rounded-sm overflow-hidden mb-2"><img${ssrRenderAttr("src", __props.image)}${ssrRenderAttr("alt", __props.title)} class="w-full h-full object-cover"></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<h2 class="text-sm font-bold text-zinc-900 dark:text-white">${ssrInterpolate(__props.title)}</h2>`);
      if (_ctx.$slots.default) {
        _push(`<div class="text-sm text-zinc-900 dark:text-zinc-300">`);
        ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
        _push(`</div>`);
      } else if (__props.displayMode === "text") {
        _push(`<div class="text-sm text-zinc-900 dark:text-zinc-300">`);
        if (__props.items && __props.items.length > 0) {
          _push(`<!--[-->${ssrInterpolate(__props.items.join(", "))}<!--]-->`);
        } else {
          _push(`<span class="text-zinc-500 dark:text-zinc-400 italic">${ssrInterpolate(__props.emptyMessage)}</span>`);
        }
        _push(`</div>`);
      } else {
        _push(`<ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300">`);
        if (__props.items && __props.items.length > 0) {
          _push(`<!--[-->`);
          ssrRenderList(__props.items, (item, index) => {
            _push(`<li>`);
            if (typeof item === "object" && item !== null) {
              _push(`<!--[-->${ssrInterpolate(item.label)}: ${ssrInterpolate(item.hours)}<!--]-->`);
            } else {
              _push(`<!--[-->${ssrInterpolate(item)}<!--]-->`);
            }
            _push(`</li>`);
          });
          _push(`<!--]-->`);
        } else {
          _push(`<li class="text-zinc-500 dark:text-zinc-400 italic">${ssrInterpolate(__props.emptyMessage)}</li>`);
        }
        _push(`</ul>`);
      }
      _push(`</div>`);
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CardInfo.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const isDemoMode = ref(false);
const useDemoMode = () => {
  const toggleDemoMode = () => {
    isDemoMode.value = !isDemoMode.value;
  };
  const enableDemoMode = () => {
    isDemoMode.value = true;
  };
  const disableDemoMode = () => {
    isDemoMode.value = false;
  };
  return {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode
  };
};
const formatTime = (time24) => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours || "0", 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes || "00"} ${period}`;
};
const formatOperatingHours = (hoursData) => {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, index) => {
    const hours = hoursData?.[day];
    if (!hours || hours === "closed") {
      return { name: day, label: labels[index], hours: "Closed" };
    }
    const [open, close] = hours.split("-");
    return {
      name: day,
      label: labels[index],
      hours: `${formatTime(open)} - ${formatTime(close)}`
    };
  });
};
const demoHours = {
  monday: "07:30-17:00",
  tuesday: "07:30-17:00",
  wednesday: "07:30-17:00",
  thursday: "07:30-17:00",
  friday: "07:30-17:00",
  saturday: "07:30-17:00",
  sunday: "07:30-17:00"
};
const demoLanguages = ["English", "Spanish", "French", "German"];
const demoDescription = `Our dive center is one of the longest established in the region, offering lush underwater gardens, colourful fishes and magnificent seascapes.

We tend to our underwater environments with the recent introduction of our Coral Gardening Project, which guests can take part in too.

Our facility features spacious air-conditioned classrooms, a comprehensive library, hot water showers, and secure equipment storage rooms.

The equipment we employ includes internationally-reputed brands such as Mares, Scubapro, Aqua Lung, Dive Rite and Suunto.

Please contact the dive center upon your arrival to book your diving program.`;
function useShopDetail(shopId) {
  const { client } = useSupabase();
  const { data, pending, error } = useAsyncData(
    `diveshop-${shopId}`,
    async () => {
      if (!shopId) return { shop: null, nearbyShops: [] };
      const { data: shopRow, error: supabaseError } = await client.from("diveshops").select(`
          *,
          country:countries(name),
          region:regions(name),
          diveshop_courses(courses(certification_name, depth_limit, description, course_level:course_levels(name), agency:agencies(name))),
          diveshop_rental_equipment(rental_equipment(name)),
          diveshop_gases(gases(name)),
          diveshop_dive_sites(dive_sites(name, dive_site_type:dive_site_types(name)))
        `).eq("id", shopId).single();
      if (supabaseError || !shopRow) {
        throw createError({
          statusCode: 404,
          statusMessage: "Dive shop not found"
        });
      }
      let nearbyShops = [];
      const regionId = shopRow.region_id;
      if (regionId) {
        const { data: nearby } = await client.from("diveshops").select("id, business_name, locale, country:countries(name)").eq("region_id", regionId).neq("id", shopRow.id).limit(8);
        nearbyShops = nearby ?? [];
      }
      return { shop: shopRow, nearbyShops };
    },
    {
      server: false,
      lazy: false,
      default: () => ({ shop: null, nearbyShops: [] })
    }
  );
  return {
    data,
    pending,
    error,
    shopData: computed(() => data.value?.shop ?? null),
    nearbyShops: computed(() => data.value?.nearbyShops ?? [])
  };
}
const _sfc_main = {
  __name: "DiveShopDetail",
  __ssrInlineRender: true,
  props: {
    shopId: {
      type: String,
      required: true
    },
    showCloseButton: {
      type: Boolean,
      default: false
    }
  },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const showFullDetails = ref(false);
    const activeTab = ref("details");
    const tabs = [
      { id: "details", label: "Details" },
      { id: "destinations", label: "Dive Destinations" },
      { id: "courses", label: "Courses" },
      { id: "information", label: "More Information" },
      // TODO: wire when shop_reviews table exists
      // { id: 'reviews', label: 'Reviews' },
      { id: "nearby", label: "Nearby Dive Shops" }
    ];
    const { shopData, nearbyShops } = useShopDetail(props.shopId);
    const paragraphs = computed(() => {
      const description = isDemoMode2.value ? demoDescription : shopData.value?.notes ?? shopData.value?.description;
      if (!description) return [];
      return description.split("\n\n").filter((para) => para.trim() !== "");
    });
    const firstParagraph = computed(() => {
      return paragraphs.value[0] || "";
    });
    const remainingParagraphs = computed(() => {
      return paragraphs.value.slice(1);
    });
    const contactInfo = computed(() => ({
      address: [shopData.value?.street_address, shopData.value?.locale, shopData.value?.country?.name ?? shopData.value?.country].filter(Boolean).join(", "),
      phone: shopData.value?.phone,
      email: shopData.value?.email,
      website: shopData.value?.website_url
    }));
    const { isDemoMode: isDemoMode2 } = useDemoMode();
    const displayHours = computed(() => {
      if (isDemoMode2.value) {
        return formatOperatingHours(demoHours);
      }
      if (shopData.value?.operating_hours) {
        return formatOperatingHours(shopData.value.operating_hours);
      }
      return null;
    });
    const displayLanguages = computed(() => {
      if (isDemoMode2.value) {
        return demoLanguages;
      }
      return shopData.value?.languages || null;
    });
    const groupedDestinations = computed(() => {
      const rows = shopData.value?.diveshop_dive_sites ?? [];
      const byType = /* @__PURE__ */ new Map();
      for (const row of rows) {
        const site = row.dive_sites ?? row.dive_site;
        if (!site?.name) continue;
        const typeName = site.dive_site_type?.name ?? site.dive_site_types?.name ?? "Other";
        if (!byType.has(typeName)) byType.set(typeName, []);
        byType.get(typeName).push(site.name);
      }
      return Array.from(byType.entries()).map(([title, items]) => ({ title, items }));
    });
    const coursesList = computed(() => {
      const rows = shopData.value?.diveshop_courses ?? [];
      return rows.map((row) => row.courses ?? row.course).filter(Boolean).map((c) => ({
        title: c.certification_name,
        items: [c.depth_limit, c.description].filter(Boolean).slice(0, 3)
      }));
    });
    const EXCLUDED_EQUIPMENT = /* @__PURE__ */ new Set(["None listed", "Yes (unspecified gear)"]);
    const equipmentList = computed(() => {
      const rows = shopData.value?.diveshop_rental_equipment ?? [];
      const names = rows.map((row) => row.rental_equipment?.name).filter(Boolean).filter((name) => !EXCLUDED_EQUIPMENT.has(name));
      return [...new Set(names)];
    });
    const gasesList = computed(() => {
      const rows = shopData.value?.diveshop_gases ?? [];
      const names = rows.map((row) => row.gases?.name ?? row.gas?.name).filter(Boolean);
      return [...new Set(names)];
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "container-query flex flex-col justify-between h-full gap-0 divide-y divide-zinc-300 dark:divide-zinc-700" }, _attrs))}><div class="flex flex-col justify-center z-40 w-full divide-y divide-zinc-300 dark:divide-zinc-700"><header class="flex flex-row justify-start items-stretch gap-0 divide-x divide-zinc-300 dark:divide-zinc-700"><div class="p-1 flex items-center"><div class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full h-full flex items-center justify-center cursor-pointer px-1">`);
      if (!__props.showCloseButton) {
        _push(ssrRenderComponent(unref(ChevronLeft), { class: "w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" }, null, _parent));
      } else {
        _push(ssrRenderComponent(unref(X), { class: "w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" }, null, _parent));
      }
      _push(`</div></div><div class="p-1 flex items-center"><div class="block bg-zinc-200 dark:bg-zinc-700 overflow-hidden rounded-sm min-w-8 w-8 cq:lg:min-w-16 cq:lg:w-16 h-auto aspect-square"></div></div><div class="p-1 grow flex items-center overflow-auto"><h1 class="text-sm cq:lg:text-3xl font-medium p-0 leading-none cq:lg:px-2 w-full truncate text-zinc-900 dark:text-white">${ssrInterpolate(unref(shopData)?.business_name || "Loading...")}</h1></div><div class="p-1 flex items-center"><button class="${ssrRenderClass([unref(isDemoMode2) ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700", "h-full text-xs px-3 py-1 rounded-sm transition-colors cursor-pointer"])}">${ssrInterpolate(unref(isDemoMode2) ? "📊 Demo" : "Live")}</button></div></header><div class="flex flex-row gap-1 items-center p-1 overflow-x-auto font-medium"><!--[-->`);
      ssrRenderList(tabs, (tab) => {
        _push(`<button class="${ssrRenderClass([
          "flex flex-row gap-2 rounded-sm p-2 px-3 w-fit text-xs cq:lg:text-base cursor-pointer transition-color whitespace-nowrap",
          activeTab.value === tab.id ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50"
        ])}">${ssrInterpolate(tab.label)}</button>`);
      });
      _push(`<!--]--></div></div><div class="w-full h-0 flex-1 cq:lg:overflow-y-auto"><div class="flex flex-col cq:lg:flex-row justify-between cq:lg:justify-stretch items-start cq:lg:items-stretch gap-0 divide-y cq:lg:divide-x cq:lg:divide-y-0 divide-zinc-300 dark:divide-zinc-700 w-full h-full"><div class="w-full flex flex-col border-b-0 cq:lg:order-1 overflow-y-auto"><div class="flex flex-col gap-4 h-full w-full p-0">`);
      if (activeTab.value === "details") {
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto"><div class="flex flex-col gap-4"><div class="flex flex-col gap-2"><div class="flex flex-col cq:lg:flex-row gap-2">`);
        _push(ssrRenderComponent(_sfc_main$1, {
          title: "Hours",
          items: displayHours.value,
          "empty-message": "Hours not available"
        }, null, _parent));
        _push(ssrRenderComponent(_sfc_main$1, {
          title: "Languages",
          items: displayLanguages.value || [],
          "display-mode": "text",
          "empty-message": "Languages not available"
        }, null, _parent));
        _push(ssrRenderComponent(_sfc_main$1, {
          title: "Details",
          "empty-message": "No description available for this dive shop."
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              if (paragraphs.value.length > 0) {
                _push2(`<div${_scopeId}>`);
                if (!showFullDetails.value) {
                  _push2(`<div${_scopeId}>${ssrInterpolate(firstParagraph.value)}</div>`);
                } else {
                  _push2(`<div${_scopeId}><!--[-->`);
                  ssrRenderList(paragraphs.value, (paragraph, index) => {
                    _push2(`<p class="mb-4 last:mb-0"${_scopeId}>${ssrInterpolate(paragraph)}</p>`);
                  });
                  _push2(`<!--]--></div>`);
                }
                if (remainingParagraphs.value.length > 0) {
                  _push2(`<button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-2 text-sm cursor-pointer"${_scopeId}>${ssrInterpolate(showFullDetails.value ? "Read less" : "Read more")}</button>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div>`);
              } else {
                _push2(`<span class="text-zinc-500 dark:text-zinc-400 italic"${_scopeId}> No description available for this dive shop. </span>`);
              }
            } else {
              return [
                paragraphs.value.length > 0 ? (openBlock(), createBlock("div", { key: 0 }, [
                  !showFullDetails.value ? (openBlock(), createBlock("div", { key: 0 }, toDisplayString(firstParagraph.value), 1)) : (openBlock(), createBlock("div", { key: 1 }, [
                    (openBlock(true), createBlock(Fragment, null, renderList(paragraphs.value, (paragraph, index) => {
                      return openBlock(), createBlock("p", {
                        key: index,
                        class: "mb-4 last:mb-0"
                      }, toDisplayString(paragraph), 1);
                    }), 128))
                  ])),
                  remainingParagraphs.value.length > 0 ? (openBlock(), createBlock("button", {
                    key: 2,
                    onClick: ($event) => showFullDetails.value = !showFullDetails.value,
                    class: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-2 text-sm cursor-pointer"
                  }, toDisplayString(showFullDetails.value ? "Read less" : "Read more"), 9, ["onClick"])) : createCommentVNode("", true)
                ])) : (openBlock(), createBlock("span", {
                  key: 1,
                  class: "text-zinc-500 dark:text-zinc-400 italic"
                }, " No description available for this dive shop. "))
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeTab.value === "destinations") {
        _push(`<div class="flex flex-col gap-2 p-2 h-full">`);
        if (groupedDestinations.value.length === 0) {
          _push(`<div class="text-zinc-500 dark:text-zinc-400 italic p-4"> No dive destinations listed. </div>`);
        } else {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-1 gap-2"><!--[-->`);
          ssrRenderList(groupedDestinations.value, (dest) => {
            _push(ssrRenderComponent(_sfc_main$1, {
              key: dest.title,
              title: dest.title,
              image: "/images/fpo/destinations-beginner.png",
              items: dest.items
            }, null, _parent));
          });
          _push(`<!--]--></div>`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeTab.value === "courses") {
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto">`);
        if (coursesList.value.length === 0) {
          _push(`<div class="text-zinc-500 dark:text-zinc-400 italic p-4"> No courses listed. </div>`);
        } else {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 gap-2"><!--[-->`);
          ssrRenderList(coursesList.value, (course, idx) => {
            _push(ssrRenderComponent(_sfc_main$1, {
              key: course.title + String(idx),
              title: course.title,
              image: "/images/fpo/destinations-beginner.png",
              items: course.items.length ? course.items : ["Contact shop for dates"]
            }, null, _parent));
          });
          _push(`<!--]--></div>`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeTab.value === "information") {
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto"><div class="flex flex-col cq:lg:flex-row gap-2 rounded-md"><div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1"><div class="flex flex-col gap-2"><h3 class="text-sm font-bold text-zinc-900 dark:text-white">Equipment Rental</h3>`);
        if (equipmentList.value.length > 0) {
          _push(`<ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300"><!--[-->`);
          ssrRenderList(equipmentList.value, (item) => {
            _push(`<li>${ssrInterpolate(item)}</li>`);
          });
          _push(`<!--]--></ul>`);
        } else {
          _push(`<p class="text-sm text-zinc-500 dark:text-zinc-400 italic">No equipment listed.</p>`);
        }
        _push(`</div></div><div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1"><div class="flex flex-col gap-2"><h3 class="text-sm font-bold text-zinc-900 dark:text-white">Gas Mixture</h3>`);
        if (gasesList.value.length > 0) {
          _push(`<ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300"><!--[-->`);
          ssrRenderList(gasesList.value, (item) => {
            _push(`<li>${ssrInterpolate(item)}</li>`);
          });
          _push(`<!--]--></ul>`);
        } else {
          _push(`<p class="text-sm text-zinc-500 dark:text-zinc-400 italic">No gas mixture listed.</p>`);
        }
        _push(`</div></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeTab.value === "nearby") {
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto"><section class="flex flex-col gap-4">`);
        if (unref(nearbyShops).length === 0) {
          _push(`<p class="text-zinc-500 dark:text-zinc-400 italic p-4"> No nearby dive shops in this region. </p>`);
        } else {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 gap-2"><!--[-->`);
          ssrRenderList(unref(nearbyShops), (shop) => {
            _push(ssrRenderComponent(_component_NuxtLink, {
              key: shop.id,
              to: `/shops/${shop.id}`,
              class: "block"
            }, {
              default: withCtx((_, _push2, _parent2, _scopeId) => {
                if (_push2) {
                  _push2(ssrRenderComponent(_sfc_main$1, {
                    image: "/images/fpo/destinations-beginner.png",
                    title: shop.business_name,
                    items: [[shop.locale, shop.country?.name].filter(Boolean).join(", ")]
                  }, null, _parent2, _scopeId));
                } else {
                  return [
                    createVNode(_sfc_main$1, {
                      image: "/images/fpo/destinations-beginner.png",
                      title: shop.business_name,
                      items: [[shop.locale, shop.country?.name].filter(Boolean).join(", ")]
                    }, null, 8, ["title", "items"])
                  ];
                }
              }),
              _: 2
            }, _parent));
          });
          _push(`<!--]--></div>`);
        }
        _push(`</section></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="w-full cq:lg:min-w-1/2 cq:lg:w-1/2 cq:xl:min-w-1/3 cq:xl:w-1/3 p-2 pb-20 h-auto cq:xl:h-full cq:lg:order-1 sticky bottom-0 cq:2xl:bottom-auto bg-zinc-50 dark:bg-zinc-900"><div class="h-full"><div class="flex flex-col gap-2"><div class="flex flex-col gap-2 cq:lg:p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md cq:lg:order-1"><h2 class="hidden cq:lg:block cq:lg:text-2xl font-semibold text-zinc-900 dark:text-white">Book Now</h2><p class="hidden cq:lg:block text-sm text-zinc-600 dark:text-zinc-400">Ready to dive? Click below to start your booking.</p><button class="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer"> Start Booking </button></div><div class="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-700 rounded-md cq:lg:order-2"><ul class="flex flex-row cq:lg:flex-col justify-between cq:lg:justify-start divide-x cq:lg:divide-y divide-zinc-300 dark:divide-zinc-700">`);
      if (contactInfo.value?.address) {
        _push(`<li class="w-full flex justify-center cq:lg:justify-start"><a${ssrRenderAttr("href", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.value.address)}`)} target="_blank" class="w-full justify-center p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 overflow-hidden">`);
        _push(ssrRenderComponent(unref(MapPin), { class: "min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" }, null, _parent));
        _push(`<span class="hidden cq:lg:block truncate">${ssrInterpolate(contactInfo.value.address)}</span></a></li>`);
      } else {
        _push(`<!---->`);
      }
      if (contactInfo.value?.phone) {
        _push(`<li class="w-full flex justify-center cq:lg:justify-start"><div class="w-full justify-center flex flex-row gap-4 items-center"><a${ssrRenderAttr("href", `tel:${contactInfo.value.phone}`)} class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">`);
        _push(ssrRenderComponent(unref(Phone), { class: "min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" }, null, _parent));
        _push(`<span class="hidden cq:lg:block">${ssrInterpolate(contactInfo.value.phone)}</span></a></div></li>`);
      } else {
        _push(`<!---->`);
      }
      if (contactInfo.value?.email) {
        _push(`<li class="w-full flex justify-center cq:lg:justify-start"><div class="flex flex-row gap-4 items-center"><a${ssrRenderAttr("href", `mailto:${contactInfo.value.email}`)} class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">`);
        _push(ssrRenderComponent(unref(Mail), { class: "min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" }, null, _parent));
        _push(`<span class="hidden cq:lg:block">${ssrInterpolate(contactInfo.value.email)}</span></a></div></li>`);
      } else {
        _push(`<!---->`);
      }
      if (contactInfo.value?.website) {
        _push(`<li class="w-full flex justify-center cq:lg:justify-start"><a${ssrRenderAttr("href", contactInfo.value.website)} target="_blank" class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">`);
        _push(ssrRenderComponent(unref(Globe), { class: "min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" }, null, _parent));
        _push(`<span class="hidden cq:lg:block truncate">${ssrInterpolate(contactInfo.value.website)}</span></a></li>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</ul></div></div></div></div></div></div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/DiveShopDetail.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as _, useShopDetail as u };
//# sourceMappingURL=DiveShopDetail-G563NIeI.mjs.map
