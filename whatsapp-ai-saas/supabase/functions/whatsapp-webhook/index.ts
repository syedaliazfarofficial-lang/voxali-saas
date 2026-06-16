// WhatsApp AI Bot v5 — Pakistani Restaurant Style
// Roman Urdu + Custom Qty + Payment + Delivery/Dine-in + Status Updates

const VERIFY_TOKEN    = "voxali_whatsapp_secret_2024";
const WA_TOKEN        = "EAAdaiR4GoLgBRQVsv4hnPEPrAttO48t8QnouYyQEOSirIplOKFayD1ZBgtLRhnuxAayq1IcRvLQGD3DNL5DelX6WVMY69eMQUa1IzL38BjJe1Af2sRAFeT436kMNmDCssKOAJZBR4xp5ZBCrKBrAqA9hlBTFgyVW20CAAtrT8P47ut5etOEEdlWtn1vZCF10KwZDZD";
const PHONE_NUMBER_ID = "1141254082396318";
const WABA_ID         = "26633990392924510";
const SUPABASE_URL    = "https://myuqhxicepxnnafxethe.supabase.co";
const SUPABASE_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dXFoeGljZXB4bm5hZnhldGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDc5NDMsImV4cCI6MjA5MzEyMzk0M30.yPlRtlH9NmMsRaOqPcjYcpMOEsj8PsBHMy4SWSoZNmo";
const WA_API          = "https://graph.facebook.com/v20.0";
const RESTAURANT_NAME = "Desi Dhaba"; // Change this to your restaurant name

// ─── MAIN SERVER ───
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      await subscribeWABA();
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    const rawBody = await req.text();
    console.log("📩", rawBody);

    let body: any;
    try { body = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return new Response("OK", { status: 200 });

    const msg = messages[0];
    const from = msg.from;

    let userText = "";
    let btnId = "";
    let btnTitle = "";

    if (msg.type === "text") {
      userText = msg.text?.body?.trim() || "";
    } else if (msg.type === "interactive") {
      if (msg.interactive?.type === "list_reply") {
        btnId = msg.interactive.list_reply.id;
        btnTitle = msg.interactive.list_reply.title;
      } else if (msg.interactive?.type === "button_reply") {
        btnId = msg.interactive.button_reply.id;
        btnTitle = msg.interactive.button_reply.title;
      }
    }

    console.log(`📱 ${from} | "${userText}" | btn:"${btnId}"`);

    // Log customer message
    const profileName = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || "";
    let displayMessage = userText;
    if (!displayMessage && btnTitle) {
      displayMessage = `[Click: ${btnTitle}]`;
    }
    if (displayMessage) {
      await logChatMessage(from, "customer", displayMessage, profileName);
    }

    const menuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/menu_items?select=id,name,price,description,image_url,menu_categories(name)&is_available=eq.true`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const menuItems = await menuRes.json();
    const session = await getSession(from);

    await handleFlow(from, userText, btnId, btnTitle, menuItems, session);
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});

// ═══════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════

async function getSession(waId: string): Promise<any> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/customer_sessions?wa_id=eq.${waId}&select=*`,
    { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  if (data?.length > 0) return data[0];

  const newSession = {
    wa_id: waId,
    state: "IDLE",
    current_order: { cart: [], customer_name: "", address: "", payment_method: "", order_type: "" }
  };
  await fetch(`${SUPABASE_URL}/rest/v1/customer_sessions`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify(newSession),
  });
  return newSession;
}

async function updateSession(waId: string, state: string, order: any) {
  await fetch(`${SUPABASE_URL}/rest/v1/customer_sessions?wa_id=eq.${waId}`, {
    method: "PATCH",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state, current_order: order, updated_at: new Date().toISOString() }),
  });
}

// ═══════════════════════════════════════
// MAIN FLOW HANDLER
// ═══════════════════════════════════════

async function handleFlow(from: string, text: string, btnId: string, btnTitle: string, menuItems: any[], session: any) {
  const msg = text.toLowerCase();
  const state = session?.state || "IDLE";
  const order = session?.current_order || { cart: [], customer_name: "", address: "", payment_method: "", order_type: "" };

  // ── CANCEL
  if (msg === "cancel" || msg === "reset") {
    await updateSession(from, "IDLE", { cart: [], customer_name: "", address: "", payment_method: "", order_type: "" });
    await sendText(from, "❌ Order cancel ho gaya.\n\nDobara order karne ke liye *MENU* type karein! 🍽️");
    return;
  }

  // ══════════════════════════
  // STEP STATES
  // ══════════════════════════


  // ── ASKING_QTY: Customer types quantity number
  if (state === "ASKING_QTY" && order.pending_item) {
    const qty = parseInt(msg);
    if (!qty || qty <= 0 || qty > 99) {
      await sendText(from, "❌ Sahi number likhein (1-99)\n\nKitne chahiye? Jaise: *2* ya *5*");
      return;
    }

    const item = order.pending_item;
    const existing = order.cart.find((c: any) => c.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      order.cart.push({ id: item.id, name: item.name, price: item.price, qty });
    }
    delete order.pending_item;
    await updateSession(from, "IDLE", order);

    let total = 0;
    let cartText = "";
    for (const c of order.cart) {
      cartText += `• ${c.name} × ${c.qty} = Rs. ${c.price * c.qty}\n`;
      total += c.price * c.qty;
    }

    await sendText(from, `✅ *${qty}x ${item.name}* add ho gaya!\n\n🛒 *Cart:*\n${cartText}💰 *Total: Rs. ${total}*\n\n_Aur items select karein ya *DONE* likhein checkout ke liye_`);
    await delay(1000);

    // AUTO show menu list again for next selection!
    await sendMenuList(from, menuItems);
    return;
  }

  // ── ASKING_NAME: Customer sends name
  if (state === "ASKING_NAME") {
    order.customer_name = text;
    await updateCustomerName(from, text);
    await updateSession(from, "ASKING_ORDER_TYPE", order);
    await sendButtons(from,
      `Shukriya *${text}*! 🙏\n\nAap kaise lena chahenge?`,
      [
        { id: "delivery", title: "🛵 Delivery" },
        { id: "dinein", title: "🍽️ Dine-in" },
        { id: "takeaway", title: "📦 Takeaway" },
      ]
    );
    return;
  }

  // ── ASKING_ORDER_TYPE: Delivery/Dine-in/Takeaway
  if (state === "ASKING_ORDER_TYPE" || btnId === "delivery" || btnId === "dinein" || btnId === "takeaway") {
    if (btnId === "delivery") {
      order.order_type = "delivery";
      await updateSession(from, "ASKING_ADDRESS", order);
      await sendText(from, "🛵 Delivery address bhejein:\n\n📍 Example: _House 5, Street 3, Gulberg, Lahore_");
      return;
    }
    if (btnId === "dinein") {
      order.order_type = "dine-in";
      order.address = "Dine-in";
      await updateSession(from, "ASKING_PAYMENT", order);
      await sendButtons(from,
        `🍽️ Acha! Dine-in.\n\nPayment kaise karenge?`,
        [
          { id: "pay_cash", title: "💵 Cash" },
          { id: "pay_easypaisa", title: "📱 EasyPaisa" },
          { id: "pay_jazzcash", title: "📱 JazzCash" },
        ]
      );
      return;
    }
    if (btnId === "takeaway") {
      order.order_type = "takeaway";
      order.address = "Takeaway";
      await updateSession(from, "ASKING_PAYMENT", order);
      await sendButtons(from,
        `📦 Takeaway! Aap pick kar lenge.\n\nPayment kaise karenge?`,
        [
          { id: "pay_cash", title: "💵 Cash" },
          { id: "pay_easypaisa", title: "📱 EasyPaisa" },
          { id: "pay_jazzcash", title: "📱 JazzCash" },
        ]
      );
      return;
    }
  }

  // ── ASKING_ADDRESS: Customer sends delivery address
  if (state === "ASKING_ADDRESS") {
    order.address = text;
    await updateSession(from, "ASKING_PAYMENT", order);
    await sendButtons(from,
      `📍 Address: _${text}_\n\nPayment kaise karenge?`,
      [
        { id: "pay_cash", title: "💵 Cash" },
        { id: "pay_easypaisa", title: "📱 EasyPaisa" },
        { id: "pay_jazzcash", title: "📱 JazzCash" },
      ]
    );
    return;
  }

  // ── ASKING_PAYMENT: Payment method selected → ORDER CONFIRMED!
  if (state === "ASKING_PAYMENT" || btnId.startsWith("pay_")) {
    let payMethod = "";
    if (btnId === "pay_cash") payMethod = "Cash on Delivery";
    else if (btnId === "pay_easypaisa") payMethod = "EasyPaisa";
    else if (btnId === "pay_jazzcash") payMethod = "JazzCash";
    else { payMethod = text || "Cash"; }

    order.payment_method = payMethod;

    // Reset session
    await updateSession(from, "IDLE", { cart: [], customer_name: "", address: "", payment_method: "", order_type: "" });

    // Build order summary
    let total = 0;
    let summary = "";
    for (const item of order.cart) {
      summary += `• ${item.name} × ${item.qty} — Rs. ${item.price * item.qty}\n`;
      total += item.price * item.qty;
    }

    const orderType = order.order_type === "delivery" ? "🛵 Delivery" : order.order_type === "dine-in" ? "🍽️ Dine-in" : "📦 Takeaway";

    const confirmMsg =
      `✅ *ORDER CONFIRMED!* 🎉\n\n` +
      `🏪 *${RESTAURANT_NAME}*\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `👤 *Name:* ${order.customer_name}\n` +
      `📞 *Phone:* +${from}\n` +
      `${orderType}\n` +
      `${order.order_type === "delivery" ? `📍 *Address:* ${order.address}\n` : ""}` +
      `💳 *Payment:* ${payMethod}\n\n` +
      `🛒 *Items:*\n${summary}\n` +
      `━━━━━━━━━━━━━━\n` +
      `💰 *TOTAL: Rs. ${total}*\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `⏳ Estimated time: ${order.order_type === "delivery" ? "30-45 min" : "15-20 min"}\n\n` +
      `Shukriya! Hum aapko status update bhejenge 🙏`;

    await sendText(from, confirmMsg);
    await saveOrder(from, order, total);
    return;
  }

  // ══════════════════════════
  // INTERACTIVE REPLIES
  // ══════════════════════════

  // ── Item selected from menu list
  if (btnId.startsWith("item_")) {
    const itemId = btnId.replace("item_", "");
    const item = menuItems.find((i: any) => i.id === itemId);

    if (item) {
      if (item.image_url) {
        await sendImage(from, item.image_url,
          `*${item.name}*\n${item.description ? `_${item.description}_\n` : ""}💰 *Rs. ${item.price}*`
        );
        await delay(500);
      }

      order.pending_item = { id: item.id, name: item.name, price: item.price };
      await updateSession(from, "ASKING_QTY", order);
      await sendText(from, `*${item.name}* — Rs. ${item.price}\n\n📝 Kitne chahiye? Number likhein:\nJaise: *1* ya *3* ya *10*`);
    }
    return;
  }

  // ── Add More Items
  if (btnId === "more_items") {
    await sendMenuList(from, menuItems);
    return;
  }

  // ── Checkout
  if (btnId === "checkout") {
    if (!order.cart?.length) {
      await sendText(from, "🛒 Cart khali hai! *MENU* type karein.");
      return;
    }
    await updateSession(from, "ASKING_NAME", order);
    await sendText(from, "Chaliye order complete karte hain! 🎉\n\n👤 Apna *poora naam* likhein:");
    return;
  }

  // ── Clear Cart
  if (btnId === "clear_cart") {
    await updateSession(from, "IDLE", { cart: [], customer_name: "", address: "", payment_method: "", order_type: "" });
    await sendText(from, "🗑️ Cart khali ho gaya!\n\n*MENU* type karein naya order shuru karne ke liye.");
    return;
  }

  // ══════════════════════════
  // TEXT COMMANDS
  // ══════════════════════════

  // ── DONE: Customer types "done" to checkout
  if (msg === "done" || msg === "checkout" || msg === "ho gaya") {
    if (!order.cart?.length) {
      await sendText(from, "🛒 Cart khali hai! Pehle items select karein.\n\nMenu ke liye *1* dabayein 🍽️");
      return;
    }
    await updateSession(from, "ASKING_NAME", order);
    await sendText(from, "Chaliye order complete karte hain! 🎉\n\n👤 Apna *poora naam* likhein:");
    return;
  }

  const GREETING_MSG =
    `Assalam o Alaikum! 🍽️\n\n` +
    `*${RESTAURANT_NAME}* mein khush amdeed!\n\n` +
    `Aap kya farmayenge? Number dabayein 👇\n\n` +
    `1️⃣  Menu dekhein\n` +
    `2️⃣  Cart dekhein\n` +
    `3️⃣  Order status\n` +
    `4️⃣  Hamara pata\n` +
    `5️⃣  Timings\n` +
    `6️⃣  Hum se baat karein`;

  // ── GREETING (hello/hi/salam OR empty)
  if (!msg || msg.includes("hello") || msg.includes("hi") || msg.includes("salam") || msg.includes("assalam") || msg.includes("hey") || msg.includes("aoa")) {
    await sendText(from, GREETING_MSG);
    return;
  }

  // ── NUMBER SHORTCUTS: 1, 2, 3, 4, 5, 6
  if (msg === "1" || msg.includes("menu") || msg.includes("manu") || msg.includes("food") || msg.includes("kia hai") || msg.includes("khana")) {
    // Send web menu link for multi-select
    const menuLink = `https://myuqhxicepxnnafxethe.supabase.co/storage/v1/object/public/order-menu/index.html?wa=${from}`;
    await sendText(from,
      `🍽️ *${RESTAURANT_NAME} — Menu*\n\n` +
      `☑️ *Multiple items select karna hai?*\n` +
      `👉 Yeh link kholein:\n${menuLink}\n\n` +
      `_Ya neeche se ek ek item select karein:_`
    );
    await delay(500);
    await sendMenuList(from, menuItems);
    return;
  }

  if (msg === "2" || msg.includes("cart")) {
    if (!order.cart?.length) {
      await sendText(from, "🛒 Cart khali hai!\n\nMenu dekhne ke liye *1* dabayein 🍽️");
      return;
    }
    let total = 0;
    let cartText = "";
    for (const c of order.cart) {
      cartText += `• ${c.name} × ${c.qty} = Rs. ${c.price * c.qty}\n`;
      total += c.price * c.qty;
    }
    await sendButtons(from,
      `🛒 *Aapka Cart:*\n\n${cartText}\n💰 *Total: Rs. ${total}*`,
      [
        { id: "more_items", title: "📋 Aur Items" },
        { id: "checkout", title: "✅ Order Confirm" },
        { id: "clear_cart", title: "🗑️ Cart Khali" },
      ]
    );
    return;
  }

  if (msg === "3" || msg.includes("status") || msg.includes("order")) {
    await sendText(from, "📦 Order status check karne ke liye apna order ID bhejein.\n\nYa naya order ke liye *1* dabayein 🍽️");
    return;
  }

  if (msg === "4" || msg.includes("location") || msg.includes("address") || msg.includes("kahan") || msg.includes("where") || msg.includes("pata")) {
    await sendText(from, `📍 *${RESTAURANT_NAME}*\nMain Boulevard, Gulberg, Lahore\n\n🕐 Mon–Sun, 12pm–12am\n\nMenu ke liye *1* dabayein`);
    return;
  }

  if (msg === "5" || msg.includes("hours") || msg.includes("time") || msg.includes("open") || msg.includes("waqt") || msg.includes("timing")) {
    await sendText(from, `⏰ *${RESTAURANT_NAME} Timings:*\n\nMonday – Sunday\n12:00 PM – 12:00 AM 🎉\n\nMenu ke liye *1* dabayein 🍽️`);
    return;
  }

  if (msg === "6") {
    await sendText(from, `📞 *${RESTAURANT_NAME}*\n\nCall karein: 0300-1234567\nWhatsApp: Yahan likh dein!\n\nHum 5 minute mein reply karenge 🙏`);
    return;
  }

  // ── DEFAULT: Show numbered menu again
  await sendText(from,
    `Shukriya! 😊\n\nNumber dabayein ya command likhein:\n\n` +
    `1️⃣  Menu dekhein\n` +
    `2️⃣  Cart dekhein\n` +
    `3️⃣  Order status\n` +
    `4️⃣  Hamara pata\n` +
    `5️⃣  Timings\n` +
    `6️⃣  Hum se baat\n` +
    `❌  *CANCEL* — Order cancel`
  );
}

// ═══════════════════════════════════════
// SEND INTERACTIVE LIST (Menu)
// ═══════════════════════════════════════

async function sendMenuList(to: string, menuItems: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const item of menuItems) {
    const cat = item.menu_categories?.name || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const sections: any[] = [];
  let itemCount = 0;

  for (const [cat, items] of Object.entries(grouped)) {
    const rows: any[] = [];
    for (const item of items) {
      if (itemCount >= 10) break;
      rows.push({
        id: `item_${item.id}`,
        title: item.name.substring(0, 24),
        description: `Rs. ${item.price}${item.description ? " — " + item.description.substring(0, 48) : ""}`,
      });
      itemCount++;
    }
    if (rows.length > 0) {
      sections.push({ title: cat.substring(0, 24), rows });
    }
    if (itemCount >= 10) break;
  }

  await fetch(`${WA_API}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: `🍽️ ${RESTAURANT_NAME}` },
        body: { text: "Item select karein 👇 Quantity poochenge, phir menu wapas aayega — jitne items chahiye select karte jayein!" },
        footer: { text: "Tap → Qty → Auto Menu Again 🔄" },
        action: { button: "📋 Menu Dekhein", sections },
      },
    }),
  });
  await logChatMessage(to, "bot", "📋 Sent Menu List for selection");
}


// ═══════════════════════════════════════
// SEND BUTTONS
// ═══════════════════════════════════════

async function sendButtons(to: string, bodyText: string, buttons: { id: string; title: string }[]) {
  await fetch(`${WA_API}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title.substring(0, 20) },
          })),
        },
      },
    }),
  });
  const buttonOptions = buttons.map(b => `[${b.title}]`).join(" ");
  await logChatMessage(to, "bot", `${bodyText}\nOptions: ${buttonOptions}`);
}

// ═══════════════════════════════════════
// SEND TEXT & IMAGE
// ═══════════════════════════════════════

async function sendText(to: string, text: string) {
  await fetch(`${WA_API}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  await logChatMessage(to, "bot", text);
}

async function sendImage(to: string, imageUrl: string, caption: string) {
  await fetch(`${WA_API}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "image", image: { link: imageUrl, caption } }),
  });
  await logChatMessage(to, "bot", `🖼️ [Image] ${caption || ""}`);
}

// ═══════════════════════════════════════
// SAVE ORDER
// ═══════════════════════════════════════

async function saveOrder(waId: string, order: any, total: number) {
  const summary = order.cart.map((c: any) => `${c.name} x${c.qty}`).join(", ");
  await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items_summary: summary,
      total_price: total,
      delivery_address: order.address || "",
      order_status: "pending",
      customer_name: order.customer_name || "Unknown",
      wa_id: waId,
      order_items: order.cart,
    }),
  });
  console.log("💾 Order saved!");
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

async function subscribeWABA() {
  try {
    const res = await fetch(`${WA_API}/${WABA_ID}/subscribed_apps`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WA_TOKEN}` }
    });
    console.log("WABA:", JSON.stringify(await res.json()));
  } catch (e) { console.error("WABA error:", e); }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════
// CHAT LOG DATABASE HELPERS
// ═══════════════════════════════════════

async function getOrCreateCustomer(waId: string, name?: string): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?wa_id=eq.${waId}&select=id`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    const customers = await res.json();
    if (customers && customers.length > 0) {
      // Update last_chat timestamp
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customers[0].id}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ last_chat: new Date().toISOString() })
      });
      return customers[0].id;
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        wa_id: waId,
        name: name || `WhatsApp Client (+${waId})`,
        last_chat: new Date().toISOString()
      })
    });
    const newCustomers = await insertRes.json();
    return newCustomers[0]?.id || "";
  } catch (err) {
    console.error("Error in getOrCreateCustomer:", err);
    return "";
  }
}

async function updateCustomerName(waId: string, name: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/customers?wa_id=eq.${waId}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });
  } catch (err) {
    console.error("Error updating customer name:", err);
  }
}

async function logChatMessage(waId: string, sender: 'customer' | 'bot', message: string, customerName?: string) {
  try {
    const customerId = await getOrCreateCustomer(waId, customerName);
    if (!customerId) return;

    await fetch(`${SUPABASE_URL}/rest/v1/chat_logs`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_id: customerId,
        sender,
        message,
        created_at: new Date().toISOString()
      })
    });
    console.log(`💾 Logged ${sender} message for +${waId}`);
  } catch (err) {
    console.error("Error logging chat message:", err);
  }
}
