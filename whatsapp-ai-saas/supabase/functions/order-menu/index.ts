// Edge Function to serve the Order Menu Page
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Desi Dhaba — Order Menu</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0f0f0f;color:#fff;min-height:100vh}
.header{background:linear-gradient(135deg,#7C3AED 0%,#EC4899 100%);padding:24px 20px 32px;text-align:center;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(124,58,237,0.4)}
.header h1{font-size:22px;font-weight:800}.header p{font-size:13px;opacity:0.85;margin-top:4px}
.cart-bar{position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;border-top:2px solid #7C3AED;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;z-index:200;backdrop-filter:blur(20px);transition:transform 0.3s}
.cart-bar.hidden{transform:translateY(100%)}
.cart-total{font-size:16px;font-weight:800;color:#7C3AED}.cart-count{font-size:13px;color:#aaa}
.btn-checkout{background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;border:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s}
.btn-checkout:active{transform:scale(0.95)}
.menu-section{padding:16px 16px 100px}
.category-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7C3AED;margin:20px 0 12px;padding-left:4px}
.item-card{background:#1a1a2e;border:2px solid transparent;border-radius:16px;margin-bottom:12px;overflow:hidden;transition:all 0.2s;cursor:pointer}
.item-card.selected{border-color:#7C3AED;background:#1e1636}
.item-top{display:flex;gap:14px;padding:14px;align-items:center}
.item-img{width:72px;height:72px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#2a2a3e}
.item-info{flex:1;min-width:0}.item-name{font-size:15px;font-weight:700}
.item-desc{font-size:12px;color:#888;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item-price{font-size:15px;font-weight:800;color:#7C3AED;margin-top:4px}
.item-check{width:24px;height:24px;border-radius:6px;border:2px solid #444;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
.item-card.selected .item-check{background:#7C3AED;border-color:#7C3AED}
.item-check svg{display:none}.item-card.selected .item-check svg{display:block}
.qty-row{display:none;padding:0 14px 14px;align-items:center;gap:12px}
.item-card.selected .qty-row{display:flex}
.qty-label{font-size:12px;color:#aaa}
.qty-controls{display:flex;align-items:center;background:#2a2a3e;border-radius:10px;overflow:hidden}
.qty-btn{width:36px;height:36px;border:none;background:transparent;color:#7C3AED;font-size:18px;font-weight:700;cursor:pointer}
.qty-btn:active{background:rgba(124,58,237,0.2)}
.qty-value{width:36px;text-align:center;font-size:15px;font-weight:700;color:#fff;background:transparent}
.checkout-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:500;overflow-y:auto;padding:20px}
.checkout-overlay.show{display:block}
.checkout-form{background:#1a1a2e;border-radius:20px;padding:28px 24px;max-width:480px;margin:0 auto;animation:slideUp 0.3s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.form-title{font-size:20px;font-weight:800;margin-bottom:20px;text-align:center}
.form-group{margin-bottom:16px}.form-label{font-size:12px;font-weight:600;color:#888;margin-bottom:6px;display:block;text-transform:uppercase;letter-spacing:0.5px}
.form-input{width:100%;padding:12px 16px;background:#0f0f0f;border:2px solid #333;border-radius:12px;color:#fff;font-size:14px;font-family:inherit;outline:none}
.form-input:focus{border-color:#7C3AED}
.type-options,.pay-options{display:flex;gap:8px}
.type-btn,.pay-btn{flex:1;padding:12px;border:2px solid #333;background:transparent;border-radius:12px;color:#aaa;font-size:13px;font-weight:600;cursor:pointer;text-align:center}
.type-btn.active,.pay-btn.active{border-color:#7C3AED;color:#7C3AED;background:rgba(124,58,237,0.1)}
.order-summary{background:#0f0f0f;border-radius:12px;padding:16px;margin-bottom:20px}
.summary-item{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid #222}
.summary-item:last-child{border:none}
.summary-total{display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#7C3AED;padding-top:10px;margin-top:6px;border-top:2px solid #333}
.btn-submit{width:100%;padding:16px;border:none;background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;font-size:16px;font-weight:800;border-radius:14px;cursor:pointer;margin-top:8px}
.btn-back{width:100%;padding:14px;border:2px solid #333;background:transparent;color:#888;font-size:14px;font-weight:600;border-radius:14px;cursor:pointer;margin-top:8px}
.success-screen{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#0f0f0f;z-index:600;align-items:center;justify-content:center;text-align:center;padding:40px}
.success-screen.show{display:flex;flex-direction:column}
.success-icon{font-size:64px;margin-bottom:20px}.success-title{font-size:24px;font-weight:800;margin-bottom:8px}
.success-sub{font-size:14px;color:#888;line-height:1.6}
</style>
</head>
<body>
<div class="header"><h1>🍽️ Desi Dhaba</h1><p>Items select karein ☑️ → Quantity set karein → Checkout!</p></div>
<div class="menu-section" id="menuSection"><p style="text-align:center;color:#888;padding:40px 0;">Loading menu...</p></div>
<div class="cart-bar hidden" id="cartBar"><div><div class="cart-total" id="cartTotal">Rs. 0</div><div class="cart-count" id="cartCount">0 items</div></div><button class="btn-checkout" onclick="openCheckout()">Checkout →</button></div>
<div class="checkout-overlay" id="checkoutOverlay"><div class="checkout-form"><h2 class="form-title">🛒 Order Details</h2><div class="order-summary" id="orderSummary"></div>
<div class="form-group"><label class="form-label">👤 Aapka Naam</label><input type="text" class="form-input" id="custName" placeholder="Poora naam likhein"></div>
<div class="form-group"><label class="form-label">📞 Phone Number</label><input type="tel" class="form-input" id="custPhone" placeholder="03XX-XXXXXXX"></div>
<div class="form-group"><label class="form-label">🏠 Order Type</label><div class="type-options"><button class="type-btn active" onclick="setType(this,'delivery')">🛵 Delivery</button><button class="type-btn" onclick="setType(this,'dinein')">🍽️ Dine-in</button><button class="type-btn" onclick="setType(this,'takeaway')">📦 Takeaway</button></div></div>
<div class="form-group" id="addressGroup"><label class="form-label">📍 Delivery Address</label><input type="text" class="form-input" id="custAddress" placeholder="Poora address likhein"></div>
<div class="form-group"><label class="form-label">💳 Payment Method</label><div class="pay-options"><button class="pay-btn active" onclick="setPay(this,'cash')">💵 Cash</button><button class="pay-btn" onclick="setPay(this,'easypaisa')">📱 EasyPaisa</button><button class="pay-btn" onclick="setPay(this,'jazzcash')">📱 JazzCash</button></div></div>
<button class="btn-submit" onclick="submitOrder()">✅ Order Confirm Karein</button><button class="btn-back" onclick="closeCheckout()">← Wapas Menu</button></div></div>
<div class="success-screen" id="successScreen"><div class="success-icon">✅</div><div class="success-title">Order Confirmed!</div><div class="success-sub" id="successMsg">Shukriya!</div></div>
<script>
const SB="https://myuqhxicepxnnafxethe.supabase.co",SK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dXFoeGljZXB4bm5hZnhldGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDc5NDMsImV4cCI6MjA5MzEyMzk0M30.yPlRtlH9NmMsRaOqPcjYcpMOEsj8PsBHMy4SWSoZNmo";
let menuItems=[],sel={},oType="delivery",pMethod="cash";
const waId=new URLSearchParams(location.search).get("wa")||"";
async function loadMenu(){const r=await fetch(SB+"/rest/v1/menu_items?select=id,name,price,description,image_url,menu_categories(name)&is_available=eq.true",{headers:{"apikey":SK,"Authorization":"Bearer "+SK}});menuItems=await r.json();renderMenu()}
function renderMenu(){const g={};menuItems.forEach(i=>{const c=i.menu_categories?.name||"Other";if(!g[c])g[c]=[];g[c].push(i)});let h="";for(const[c,items]of Object.entries(g)){h+='<div class="category-title">'+c+"</div>";items.forEach(i=>{const s=sel[i.id]?"selected":"",q=sel[i.id]?.qty||1;h+='<div class="item-card '+s+'" onclick="toggle(\\''+i.id+'\\')"><div class="item-top">'+(i.image_url?'<img class="item-img" src="'+i.image_url+'">':'<div class="item-img"></div>')+'<div class="item-info"><div class="item-name">'+i.name+"</div>"+(i.description?'<div class="item-desc">'+i.description+"</div>":"")+'<div class="item-price">Rs. '+Number(i.price).toLocaleString()+'</div></div><div class="item-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="qty-row" onclick="event.stopPropagation()"><span class="qty-label">Quantity:</span><div class="qty-controls"><button class="qty-btn" onclick="chgQty(\\''+i.id+'\\',-1)">−</button><span class="qty-value" id="q_'+i.id+'">'+q+'</span><button class="qty-btn" onclick="chgQty(\\''+i.id+'\\',1)">+</button></div></div></div>'})}document.getElementById("menuSection").innerHTML=h;updBar()}
function toggle(id){if(sel[id])delete sel[id];else{const i=menuItems.find(x=>x.id===id);if(i)sel[id]={...i,qty:1}}renderMenu()}
function chgQty(id,d){if(!sel[id])return;sel[id].qty=Math.max(1,Math.min(99,sel[id].qty+d));document.getElementById("q_"+id).textContent=sel[id].qty;updBar()}
function updBar(){const items=Object.values(sel),t=items.reduce((s,i)=>s+i.price*i.qty,0),n=items.length;document.getElementById("cartTotal").textContent="Rs. "+t.toLocaleString();document.getElementById("cartCount").textContent=n+" item"+(n!==1?"s":"");document.getElementById("cartBar").classList.toggle("hidden",n===0)}
function openCheckout(){const items=Object.values(sel);if(!items.length)return;let h="",t=0;items.forEach(i=>{const s=i.price*i.qty;t+=s;h+='<div class="summary-item"><span>'+i.name+" × "+i.qty+"</span><span>Rs. "+s.toLocaleString()+"</span></div>"});h+='<div class="summary-total"><span>Total</span><span>Rs. '+t.toLocaleString()+"</span></div>";document.getElementById("orderSummary").innerHTML=h;document.getElementById("checkoutOverlay").classList.add("show")}
function closeCheckout(){document.getElementById("checkoutOverlay").classList.remove("show")}
function setType(b,t){oType=t;b.parentElement.querySelectorAll(".type-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById("addressGroup").style.display=t==="delivery"?"block":"none"}
function setPay(b,m){pMethod=m;b.parentElement.querySelectorAll(".pay-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active")}
async function submitOrder(){const n=document.getElementById("custName").value.trim(),p=document.getElementById("custPhone").value.trim(),a=document.getElementById("custAddress").value.trim();if(!n){alert("Naam likhein!");return}if(!p){alert("Phone dein!");return}if(oType==="delivery"&&!a){alert("Address dein!");return}const items=Object.values(sel),t=items.reduce((s,i)=>s+i.price*i.qty,0);try{await fetch(SB+"/rest/v1/orders",{method:"POST",headers:{"apikey":SK,"Authorization":"Bearer "+SK,"Content-Type":"application/json"},body:JSON.stringify({customer_name:n,wa_id:waId||p,items_summary:items.map(i=>i.name+" x"+i.qty).join(", "),order_items:items.map(i=>({item_id:i.id,name:i.name,quantity:i.qty,unit_price:i.price,subtotal:i.price*i.qty})),total_price:t,delivery_address:oType==="delivery"?a:oType==="dinein"?"Dine-in":"Takeaway",order_status:"pending"})});document.getElementById("checkoutOverlay").classList.remove("show");document.getElementById("successMsg").innerHTML="👤 "+n+"<br>📞 "+p+"<br>💰 Rs. "+t.toLocaleString()+"<br><br>⏳ "+(oType==="delivery"?"30-45 min delivery":"15-20 min ready");document.getElementById("successScreen").classList.add("show")}catch(e){alert("Error!")}}
loadMenu();
</script>
</body>
</html>`;

Deno.serve((_req: Request) => {
  return new Response(HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
