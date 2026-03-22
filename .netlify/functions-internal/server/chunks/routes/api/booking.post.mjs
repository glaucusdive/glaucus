import { d as defineEventHandler, r as readBody, n as createError, u as useRuntimeConfig, i as getShopById } from '../../nitro/nitro.mjs';
import { Resend } from 'resend';
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

function buildDiveshopEmailBody(payload, shopName) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const lines = [
    `A dive trip booking request has been submitted via Glaucus.`,
    "",
    "\u2014 Trip \u2014",
    `Dates: ${payload.startDate} to ${payload.endDate}`,
    `Number of divers: ${(_b = (_a = payload.divers) == null ? void 0 : _a.length) != null ? _b : 0}`,
    ""
  ];
  if (Array.isArray(payload.desiredDiveSites) && payload.desiredDiveSites.length > 0) {
    for (const site of payload.desiredDiveSites) {
      lines.push(`Desired dive site: ${site}`);
    }
    lines.push("");
  }
  lines.push("\u2014 Divers \u2014");
  for (let i = 0; i < ((_d = (_c = payload.divers) == null ? void 0 : _c.length) != null ? _d : 0); i++) {
    const d = payload.divers[i];
    const gearItems = Array.isArray(d.gear) && d.gear.length > 0 ? d.gear.map((g) => g == null ? void 0 : g.gearType).filter(Boolean) : [];
    lines.push(
      `Diver ${i + 1}: ${(_e = d.name) != null ? _e : "\u2014"}`,
      `  Certification: ${(_f = d.certificationNumber) != null ? _f : "\u2014"}`,
      `  Dives completed: ${(_g = d.numberOfDives) != null ? _g : "\u2014"}`,
      `  Height: ${(_h = d.height) != null ? _h : "\u2014"} ${((_i = d.heightUnit) != null ? _i : "").trim()}`.trim(),
      `  Weight: ${(_j = d.weight) != null ? _j : "\u2014"} ${((_k = d.weightUnit) != null ? _k : "").trim()}`.trim()
    );
    if (gearItems.length > 0) {
      for (const item of gearItems) {
        lines.push(`  Rental gear: ${item}`);
      }
    } else {
      lines.push("  Rental gear: None");
    }
    lines.push("");
  }
  lines.push("\u2014 Guest contact \u2014", `Name: ${payload.name}`, `Email: ${payload.email}`);
  return lines.join("\n");
}
function buildUserConfirmationBody(shopName, userEmail, shopEmail) {
  return [
    `We've sent your booking request to ${shopName}.`,
    "",
    `They'll contact you at ${userEmail}.`,
    "",
    "If you don't hear back in a few days, reach out to them directly at " + shopEmail + "."
  ].join("\n");
}
const booking_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const shopId = (body == null ? void 0 : body.shopId) && String(body.shopId).trim();
  const name = (body == null ? void 0 : body.name) && String(body.name).trim();
  const email = (body == null ? void 0 : body.email) && String(body.email).trim();
  const startDate = (body == null ? void 0 : body.startDate) && String(body.startDate).trim();
  const endDate = (body == null ? void 0 : body.endDate) && String(body.endDate).trim();
  const divers = Array.isArray(body == null ? void 0 : body.divers) ? body.divers : [];
  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: "shopId is required" });
  }
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "email is required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid email" });
  }
  if (!startDate) {
    throw createError({ statusCode: 400, statusMessage: "startDate is required" });
  }
  if (!endDate) {
    throw createError({ statusCode: 400, statusMessage: "endDate is required" });
  }
  if (divers.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "At least one diver is required" });
  }
  const config = useRuntimeConfig();
  const supabaseUrl = config.public.supabaseUrl;
  const supabaseKey = config.public.supabaseKey;
  const resendApiKey = config.resendApiKey;
  const fromEmail = config.bookingFromEmail;
  if (!resendApiKey) {
    throw createError({ statusCode: 500, statusMessage: "Email is not configured (RESEND_API_KEY missing)" });
  }
  const shop = await getShopById(supabaseUrl, supabaseKey, shopId);
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: "Dive shop not found" });
  }
  if (!shop.email || !String(shop.email).trim()) {
    throw createError({ statusCode: 400, statusMessage: "This shop has no email on file." });
  }
  const resend = new Resend(resendApiKey);
  const shopName = shop.business_name || "Dive shop";
  const payload = {
    name,
    email,
    startDate,
    endDate,
    desiredDiveSites: Array.isArray(body.desiredDiveSites) ? body.desiredDiveSites : [],
    divers
  };
  const diveshopSubject = `Dive trip booking request from ${name} via Glaucus`;
  const diveshopText = buildDiveshopEmailBody(payload);
  const { data: toShop, error: errShop } = await resend.emails.send({
    from: fromEmail,
    to: [shop.email],
    subject: diveshopSubject,
    text: diveshopText
  });
  if (errShop) {
    const msg = errShop.message || "Failed to send email to dive shop";
    throw createError({
      statusCode: 502,
      statusMessage: msg,
      data: { message: msg, resendError: errShop.message }
    });
  }
  const userSubject = `We've sent your booking request to ${shopName}`;
  const userText = buildUserConfirmationBody(shopName, email, shop.email);
  const { error: errUser } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: userSubject,
    text: userText
  });
  if (errUser) {
    return {
      sent: true,
      message: "Your request was sent to the dive shop. Confirmation email could not be sent; please check your email address.",
      emailId: toShop == null ? void 0 : toShop.id
    };
  }
  return {
    sent: true,
    message: "Booking request sent. Check your email for confirmation."
  };
});

export { booking_post as default };
//# sourceMappingURL=booking.post.mjs.map
