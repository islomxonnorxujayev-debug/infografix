import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";
const CARD_NUMBER = "9860 1606 0533 5993";
const WEB_APP_URL = "https://infografix.lovable.app";

const PACKAGES = [
  { key: "1", name: "1 ta rasm", credits: 1, price: "4 999 so'm" },
  { key: "10", name: "10 ta rasm", credits: 10, price: "45 000 so'm (-10%)" },
  { key: "15", name: "15 ta rasm", credits: 15, price: "55 000 so'm (-27%)" },
  { key: "20", name: "20 ta rasm", credits: 20, price: "65 000 so'm (-35%) ⭐" },
  { key: "50", name: "50 ta rasm", credits: 50, price: "149 000 so'm (-40%)" },
  { key: "100", name: "100 ta rasm", credits: 100, price: "249 999 so'm (-50%)" },
];

const AMOUNTS: Record<string, string> = {
  "1": "4999", "10": "45000", "15": "55000", "20": "65000", "50": "149000", "100": "249999",
};

async function sendMessage(token: string, chatId: number, text: string, opts?: any) {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts }),
  });
}

async function sendPhoto(token: string, chatId: number | string, photoUrl: string, caption?: string, opts?: any): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML", ...opts }),
    });
    const result = await res.json();
    if (!result.ok) {
      console.error("sendPhoto failed:", JSON.stringify(result));
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendPhoto error:", e);
    return false;
  }
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessageCaption(token: string, chatId: number | string, messageId: number, caption: string) {
  await fetch(`${TELEGRAM_API}${token}/editMessageCaption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, caption, parse_mode: "HTML" }),
  });
}

function sanitizeString(str: string | undefined, maxLen: number): string {
  if (!str || typeof str !== "string") return "";
  return str.slice(0, maxLen).replace(/[<>&"']/g, (c) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  });
}

function isValidTelegramId(id: any): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function getOrCreateProfile(supabase: any, telegramId: number, username?: string, firstName?: string) {
  if (!isValidTelegramId(telegramId)) return null;
  
  const cleanUsername = sanitizeString(username, 64);
  const cleanFirstName = sanitizeString(firstName, 128);
  
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .single();

  if (existing) {
    if (cleanUsername !== existing.telegram_username || cleanFirstName !== existing.first_name) {
      await supabase.from("profiles").update({
        telegram_username: cleanUsername || existing.telegram_username,
        first_name: cleanFirstName || existing.first_name,
      }).eq("id", existing.id);
    }
    return existing;
  }

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      telegram_id: telegramId,
      telegram_username: cleanUsername || null,
      first_name: cleanFirstName || null,
      credits_remaining: 1,
      plan: "free",
    })
    .select()
    .single();

  if (error) {
    console.error("Profile creation error:", error);
    return null;
  }
  return newProfile;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminChatId = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

  if (!botToken) return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500 });

  const url = new URL(req.url);

  // Webhook setup
  if (url.searchParams.get("setup") === "true") {
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
    const res = await fetch(`${TELEGRAM_API}${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const update = await req.json();
    const supabase = createClient(supabaseUrl, serviceKey);

    // === Handle callback_query (approve/reject buttons) ===
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data || "";
      const cbChatId = cb.message?.chat?.id;
      const cbMessageId = cb.message?.message_id;

      if (data.startsWith("approve:") || data.startsWith("reject:")) {
        const action = data.startsWith("approve:") ? "approve" : "reject";
        const paymentId = data.split(":")[1];

        if (action === "approve") {
          // Use the approve_payment RPC - but we need to call it as admin
          // Since this is service role, we need a workaround
          // Let's directly update the tables
          const { data: payReq } = await supabase
            .from("payment_requests")
            .select("*")
            .eq("id", paymentId)
            .eq("status", "pending")
            .single();

          if (!payReq) {
            await answerCallbackQuery(botToken, cb.id, "❌ Bu so'rov allaqachon ko'rib chiqilgan");
            return new Response("OK");
          }

          // Find profile
          let profile = null;
          if (payReq.profile_id) {
            const { data: p } = await supabase.from("profiles").select("*").eq("id", payReq.profile_id).single();
            profile = p;
          } else if (payReq.telegram_id) {
            const { data: p } = await supabase.from("profiles").select("*").eq("telegram_id", payReq.telegram_id).single();
            profile = p;
          }

          if (!profile) {
            await answerCallbackQuery(botToken, cb.id, "❌ Profil topilmadi");
            return new Response("OK");
          }

          // Update payment status
          await supabase.from("payment_requests").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", paymentId);

          // Add credits
          const newCredits = profile.credits_remaining + payReq.credits;
          await supabase.from("profiles").update({ credits_remaining: newCredits, updated_at: new Date().toISOString() }).eq("id", profile.id);

          // Update admin message (try editMessageCaption for photo, editMessageText for text)
          if (cbChatId && cbMessageId) {
            const statusText = `\n\n✅ <b>TASDIQLANDI</b>\n💰 ${payReq.credits} kredit qo'shildi\n📊 Yangi balans: ${newCredits}`;
            const oldCaption = cb.message?.caption || "";
            const oldText = cb.message?.text || "";
            
            if (oldCaption) {
              await editMessageCaption(botToken, cbChatId, cbMessageId, oldCaption + statusText);
            } else if (oldText) {
              await fetch(`${TELEGRAM_API}${botToken}/editMessageText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: cbChatId, message_id: cbMessageId, text: oldText + statusText, parse_mode: "HTML" }),
              });
            }
          }

          // Notify user
          if (profile.telegram_id) {
            await sendMessage(botToken, profile.telegram_id,
              `✅ <b>To'lovingiz tasdiqlandi!</b>\n\n` +
              `💰 ${payReq.credits} ta kredit qo'shildi\n` +
              `📊 Yangi balans: <b>${newCredits}</b> ta rasm\n\n` +
              `📱 Rasm yaratish uchun quyidagi tugmani bosing!`,
              {
                reply_markup: {
                  inline_keyboard: [[
                    { text: "📱 Rasm yaratish", web_app: { url: WEB_APP_URL } }
                  ]]
                }
              }
            );
          }

          await answerCallbackQuery(botToken, cb.id, `✅ Tasdiqlandi! ${payReq.credits} kredit qo'shildi`);
        } else {
          // Reject
          await supabase.from("payment_requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", paymentId);

          if (cbChatId && cbMessageId) {
            const statusText = `\n\n❌ <b>RAD ETILDI</b>`;
            const oldCaption = cb.message?.caption || "";
            const oldText = cb.message?.text || "";
            
            if (oldCaption) {
              await editMessageCaption(botToken, cbChatId, cbMessageId, oldCaption + statusText);
            } else if (oldText) {
              await fetch(`${TELEGRAM_API}${botToken}/editMessageText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: cbChatId, message_id: cbMessageId, text: oldText + statusText, parse_mode: "HTML" }),
              });
            }
          }

          // Find profile to notify user
          const { data: payReq } = await supabase.from("payment_requests").select("telegram_id").eq("id", paymentId).single();
          if (payReq?.telegram_id) {
            await sendMessage(botToken, payReq.telegram_id,
              `❌ <b>To'lov so'rovingiz rad etildi</b>\n\n` +
              `To'lov ma'lumotlarini tekshirib qayta yuboring yoki admin bilan bog'laning.`
            );
          }

          await answerCallbackQuery(botToken, cb.id, "❌ Rad etildi");
        }

        return new Response("OK");
      }

      await answerCallbackQuery(botToken, cb.id);
      return new Response("OK");
    }

    // === Handle message ===
    const message = update.message;
    if (!message) return new Response("OK");

    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const text = (message.text || "").slice(0, 500);
    
    if (!isValidTelegramId(telegramId)) {
      return new Response("OK");
    }

    const profile = await getOrCreateProfile(supabase, telegramId, username, firstName);
    if (!profile) {
      await sendMessage(botToken, chatId, "❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
      return new Response("OK");
    }

    // === /start ===
    if (text.startsWith("/start")) {
      const isNew = profile.credits_remaining === 1 && profile.plan === "free";
      await sendMessage(botToken, chatId,
        `👋 <b>Infografix AI</b>ga xush kelibsiz${firstName ? `, ${firstName}` : ""}!\n\n` +
        `📸 Mahsulot rasmlarini professional darajada tayyorlash uchun bot.\n\n` +
        `💰 Balans: <b>${profile.credits_remaining}</b> ta rasm\n` +
        (isNew ? `🎁 Sizga 1 ta bepul rasm berildi!\n\n` : "\n") +
        `📋 <b>Buyruqlar:</b>\n` +
        `/balance — Balansni ko'rish\n` +
        `/buy — Kredit sotib olish\n` +
        `/help — Yordam\n\n` +
        `📱 Rasm yaratish uchun quyidagi tugmani bosing! 🚀`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "📱 Rasm yaratish", web_app: { url: WEB_APP_URL } }
            ]]
          }
        }
      );
      return new Response("OK");
    }

    // === /balance ===
    if (text === "/balance" || text === "/balans") {
      await sendMessage(botToken, chatId,
        `💰 <b>Balans</b>\n\n` +
        `👤 ${firstName || username || "Foydalanuvchi"}\n` +
        `🎯 Kreditlar: <b>${profile.credits_remaining}</b> ta rasm\n\n` +
        (profile.credits_remaining <= 0
          ? `❌ Kredit tugadi. /buy buyrug'i bilan sotib oling.`
          : `📸 Rasm yuboring — qayta ishlaymiz!`)
      );
      return new Response("OK");
    }

    // === /buy ===
    if (text === "/buy" || text === "/sotib") {
      let packageList = "🛒 <b>Paketlar:</b>\n\n";
      for (const pkg of PACKAGES) {
        packageList += `/${pkg.key === "1" ? "buy1" : "buy" + pkg.key} — ${pkg.name} • ${pkg.price}\n`;
      }
      packageList += `\n💡 Ko'proq olsangiz — arzonroq!\n`;
      packageList += `Masalan: /buy20 — 20 ta rasm sotib olish`;

      await sendMessage(botToken, chatId, packageList);
      return new Response("OK");
    }

    // === /buy{N} ===
    const buyMatch = text.match(/^\/buy(\d+)$/);
    if (buyMatch) {
      const pkgKey = buyMatch[1];
      const pkg = PACKAGES.find(p => p.key === pkgKey);

      if (!pkg) {
        await sendMessage(botToken, chatId, "❌ Bunday paket topilmadi. /buy buyrug'ini yuboring.");
        return new Response("OK");
      }

      await supabase.from("profiles").update({
        bot_state: `awaiting_payment:${pkg.key}:${pkg.credits}:${AMOUNTS[pkg.key]}`,
      }).eq("id", profile.id);

      await sendMessage(botToken, chatId,
        `📦 <b>${pkg.name}</b> • ${pkg.price}\n\n` +
        `💳 Quyidagi karta raqamga o'tkazing:\n\n` +
        `<code>${CARD_NUMBER}</code>\n` +
        `👆 <i>Bosib nusxa oling</i>\n\n` +
        `💵 Summa: <b>${pkg.price}</b>\n\n` +
        `📸 To'lov qilganingizdan keyin <b>skrinshot yuboring</b> — biz tekshirib kreditlarni qo'shamiz.\n\n` +
        `❌ Bekor qilish: /cancel`
      );
      return new Response("OK");
    }

    // === /cancel ===
    if (text === "/cancel" || text === "/bekor") {
      if (profile.bot_state) {
        await supabase.from("profiles").update({ bot_state: null }).eq("id", profile.id);
        await sendMessage(botToken, chatId, "✅ Bekor qilindi.");
      } else {
        await sendMessage(botToken, chatId, "ℹ️ Bekor qiladigan narsa yo'q.");
      }
      return new Response("OK");
    }

    // === /help ===
    if (text === "/help" || text === "/yordam") {
      await sendMessage(botToken, chatId,
        `📋 <b>Buyruqlar:</b>\n\n` +
        `📱 Web App — professional rasm yaratish\n` +
        `/balance — Kredit qoldig'i\n` +
        `/buy — Kredit sotib olish\n` +
        `/cancel — Sotib olishni bekor qilish\n` +
        `/help — Yordam\n\n` +
        `🎨 <b>Qanday ishlaydi?</b>\n` +
        `1. "Rasm yaratish" tugmasini bosing\n` +
        `2. Web App ichida rasm yuklang\n` +
        `3. AI professional studio sifatida qayta ishlaydi\n` +
        `4. Tayyor rasmni yuklab oling!\n\n` +
        `💡 Har bir rasm uchun 1 kredit sarflanadi.`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "📱 Rasm yaratish", web_app: { url: WEB_APP_URL } }
            ]]
          }
        }
      );
      return new Response("OK");
    }

    // === Handle photo ===
    if (message.photo && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      if (largestPhoto.file_size && largestPhoto.file_size > MAX_FILE_SIZE) {
        await sendMessage(botToken, chatId, "❌ Rasm juda katta (max 10MB). Kichikroq rasm yuboring.");
        return new Response("OK");
      }

      // Check if awaiting payment screenshot
      if (profile.bot_state && profile.bot_state.startsWith("awaiting_payment:")) {
        const parts = profile.bot_state.split(":");
        const pkgKey = parts[1];
        const credits = parseInt(parts[2]);
        const amount = parts[3];
        const pkg = PACKAGES.find(p => p.key === pkgKey);

        // Download screenshot
        const photoFile = message.photo[message.photo.length - 1];
        const fileRes = await fetch(`${TELEGRAM_API}${botToken}/getFile?file_id=${photoFile.file_id}`);
        const fileData = await fileRes.json();
        const filePath = fileData.result?.file_path;

        if (!filePath) {
          await sendMessage(botToken, chatId, "❌ Rasmni olishda xatolik. Qayta yuboring.");
          return new Response("OK");
        }

        const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
        const imageBytes = new Uint8Array(await imageRes.arrayBuffer());

        // Upload screenshot to storage
        const storagePath = `${telegramId}/${crypto.randomUUID()}.jpg`;
        await supabase.storage.from("payment-screenshots").upload(storagePath, imageBytes, {
          contentType: "image/jpeg", upsert: true,
        });
        const screenshotRef = `payment-screenshots/${storagePath}`;

        // Create payment request
        const { data: paymentReq } = await supabase.from("payment_requests").insert({
          user_id: profile.user_id || null,
          telegram_id: telegramId,
          profile_id: profile.id,
          package_name: pkg?.name || `${credits} ta rasm`,
          credits,
          amount,
          screenshot_url: screenshotRef,
          status: "pending",
        }).select("id").single();

        // Clear bot state
        await supabase.from("profiles").update({ bot_state: null }).eq("id", profile.id);

        await sendMessage(botToken, chatId,
          `✅ <b>To'lov so'rovi qabul qilindi!</b>\n\n` +
          `📦 Paket: ${pkg?.name || credits + " ta rasm"}\n` +
          `💵 Summa: ${amount} so'm\n\n` +
          `⏳ Admin tekshirib, kreditlarni qo'shadi.\n` +
          `Odatda 5-30 daqiqa ichida tasdiqlanadi.`
        );

        // Send notification to admin with screenshot and approve/reject buttons
        if (adminChatId && paymentReq?.id) {
          const userName = profile.first_name || profile.telegram_username
            ? `${profile.first_name || ""} ${profile.telegram_username ? "@" + profile.telegram_username : ""}`.trim()
            : `TG:${telegramId}`;

          const caption =
            `🔔 <b>Yangi to'lov so'rovi!</b>\n\n` +
            `👤 ${userName}\n` +
            `📦 ${pkg?.name || credits + " ta rasm"}\n` +
            `💰 ${Number(amount).toLocaleString()} so'm\n` +
            `🎯 ${credits} kredit\n\n` +
            `⏳ Tasdiqlash kutilmoqda`;

          // Send photo with approve/reject buttons to admin
          const replyMarkup = {
            inline_keyboard: [
              [
                { text: "✅ Tasdiqlash", callback_data: `approve:${paymentReq.id}` },
                { text: "❌ Rad etish", callback_data: `reject:${paymentReq.id}` },
              ]
            ]
          };

          // Try sending photo with file_id first
          let photoSent = await sendPhoto(botToken, adminChatId, photoFile.file_id, caption, { reply_markup: replyMarkup });

          // If file_id fails, try signed URL
          if (!photoSent) {
            console.log("file_id failed, trying signed URL...");
            const { data: signedData } = await supabase.storage
              .from("payment-screenshots")
              .createSignedUrl(storagePath, 60 * 60 * 24);
            if (signedData?.signedUrl) {
              photoSent = await sendPhoto(botToken, adminChatId, signedData.signedUrl, caption, { reply_markup: replyMarkup });
            }
          }

          // Final fallback: text message with buttons
          if (!photoSent) {
            console.log("sendPhoto failed completely, sending text fallback");
            await sendMessage(botToken, Number(adminChatId), caption + "\n\n📎 Chek rasmi: storage'da saqlangan", { reply_markup: replyMarkup });
          }
        }

        return new Response("OK");
      }

      // Normal photo — redirect to Web App
      await sendMessage(botToken, chatId,
        `📱 Rasm yaratish uchun <b>Web App</b>ni oching!\n\n` +
        `💡 Quyidagi tugmani bosing va rasmni Web App ichida yuklang.`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "📱 Rasm yaratish", web_app: { url: WEB_APP_URL } }
            ]]
          }
        }
      );
      return new Response("OK");
    }

    // Unknown
    await sendMessage(botToken, chatId,
      "🤔 Tushunmadim.\n\n📱 Rasm yaratish uchun quyidagi tugmani bosing yoki /help buyrug'ini yozing.",
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "📱 Rasm yaratish", web_app: { url: WEB_APP_URL } }
          ]]
        }
      }
    );
    return new Response("OK");

  } catch (e) {
    console.error("Telegram bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
