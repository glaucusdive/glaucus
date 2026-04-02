import { e as useAsyncData, g as createError, _ as __nuxt_component_0$1 } from './server.mjs';
import { computed, ref, watch, mergeProps, unref, withCtx, createBlock, openBlock, createCommentVNode, toDisplayString, Fragment, renderList, createVNode, toValue, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderClass, ssrRenderList, ssrRenderAttr, ssrRenderSlot } from 'vue/server-renderer';
import { ChevronLeft, X, MapPin, Phone, Mail, Globe, Star, Trash2 } from 'lucide-vue-next';
import { u as useDrawer } from './useDrawer-ByKBnsIY.mjs';
import { u as useAuth } from './useAuth-BWS1ISvo.mjs';
import { u as useSupabase } from './useSupabase-G2CWeDSk.mjs';

const _sfc_main$3 = {
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
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-2 h-full" }, _attrs))}>`);
      if (__props.image) {
        _push(`<div class="w-full h-24 xl:h-32 bg-zinc-200 dark:bg-zinc-700 rounded-sm overflow-hidden mb-2"><img${ssrRenderAttr("src", __props.image)}${ssrRenderAttr("alt", __props.title)} class="w-full h-full object-cover"></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<header class="pb-2 border-b border-zinc-300 dark:border-zinc-700"><h2 class="text-sm font-bold text-zinc-900 dark:text-white">${ssrInterpolate(__props.title)}</h2></header>`);
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
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CardInfo.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = {
  __name: "CardReview",
  __ssrInlineRender: true,
  props: {
    showDelete: {
      type: Boolean,
      default: false
    },
    reviewerName: {
      type: String,
      required: true
    },
    reviewerImage: {
      type: String,
      default: ""
    },
    reviewDate: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      validator: (value) => value >= 1 && value <= 5
    },
    reviewText: {
      type: String,
      required: true
    }
  },
  emits: ["delete"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const initials = computed(() => {
      const parts = props.reviewerName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return props.reviewerName.slice(0, 2).toUpperCase() || "?";
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-4 shrink-0" }, _attrs))}><div class="flex items-start justify-between gap-2"><div class="flex items-center gap-3 min-w-0 flex-1"><div class="w-10 h-10 shrink-0 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center">`);
      if (__props.reviewerImage) {
        _push(`<img${ssrRenderAttr("src", __props.reviewerImage)}${ssrRenderAttr("alt", __props.reviewerName)} class="w-full h-full object-cover">`);
      } else {
        _push(`<span class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">${ssrInterpolate(initials.value)}</span>`);
      }
      _push(`</div><div class="flex flex-col min-w-0"><h4 class="text-sm font-semibold text-zinc-900 dark:text-white truncate">${ssrInterpolate(__props.reviewerName)}</h4><p class="text-xs text-zinc-600 dark:text-zinc-400">${ssrInterpolate(__props.reviewDate)}</p></div></div>`);
      if (__props.showDelete) {
        _push(`<button type="button" class="shrink-0 p-1.5 rounded-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer" title="Delete review" aria-label="Delete review">`);
        _push(ssrRenderComponent(unref(Trash2), { class: "w-4 h-4" }, null, _parent));
        _push(`</button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="flex items-center gap-1" aria-hidden="true"><!--[-->`);
      ssrRenderList(__props.rating, (star) => {
        _push(ssrRenderComponent(unref(Star), {
          key: "f-" + star,
          class: "w-4 h-4 fill-current text-yellow-500"
        }, null, _parent));
      });
      _push(`<!--]--><!--[-->`);
      ssrRenderList(5 - __props.rating, (star) => {
        _push(ssrRenderComponent(unref(Star), {
          key: "e-" + star,
          class: "w-4 h-4 fill-none stroke-current text-zinc-300 dark:text-zinc-600"
        }, null, _parent));
      });
      _push(`<!--]--></div><div class="flex flex-col gap-2"><p class="text-sm leading-relaxed text-zinc-900 dark:text-white whitespace-pre-wrap">${ssrInterpolate(__props.reviewText)}</p></div></div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CardReview.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "CardReviewEmpty",
  __ssrInlineRender: true,
  emits: ["open"],
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<button${ssrRenderAttrs(mergeProps({
        type: "button",
        class: "group w-full max-w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-4 shrink-0 text-left border border-dashed border-zinc-300/80 dark:border-zinc-600/80 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
      }, _attrs))}><div class="flex items-start justify-between gap-2"><div class="flex items-center gap-3 min-w-0 flex-1"><div class="w-10 h-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center"><span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">+</span></div><div class="flex flex-col gap-1.5 min-w-0 flex-1 py-0.5"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-28 max-w-full"></div><div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-20 max-w-full"></div></div></div></div><div class="flex items-center gap-1 text-zinc-400 dark:text-zinc-500" aria-hidden="true"><!--[-->`);
      ssrRenderList(5, (n) => {
        _push(ssrRenderComponent(unref(Star), {
          key: n,
          class: "w-4 h-4 fill-none stroke-current"
        }, null, _parent));
      });
      _push(`<!--]--></div><div class="flex flex-col gap-2"><div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-full"></div><div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-[85%]"></div><p class="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 pt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400"> Write a review </p></div></button>`);
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CardReviewEmpty.vue");
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
async function deleteShopReview(client, reviewId) {
  const { error } = await client.from("shop_reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
function useShopReviews(shopId) {
  const { client } = useSupabase();
  const resolvedId = computed(() => {
    const v = toValue(shopId);
    return typeof v === "string" ? v : "";
  });
  const { data, pending, error, refresh } = useAsyncData(
    () => `shop-reviews-${resolvedId.value || "none"}`,
    async () => {
      const id = resolvedId.value;
      if (!id) return [];
      const { data: rows, error: supabaseError } = await client.from("shop_reviews").select("*").eq("diveshop_id", id).order("created_at", { ascending: false });
      if (supabaseError) throw supabaseError;
      return rows ?? [];
    },
    {
      server: false,
      lazy: false,
      watch: [resolvedId],
      default: () => []
    }
  );
  const reviews = computed(() => data.value ?? []);
  const topReviews = computed(() => {
    const r = [...data.value ?? []];
    r.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return r.slice(0, 3);
  });
  return {
    data,
    pending,
    error,
    refresh,
    reviews,
    topReviews
  };
}
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
function isDiveshopUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s).trim());
}
function useShopDetail(shopLookup) {
  const { client } = useSupabase();
  const { data, pending, error } = useAsyncData(
    `diveshop-${shopLookup}`,
    async () => {
      if (!shopLookup) return { shop: null, nearbyShops: [] };
      let shopQuery = client.from("diveshops").select(`
          *,
          country:countries(name),
          region:regions(name),
          diveshop_courses(courses(certification_name, depth_limit, description, course_level:course_levels(name), agency:agencies(name))),
          diveshop_rental_equipment(rental_equipment(name)),
          diveshop_gases(gases(name)),
          diveshop_dive_sites(dive_sites(name, dive_site_type:dive_site_types(name)))
        `);
      shopQuery = isDiveshopUuid(shopLookup) ? shopQuery.eq("id", shopLookup) : shopQuery.eq("slug", shopLookup);
      const { data: shopRow, error: supabaseError } = await shopQuery.single();
      if (supabaseError || !shopRow) {
        throw createError({
          statusCode: 404,
          statusMessage: "Dive shop not found",
          fatal: false
        });
      }
      let nearbyShops = [];
      {
        const regionId = shopRow.region_id;
        if (regionId) {
          const { data: nearby } = await client.from("diveshops").select("id, slug, business_name, locale, country:countries(name)").eq("region_id", regionId).neq("id", shopRow.id).limit(8);
          nearbyShops = (nearby ?? []).map((s) => ({
            id: s.id,
            slug: s.slug,
            business_name: s.business_name,
            locale: s.locale ?? null,
            country: s.country ?? { name: "" }
          }));
        }
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
    /** Route slug (e.g. dive-porter) or legacy UUID — used only to load the shop row */
    shopLookup: {
      type: String,
      required: true
    },
    showCloseButton: {
      type: Boolean,
      default: false
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
  setup(__props, { emit: __emit }) {
    const props = __props;
    const canEmitClose = ref(false);
    let closeEnableTimer = null;
    function scheduleCloseEnabled() {
      canEmitClose.value = false;
      if (closeEnableTimer) clearTimeout(closeEnableTimer);
      closeEnableTimer = setTimeout(() => {
        closeEnableTimer = null;
        canEmitClose.value = true;
      }, 400);
    }
    watch(() => props.shopLookup, () => {
      scheduleCloseEnabled();
    });
    const showFullDetails = ref(false);
    const activeTab = ref("reviews");
    const tabs = [
      { id: "reviews", label: "Reviews" },
      { id: "destinations", label: "Dive Destinations" },
      { id: "courses", label: "Courses" },
      { id: "information", label: "More Information" },
      { id: "nearby", label: "Nearby Dive Shops" }
    ];
    const { shopData, nearbyShops } = useShopDetail(props.shopLookup);
    const shopRowId = computed(() => shopData.value?.id ?? "");
    const { user, isAppAdmin } = useAuth();
    const { client } = useSupabase();
    const { reviews, pending: reviewsPending, refresh: refreshReviews } = useShopReviews(shopRowId);
    const myReview = computed(() => {
      const uid = user.value?.id;
      if (!uid) return null;
      return reviews.value.find((r) => r.user_id === uid) ?? null;
    });
    function canDeleteReview(r) {
      if (isAppAdmin.value) return true;
      const uid = user.value?.id;
      if (!uid) return false;
      return r.user_id === uid;
    }
    async function handleDeleteReview(r) {
      if (!canDeleteReview(r)) return;
      const label = r.author_display_name || "this review";
      if (!confirm(`Delete review by ${label}? This cannot be undone.`)) return;
      try {
        await deleteShopReview(client, r.id);
        await refreshReviews();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not delete review.");
      }
    }
    function formatReviewDate(iso) {
      if (!iso) return "";
      try {
        return new Date(iso).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
      } catch {
        return "";
      }
    }
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
    const { openDrawer } = useDrawer();
    function openReviewDrawer() {
      const my = myReview.value;
      openDrawer("review-form", {
        shopId: shopRowId.value,
        shopName: shopData.value?.business_name || "Dive Shop",
        initialRating: my?.rating ?? 5,
        initialBody: my?.body ?? "",
        isEditing: !!my,
        reviewId: my?.id ?? null,
        onSubmitted: () => {
          refreshReviews();
        },
        onDeleted: () => {
          refreshReviews();
        }
      });
    }
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
      _push(`</div></div><div class="p-1 lg:p-2 grow flex items-center overflow-auto"><h1 class="text-sm cq:lg:text-3xl font-medium p-0 leading-none cq:lg:px-2 w-full truncate text-zinc-900 dark:text-white">${ssrInterpolate(unref(shopData)?.business_name || "Loading...")}</h1></div><div class="p-1 flex items-center"><button class="${ssrRenderClass([unref(isDemoMode2) ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700", "h-full text-xs px-3 py-1 rounded-sm transition-colors cursor-pointer border border-zinc-800"])}">${ssrInterpolate(unref(isDemoMode2) ? "Demo" : "Live")}</button></div></header><div class="flex flex-row gap-1 items-center p-1 lg:p-2 overflow-x-auto font-medium"><!--[-->`);
      ssrRenderList(tabs, (tab) => {
        _push(`<button class="${ssrRenderClass([
          "flex flex-row gap-2 rounded-sm p-2 px-3 w-fit text-xs cq:lg:text-base cursor-pointer transition-color whitespace-nowrap",
          activeTab.value === tab.id ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50"
        ])}">${ssrInterpolate(tab.label)}</button>`);
      });
      _push(`<!--]--></div></div><div class="w-full h-0 flex-1 cq:lg:overflow-y-auto"><div class="flex flex-col cq:lg:flex-row justify-between cq:lg:justify-stretch items-start cq:lg:items-stretch gap-0 divide-y lg:divide-x lg:divide-y-0 cq:divide-zinc-700 divide-zinc-700 dark:divide-zinc-700 w-full h-full"><div class="w-full flex flex-col border-b-0 cq:lg:order-1 overflow-y-auto"><div class="flex flex-col gap-4 h-full w-full p-0">`);
      if (activeTab.value === "destinations") {
        _push(`<div class="flex flex-col gap-2 p-2 h-full">`);
        if (groupedDestinations.value.length === 0) {
          _push(`<div class="text-zinc-500 dark:text-zinc-400 italic p-4"> No dive destinations listed. </div>`);
        } else {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-1 gap-2"><!--[-->`);
          ssrRenderList(groupedDestinations.value, (dest) => {
            _push(ssrRenderComponent(_sfc_main$3, {
              key: dest.title,
              title: dest.title,
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
            _push(ssrRenderComponent(_sfc_main$3, {
              key: course.title + String(idx),
              title: course.title,
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
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto"><div class="flex flex-col cq:lg:flex-row gap-2">`);
        _push(ssrRenderComponent(_sfc_main$3, {
          title: "Hours",
          items: displayHours.value,
          "empty-message": "Hours not available"
        }, null, _parent));
        _push(ssrRenderComponent(_sfc_main$3, {
          title: "Languages",
          items: displayLanguages.value || [],
          "display-mode": "text",
          "empty-message": "Languages not available"
        }, null, _parent));
        _push(ssrRenderComponent(_sfc_main$3, {
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
        _push(`</div><div class="flex flex-col cq:lg:flex-row gap-2 rounded-md">`);
        _push(ssrRenderComponent(_sfc_main$3, {
          title: "Equipment Rental",
          items: equipmentList.value,
          "empty-message": "No equipment listed."
        }, null, _parent));
        _push(ssrRenderComponent(_sfc_main$3, {
          title: "Gas Mixture",
          items: gasesList.value,
          "empty-message": "No gas mixture listed."
        }, null, _parent));
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (activeTab.value === "reviews") {
        _push(`<div class="flex flex-col gap-4 p-2 h-full overflow-y-auto"><div class="flex flex-row items-center justify-between gap-2 flex-wrap"><h3 class="text-sm font-semibold text-zinc-900 dark:text-white">All reviews</h3><button type="button" class="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0">${ssrInterpolate(myReview.value ? "Edit your review" : "Write a review")}</button></div>`);
        if (unref(reviewsPending)) {
          _push(`<div class="text-sm text-zinc-500 dark:text-zinc-400 p-2">Loading reviews…</div>`);
        } else if (unref(reviews).length === 0) {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 gap-2 w-full">`);
          _push(ssrRenderComponent(_sfc_main$1, { onOpen: openReviewDrawer }, null, _parent));
          _push(`</div>`);
        } else {
          _push(`<div class="grid grid-cols-1 cq:grid-cols-2 gap-2 w-full"><!--[-->`);
          ssrRenderList(unref(reviews), (r) => {
            _push(ssrRenderComponent(_sfc_main$2, {
              key: r.id,
              "reviewer-name": r.author_display_name || "Diver",
              "review-date": formatReviewDate(r.created_at),
              rating: r.rating,
              "review-text": r.body,
              "show-delete": canDeleteReview(r),
              onDelete: ($event) => handleDeleteReview(r)
            }, null, _parent));
          });
          _push(`<!--]--></div>`);
        }
        _push(`</div>`);
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
              to: `/shops/${shop.slug || shop.id}`,
              class: "block"
            }, {
              default: withCtx((_, _push2, _parent2, _scopeId) => {
                if (_push2) {
                  _push2(ssrRenderComponent(_sfc_main$3, {
                    title: shop.business_name,
                    items: [
                      [shop.locale, shop.country?.name].filter(Boolean).join(", "),
                      ...shop.distance_miles != null ? [`${shop.distance_miles} mi away`] : []
                    ].filter(Boolean)
                  }, null, _parent2, _scopeId));
                } else {
                  return [
                    createVNode(_sfc_main$3, {
                      title: shop.business_name,
                      items: [
                        [shop.locale, shop.country?.name].filter(Boolean).join(", "),
                        ...shop.distance_miles != null ? [`${shop.distance_miles} mi away`] : []
                      ].filter(Boolean)
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
      _push(`</div></div><div class="w-full cq:lg:min-w-1/2 cq:lg:w-1/2 cq:xl:min-w-1/3 cq:xl:w-1/3 p-2 h-auto cq:xl:h-full cq:lg:order-1 sticky bottom-0 cq:2xl:bottom-auto bg-zinc-50 dark:bg-zinc-900"><div class="h-full"><div class="flex flex-col gap-2"><div class="flex flex-col gap-2 cq:lg:p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md cq:lg:order-1"><h2 class="hidden cq:lg:block cq:lg:text-2xl font-semibold text-zinc-900 dark:text-white">Book Now</h2><p class="hidden cq:lg:block text-sm text-zinc-600 dark:text-zinc-400">${ssrInterpolate(__props.isInBookingFlow ? __props.isFormOpen ? "Booking form is open. Click to hide it." : "View or edit your booking details in the form." : "Ready to dive? Click below to start your booking.")}</p><button class="border border-zinc-400 dark:border-zinc-500 hover:border-zinc-800 dark:hover:border-zinc-200 bg-transparent dark:bg-transparent text-zinc-800 dark:text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">${ssrInterpolate(__props.isInBookingFlow ? __props.isFormOpen ? "Hide form" : "Show form" : "Start Booking")}</button></div><div class="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-700 rounded-md cq:lg:order-2"><ul class="flex flex-row cq:lg:flex-col justify-between lg:justify-start divide-x lg:divide-y divide-zinc-300 dark:divide-zinc-700">`);
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
//# sourceMappingURL=DiveShopDetail-BqxzRjJA.mjs.map
