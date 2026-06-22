const WHATSAPP_NUMBER = "447309736428";

const STORE_COLLECTION_INFO = {
  collectionPoint: "203 Willows Lane, Bolton, BL3 4AZ",
  collectionHours: "Tuesday - Sunday: 11:00 AM - 9:00 PM",
  closedDay: "Monday Closed",
  timingNote: "After placing your order, we will confirm your collection or delivery time via WhatsApp."
};

const BANK_TRANSFER_DETAILS = {
  bankName: "000",
  accountName: "000",
  sortCode: "00-00-00",
  accountNumber: "00000000",
  reference: "Use your name as reference"
};

const FIXED_REWARDS = [
  {id:"free_chicken_roll_0", points:500, name:"Puli Satham 500ml Box", value:4.99, emoji:"", image:"https://rakskitchen.net/wp-content/uploads/2014/05/14097742883_de6b965cb9_z-500x375.jpg"},
  {id:"free_1kg_puttu_1", points:1000, name:"1 Chicken biryani 500ml box", value:9.99, emoji:"", image:"https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Chicken-Biryani-Recipe.jpg"},
  {id:"free_chicken_biryani_2", points:2000, name:"1kg Chicken Biryani", value:18.99, emoji:"", image:"https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Chicken-Biryani-Recipe.jpg"},
  {id:"free_gingelly_oil_3", points:3000, name:"Free Gingelly Oil", value:0, emoji:"", image:""}
];
const DEFAULT_REWARD_VALUES = {
  free_chicken_roll_0:4.99,
  free_1kg_puttu_1:9.99,
  free_chicken_biryani_2:18.99,
  free_gingelly_oil_3:0
};
FIXED_REWARDS.forEach(r => {
  if(!Number(r.value)) r.value = DEFAULT_REWARD_VALUES[r.id] || 0;
});
let cart = JSON.parse(localStorage.getItem("ce_cart") || "{}");
let checkedDistanceMiles = null;
let checkedPostcode = "";
let requestedCart = JSON.parse(localStorage.getItem("ce_requested_cart") || "[]");
let claimedRewards = JSON.parse(localStorage.getItem("ce_claimed_rewards") || "[]");
loadSavedRewards();
const TEXT = {
  restaurant:"Restaurant",
  grocery:"Grocery",
  search:"Search",
  searchPlaceholder:"Search for products...",
  mostOrdered:"Popular Items",
  specialOffers:"Special Offers",
  offersNote:"Only discounted products will appear here.",
  allProducts:"All Products",
  allCategories:"All Categories",
  rewardsShop:"Rewards",
  rewardsText:"Spend £1 and earn 10 points. Redeem free items.",
  cantFind:"Can't find what you need?",
  requestText:"Type the item name and add it to your cart. Price will be confirmed on WhatsApp.",
  requestPlaceholder:"Example: MTR Rava Idli Mix",
  addRequest:"Add Request to Cart",
  yourCart:"Your Cart",
  subtotal:"Subtotal",
  checkout:"Checkout",
  collection:"Collection",
  delivery:"Delivery",
  deliveryInfo:"Delivery Information",
  deliveryNotice:"Delivery charge may apply. We will confirm delivery charge and delivery time via WhatsApp after reviewing your order.",
  collectionInfo:"Collection Information",
  collectionPoint:"Collection Point:",
  collectionHours:"Collection Hours:",
  timingNote:"After placing your order, we will confirm your collection or delivery time via WhatsApp.",
  customerName:"Customer name",
  postcode:"Postcode for delivery e.g. BL3 4AZ",
  whatsappNumber:"Customer WhatsApp number",
  address:"Full delivery address including postcode",
  paymentMethod:"Payment Method",
  cash:"Cash",
  card:"Card",
  bankTransfer:"Bank Transfer",
  notes:"Customer notes optional",
  total:"Total",
  sendWhatsapp:"Send Order to WhatsApp",
  home:"Home",
  products:"Products",
  rewards:"Rewards",
  cart:"Cart",
  add:"Add",
  out:"Out",
  addOffer:"Add Offer",
  addToCart:"Add to Cart",
  outOfStock:"Out of Stock",
  inStock:"In Stock",
  rewardPoints:"Reward Points",
  emptyCart:"Cart is empty.",
  requestedItem:"Requested item - Price to be confirmed",
  mayApply:"May apply",
  deliverySelected:"Delivery selected. Please enter full address and postcode. We will confirm delivery charge via WhatsApp."
};

function tr(key){
  return TEXT[key] || key;
}

function rewardIdFromName(name){
  return String(name || "reward").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `reward_${Date.now()}`;
}

function loadSavedRewards(){
  try{
    const saved = JSON.parse(localStorage.getItem("ce_rewards") || "null");
    if(!Array.isArray(saved) || !saved.length) return;
    const fallbackImage = FIXED_REWARDS[0] ? FIXED_REWARDS[0].image : "";
    const fallbackById = new Map(FIXED_REWARDS.map(r => [r.id, r]));
    const cleanRewards = saved.map((r, index) => {
      const name = String(r.reward_name || r.name || "").trim() || "Free Gift";
      const id = r.id || rewardIdFromName(name) + "_" + index;
      const fallback = fallbackById.get(id);
      return {
        id,
        points:Number(r.points_required || r.points || 0),
        name,
        value:Number(r.reward_price || r.value || r.price || 0),
        emoji:r.emoji || "",
        image:r.image || (fallback && fallback.image) || fallbackImage
      };
    }).filter(r => r.points > 0);
    if(cleanRewards.length){
      FIXED_REWARDS.splice(0, FIXED_REWARDS.length, ...cleanRewards.sort((a,b)=>a.points-b.points));
    }
  }catch(e){
    console.warn("Could not load saved rewards", e);
  }
}
document.addEventListener("error", function(event){
  const img = event.target;
  if(!img || img.tagName !== "IMG" || img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  const fallback = document.createElement("div");
  fallback.className = `${img.className || ""} img-fallback`.trim();
  fallback.setAttribute("role", "img");
  fallback.setAttribute("aria-label", img.alt || "Product image");
  fallback.innerHTML = `<span>${escapeHtmlText(img.alt || "Chennai Express")}</span>`;
  img.replaceWith(fallback);
}, true);

function escapeHtmlText(v){
  return String(v || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function cleanPublicDescription(value){
  return String(value || "")
    .replace(/\s*Price includes 40% profit from invoice cost\./gi, "")
    .trim();
}

function money(v){ return "\u00a3" + Number(v || 0).toFixed(2); }
function save(){ 
  localStorage.setItem("ce_cart", JSON.stringify(cart)); 
  localStorage.setItem("ce_requested_cart", JSON.stringify(requestedCart));
  updateCartCount(); 
}
function priceOf(p){ return p.offer_price || p.price; }
async function saveOrderToSupabase(orderData){
  if(!window.ceSupabase){
    return {ok:false, message:"Supabase is not connected."};
  }
  try{
    const orderRow = {
      order_id: orderData.orderId,
      customer_name: orderData.name,
      whatsapp_number: orderData.phone,
      order_type: orderData.type,
      delivery_address: orderData.address || null,
      postcode: orderData.postcode || null,
      payment_method: orderData.paymentMethod || null,
      subtotal: Number(orderData.subtotal || 0),
      delivery_charge: Number(orderData.delivery || 0),
      total: Number(orderData.total || 0),
      reward_points_earned: Math.floor(Number(orderData.subtotal || 0) * 10),
      reward_points_used: Number(orderData.rewardPointsUsed || 0),
      reward_points_remaining: Number(orderData.rewardPointsRemaining || 0),
      status: "pending",
      customer_note: orderData.notes || null
    };

    const {data: savedOrder, error: orderError} = await ceSupabase
      .from("orders")
      .insert(orderRow)
      .select("id")
      .single();

    if(orderError) throw orderError;

    const itemRows = (orderData.items || []).map(item => ({
      order_id: savedOrder.id,
      product_name: item.name,
      quantity: Number(item.qty || 1),
      unit_price: Number(item.price || 0),
      line_total: Number(item.total || 0),
      status: "available"
    }));

    if(itemRows.length){
      const {error: itemsError} = await ceSupabase.from("order_items").insert(itemRows);
      if(itemsError) throw itemsError;
    }

    return {ok:true};
  }catch(error){
    console.error("Order save failed", error);
    return {ok:false, message:error.message || "Order save failed."};
  }
}
const CATEGORY_FILTERS = [
  {label:"All", terms:[]},
  {label:"Rice", terms:["rice", "flakes"]},
  {label:"Oil & Ghee", terms:["oil", "ghee", "gingelly"]},
  {label:"Flour & Atta", terms:["flour", "atta", "puttu", "ragi"]},
  {label:"Dals & Pulses", terms:["dals", "pulses", "dal", "dall", "dhall", "lentils", "peas", "mung", "chana", "toor", "urid"]},
  {label:"Spices", terms:["spices", "spice", "pepper", "dhania", "cumin", "mustard", "cloves", "salt", "turmeric"]},
  {label:"Masala", terms:["masala", "curry powder", "sambar", "manchurian", "tikka"]},
  {label:"Beans", terms:["beans", "chickpeas"]},
  {label:"Coconut", terms:["coconut"]},
  {label:"Sauce & Paste", terms:["sauce", "paste", "chutney", "syrup", "rose water"]},
  {label:"Snacks & Sweets", terms:["snacks", "savoury", "sweets", "candy", "bars", "roasted"]},
  {label:"Drinks", terms:["drinks", "water", "milk", "coffee", "tea"]},
  {label:"Noodles", terms:["noodles", "vermicelli"]},
  {label:"Frozen Food", terms:["frozen", "paratha"]},
  {label:"Household", terms:["household", "cleaning"]}
];
function categories(){ return CATEGORY_FILTERS.map(c => c.label); }
function stockLimit(p){
  const qty = Number(p && (p.stock_qty ?? p.units_per_case));
  return Number.isFinite(qty) && qty >= 0 ? qty : Infinity;
}

function stockLabel(p){
  const limit = stockLimit(p);
  if(!Number.isFinite(limit)) return p.stock || "In Stock";
  if(limit <= 0) return "Out of Stock";
  return `${limit} in stock`;
}

function refreshProductsFromAdminStore(){
  loadAdminProductOverrides();
}

function productKey(p){
  return String((p && (p.sku || p.id || p.name)) || "").toLowerCase().trim();
}

function mergeLatestFileProductData(savedProducts){
  if(!Array.isArray(PRODUCTS) || !Array.isArray(savedProducts)) return savedProducts;
  const fileByKey = new Map(PRODUCTS.map(p => [productKey(p), p]).filter(([key]) => key));
  return savedProducts.map(saved => {
    const fileProduct = fileByKey.get(productKey(saved));
    if(!fileProduct) return saved;
    return {
      ...saved,
      price:fileProduct.price ?? saved.price ?? 0,
      offer_price:Object.prototype.hasOwnProperty.call(fileProduct, "offer_price") ? fileProduct.offer_price : (saved.offer_price ?? null),
      stock:fileProduct.stock || saved.stock || "In Stock",
      stock_qty:fileProduct.stock_qty ?? saved.stock_qty ?? saved.units_per_case ?? 0,
      badge:fileProduct.badge ?? saved.badge ?? "",
      image:fileProduct.image || saved.image || "",
      description:cleanPublicDescription(fileProduct.description || saved.description),
      pack:fileProduct.pack || saved.pack || "",
      subcategory:fileProduct.subcategory || saved.subcategory || "",
      units_per_case:fileProduct.units_per_case ?? saved.units_per_case,
      invoice_amount:fileProduct.invoice_amount ?? saved.invoice_amount,
      invoice_qty:fileProduct.invoice_qty ?? saved.invoice_qty
    };
  });
}

function validateCartStock(showAlert = true){
  refreshProductsFromAdminStore();
  const problems = [];
  cartLines().forEach(({p, qty}) => {
    const limit = stockLimit(p);
    if(p.stock !== "In Stock" || limit <= 0){
      problems.push(`${p.name} is out of stock.`);
    }else if(Number.isFinite(limit) && qty > limit){
      problems.push(`${p.name}: only ${limit} available, but cart has ${qty}.`);
      cart[p.id] = limit;
      if(limit <= 0) delete cart[p.id];
    }
  });
  if(problems.length){
    save();
    renderCart();
    renderMostOrdered();
    renderSpecialOffers();
    renderOfferSlider();
    renderProducts();
    renderTopSearchResults();
    if(showAlert) alert("Stock updated:\n\n" + problems.join("\n"));
    return false;
  }
  return true;
}

function saveCurrentProductsToAdminStore(){
  localStorage.setItem("ce_admin_products", JSON.stringify(PRODUCTS));
}

function reduceStockAfterOrder(lines){
  lines.forEach(({p, qty}) => {
    const product = PRODUCTS.find(x => x.id === p.id);
    if(!product) return;
    const limit = stockLimit(product);
    if(!Number.isFinite(limit)) return;
    product.stock_qty = Math.max(0, limit - qty);
    if(product.stock_qty <= 0) product.stock = "Out of Stock";
  });
  saveCurrentProductsToAdminStore();
}

function updatePaymentBox(){
  const box = document.getElementById("bankDetailsBox");
  if(!box) return;
  const selected = document.querySelector("input[name='paymentMethod']:checked");
  const method = selected ? selected.value : "Cash";
  if(method !== "Bank Transfer"){
    box.innerHTML = "";
    box.style.display = "none";
    return;
  }
  box.style.display = "block";
  box.innerHTML = `
    <p><b>Bank:</b> ${escapeHtmlText(BANK_TRANSFER_DETAILS.bankName)}</p>
    <p><b>Name:</b> ${escapeHtmlText(BANK_TRANSFER_DETAILS.accountName)}</p>
    <p><b>Sort Code:</b> ${escapeHtmlText(BANK_TRANSFER_DETAILS.sortCode)}</p>
    <p><b>Account:</b> ${escapeHtmlText(BANK_TRANSFER_DETAILS.accountNumber)}</p>
    <p><b>Reference:</b> ${escapeHtmlText(BANK_TRANSFER_DETAILS.reference)}</p>`;
}

function loadAdminProductOverrides(){
  try{
    const saved = JSON.parse(localStorage.getItem("ce_admin_products") || "null");
    if(Array.isArray(saved) && saved.length && Array.isArray(PRODUCTS)){
      const cleaned = mergeLatestFileProductData(saved).map(p => ({...p, description:cleanPublicDescription(p.description)}));
      PRODUCTS.splice(0, PRODUCTS.length, ...cleaned);
      if(JSON.stringify(cleaned) !== JSON.stringify(saved)){
        localStorage.setItem("ce_admin_products", JSON.stringify(cleaned));
      }
    }
  }catch(e){
    console.warn("Could not load admin product changes", e);
  }
}

function init(){
  loadAdminProductOverrides();
  const catBox = document.getElementById("categoryButtons");
  if(catBox){
    catBox.innerHTML = "";
  }
  const sel = document.getElementById("categoryFilter");
  sel.innerHTML = categories().map(c=>`<option value="${c}">${c}</option>`).join("");
  renderMostOrdered();
  renderSpecialOffers();
  renderOfferSlider();
  renderProducts();
  updateCartCount();
  updatePaymentBox();
}
function iconFor(c){
  if(c.includes("Restaurant")) return "Food";
  if(c.includes("Grocery")) return "Grocery";
  if(c.includes("Household")) return "Home";
  if(c.includes("Pooja")) return "Pooja";
  return "Shop";
}

const SEARCH_RELATIONS = {
  puttu: ["puttu","sambal","coconut","idiyappam","ready to eat","rice flour"],
  pittu: ["puttu","sambal","coconut","idiyappam","ready to eat","rice flour"],
  pepper: ["pepper","black pepper","crushed pepper","pepper powder","cumin","mustard","rasam","masala"],
  milagu: ["pepper","black pepper","crushed pepper","pepper powder","cumin","mustard","rasam","masala"],
  fish: ["fish","fish fry","fish curry","seafood","gingelly oil"],
  chicken: ["chicken","chicken curry","chicken 65","biryani","necto"],
  biryani: ["biryani","necto","pickle","chicken","mutton"],
  lemon: ["lemon","lemon rice","pickle","rice mix"],
  coffee: ["coffee","kappi","chukku","malli","tea"]
};

function normaliseText(v){
  return String(v || "").toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
}
function productText(p){
  return normaliseText([p.name,p.category,p.subcategory,p.brand,cleanPublicDescription(p.description),p.pack].join(" "));
}
function productFilterCategory(p){
  const text = productText(p);
  const sub = normaliseText(p.subcategory);
  const cat = normaliseText(p.category);
  const name = normaliseText(p.name);
  if(cat.includes("household") || sub.includes("cleaning")) return "Household";
  if(cat.includes("frozen") || sub.includes("paratha")) return "Frozen Food";
  if(cat.includes("noodles") || text.includes("noodles") || text.includes("vermicelli")) return "Noodles";
  if(cat.includes("drinks") || text.includes("coconut water") || text.includes("milk") || text.includes("coffee") || text.includes("tea")) return "Drinks";
  if(name.includes("kings gram flour")) return "Snacks & Sweets";
  if(name.includes("heera toor dal") || name.includes("trs canned boiled chickpeas")) return "Dals & Pulses";
  if(/\boil\b/.test(text) || text.includes("ghee") || text.includes("gingelly")) return "Oil & Ghee";
  if(text.includes("flour") || text.includes("atta") || text.includes("puttu") || text.includes("ragi")) return "Flour & Atta";
  if(text.includes("dals") || text.includes("pulses") || text.includes("dal") || text.includes("dall") || text.includes("dhall") || text.includes("lentils") || text.includes("peas") || text.includes("mung") || text.includes("chana") || text.includes("toor") || text.includes("urid")) return "Dals & Pulses";
  if(text.includes("beans") || text.includes("chickpeas")) return "Beans";
  if(name.includes("biryani rice paste")) return "Spices";
  if(text.includes("masala") || text.includes("curry powder") || text.includes("sambar") || text.includes("manchurian") || text.includes("tikka")) return "Masala";
  if(text.includes("spices") || text.includes("spice") || text.includes("pepper") || text.includes("dhania") || text.includes("cumin") || text.includes("mustard") || text.includes("cloves") || text.includes("salt") || text.includes("turmeric")) return "Spices";
  if(text.includes("coconut")) return "Coconut";
  if(text.includes("sauce") || text.includes("paste") || text.includes("chutney") || text.includes("syrup") || text.includes("rose water")) return "Sauce & Paste";
  if(cat.includes("snacks") || text.includes("savoury") || text.includes("sweets") || text.includes("candy") || text.includes("bars") || text.includes("roasted")) return "Snacks & Sweets";
  if(text.includes("rice") || text.includes("flakes")) return "Rice";
  return p.category || "Grocery";
}
function productMatchesCategory(p, category){
  if(!category || category === "All") return true;
  const filter = CATEGORY_FILTERS.find(c => c.label === category);
  if(!filter) return normaliseText([p.category, p.subcategory].join(" ")).includes(normaliseText(category));
  return productFilterCategory(p) === category;
}
function searchTermsFor(q){
  const n = normaliseText(q);
  if(!n) return [];
  let terms = [n, ...n.split(" ").filter(Boolean)];
  Object.keys(SEARCH_RELATIONS).forEach(k=>{
    if(n.includes(k)) terms.push(...SEARCH_RELATIONS[k]);
  });
  return [...new Set(terms.map(normaliseText).filter(Boolean))];
}
function smartSearchProducts(query, category){
  const q = normaliseText(query);
  const terms = searchTermsFor(q);
  let rows = PRODUCTS.map(p=>{
    const text = productText(p);
    let score = 0;
    let exact = false;
    if(!q) score = 1;
    if(category !== "All" && p.category === category) score += 2;
    if(q && normaliseText(p.name).includes(q)){ score += 100; exact = true; }
    terms.forEach(t=>{
      if(normaliseText(p.name).includes(t)) score += 40;
      else if(text.includes(t)) score += 14;
    });
    // related boost by category/subcategory
    if(q.includes("puttu") && (p.subcategory.toLowerCase().includes("side") || p.name.toLowerCase().includes("sambal") || p.name.toLowerCase().includes("idiyappam"))) score += 22;
    if(q.includes("pepper") && p.subcategory.toLowerCase().includes("masala")) score += 15;
    return {...p, _score: score, _exact: exact};
  }).filter(p => ((q && p._score > 0) || productMatchesCategory(p, category)) && (q || productMatchesCategory(p, category)));
  rows.sort((a,b)=> b._score - a._score || a.name.localeCompare(b.name));
  return rows;
}


function showRestaurantFood(){
  const sel = document.getElementById("categoryFilter");
  if(sel) sel.value = "Restaurant Food";
  document.getElementById("searchInput").value = "";
  scrollToProducts();
  renderProducts();
}

function showGrocery(){
  const sel = document.getElementById("categoryFilter");
  if(sel) sel.value = "Grocery";
  document.getElementById("searchInput").value = "";
  scrollToProducts();
  renderProducts();
}

function setCategory(c){ 
  const sel = document.getElementById("categoryFilter");
  const values = [...sel.options].map(o=>o.value);
  sel.value = values.includes(c) ? c : "All";
  scrollToProducts(); 
  renderProducts(); 
}
function scrollToProducts(){ document.querySelector(".products-anchor").scrollIntoView({behavior:"smooth"}); }
function scrollToOffers(){ document.getElementById("offersSection").scrollIntoView({behavior:"smooth"}); }
function scrollToRewards(){ openCart(); }

function card(p){
  const old = p.offer_price ? `<span class="old">${money(p.price)}</span>` : "";
  const disabled = p.stock !== "In Stock";
  const qty = cart[p.id] || 0;
  const description = cleanPublicDescription(p.description);
  const qtyControl = disabled 
    ? `<button class="add" disabled>${tr("out")}</button>`
    : qty > 0 
      ? `<div class="inline-qty"><button onclick="event.stopPropagation(); changeQty(${p.id},-1)">-</button><b>${qty}</b><button onclick="event.stopPropagation(); addToCart(${p.id})">+</button></div>`
      : `<button class="add" onclick="event.stopPropagation(); addToCart(${p.id})">${tr("add")}</button>`;
  return `<div class="product-card ${disabled?'out':''} ${qty>0?'selected':''}">
    ${p.badge?`<div class="badge">${p.badge}</div>`:""}
    ${qty>0?`<div class="added-pill">${qty}</div>`:""}
    <img class="product-img clickable" src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async" onclick="openProductPage(${p.id})">
    <div class="name clickable" onclick="openProductPage(${p.id})">${p.name}</div>
    <div class="sub">${description || p.subcategory}</div>
    <div class="pack">${p.subcategory} - ${p.pack}</div>
    <div class="pack">${stockLabel(p)}</div>
    <div class="price-line"><span class="price">${money(priceOf(p))}</span>${old}</div>
    ${qtyControl}
  </div>`;
}

function renderMostOrdered(){
  document.getElementById("mostOrdered").innerHTML = PRODUCTS.slice(0,6).map(card).join("");
}

function offerCard(p){
  const description = cleanPublicDescription(p.description);
  return `<div class="offer-product-card">
    <img src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
    <div>
      <b>${p.name}</b>
      <p>${description}</p>
      <div><span class="was">Was ${money(p.price)}</span> <span class="now">Now ${money(priceOf(p))}</span></div>
      <button onclick="addToCart(${p.id})">${tr("addOffer")}</button>
    </div>
  </div>`;
}


function renderOfferSlider(){
  const box = document.getElementById("offerSlider");
  if(!box) return;
  const offers = PRODUCTS.filter(p => p.offer_price && p.stock === "In Stock");
  if(!offers.length){
    box.innerHTML = `<div class="slide active"><h2>Special Offer</h2><p>New offers coming soon.</p></div>`;
    return;
  }
  box.innerHTML = offers.map((p,i)=>`
    <div class="offer-slide ${i===0?'active':''}">
      <img src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
      <div>
        <p class="tag">SPECIAL OFFER</p>
        <h2>${p.name}</h2>
        <div class="offer-price"><span class="was">Was ${money(p.price)}</span> <span class="now">Now ${money(priceOf(p))}</span></div>
        <button onclick="addToCart(${p.id})">${tr("addOffer")}</button>
      </div>
    </div>
  `).join("");
  let idx = 0;
  clearInterval(window.offerSliderTimer);
  window.offerSliderTimer = setInterval(()=>{
    const slides = document.querySelectorAll(".offer-slide");
    if(!slides.length) return;
    slides[idx].classList.remove("active");
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add("active");
  }, 3000);
}


function renderSpecialOffers(){
  const offers = PRODUCTS.filter(p => p.offer_price && p.stock === "In Stock");
  const box = document.getElementById("specialOffersGrid");
  if(!box) return;
  box.innerHTML = offers.length ? offers.map(offerCard).join("") : "<p>No special product offers today.</p>";
}

function handleSearchInput(){
  renderTopSearchResults();
  renderProducts();
}

function renderTopSearchResults(){
  const rawQ = document.getElementById("searchInput").value.trim();
  const box = document.getElementById("searchResultsTop");
  if(!box) return;
  if(!rawQ){
    box.innerHTML = "";
    box.classList.remove("show");
    return;
  }
  const items = smartSearchProducts(rawQ, "All").slice(0,10);
  if(!items.length){
    box.innerHTML = `<div class="top-no-result">
      <b>No item found for "${rawQ}"</b>
      <p>You can add this as a requested item to your cart.</p>
      <button onclick="addSearchTextToRequestedCart()">${tr("addToCart")}</button>
    </div>`;
    box.classList.add("show");
    return;
  }
  const exact = items.filter(p=>p._exact);
  const related = items.filter(p=>!p._exact && !cart[p.id]);
  box.innerHTML = `
    ${exact.length ? `<h3>Search result</h3>${exact.map(searchResultRow).join("")}` : ""}
    ${related.length ? `<h3>Related items</h3>${related.slice(0,6).map(searchResultRow).join("")}` : ""}
  `;
  box.classList.add("show");
}

function searchResultRow(p){
  const qty = cart[p.id] || 0;
  return `<div class="search-result-row">
    <img class="clickable" src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async" onclick="openProductPage(${p.id})">
    <div><b class="clickable" onclick="openProductPage(${p.id})">${p.name}</b><br><small>${p.subcategory} - ${p.pack}</small><br><span>${money(priceOf(p))}</span></div>
    ${qty>0 ? `<div class="mini-qty"><button onclick="changeQty(${p.id},-1)">-</button><b>${qty}</b><button onclick="addToCart(${p.id})">+</button></div>` : `<button onclick="addToCart(${p.id})">${tr("add")}</button>`}
  </div>`;
}

function renderProducts(){
  const rawQ = document.getElementById("searchInput").value;
  const q = normaliseText(rawQ);
  const c = document.getElementById("categoryFilter").value;

  if(q){
    document.getElementById("productGrid").innerHTML = `<div class="search-group"><h3>${tr("search")}</h3><p>${tr("offersNote")}</p></div>`;
    return;
  }

  const items = smartSearchProducts(rawQ, c);
  document.getElementById("productGrid").innerHTML = items.map(card).join("") || `<p>${tr("cantFind")}</p>`;
}


function addSearchTextToRequestedCart(){
  const q = document.getElementById("searchInput").value.trim();
  if(!q){
    alert("Please type the item name.");
    return;
  }
  requestedCart.push({
    name: q,
    createdAt: new Date().toISOString()
  });
  save();
  renderCart();
  renderTopSearchResults();
  showToast(`${q} added to cart as requested item`);

  const box = document.getElementById("searchResultsTop");
  if(box){
    box.innerHTML = `<div class="top-no-result success">
      <b>${q}</b> has been added to your cart as a requested item.<br>
      Need another product? Type it in the search bar and add again.
      <br><br><button onclick="openCart()">View Cart</button>
    </div>`;
    box.classList.add("show");
  }
}

function fillRequestFromSearch(){
  const q = document.getElementById("searchInput").value.trim();
  document.querySelector(".request-box").scrollIntoView({behavior:"smooth"});
  setTimeout(()=>{
    const input = document.getElementById("requestName");
    if(input){ input.value = q; input.focus(); }
  },400);
}

function addToCart(id){
  refreshProductsFromAdminStore();
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p || p.stock !== "In Stock") return;
  const limit = stockLimit(p);
  const currentQty = cart[id] || 0;
  if(Number.isFinite(limit) && currentQty >= limit){
    alert(`${p.name}: only ${limit} available in stock.`);
    return;
  }
  cart[id] = currentQty + 1;
  save();
  renderCart();
  renderMostOrdered();
  renderSpecialOffers();
  renderOfferSlider();
  renderProducts();
  renderTopSearchResults();
  showToast(`${p.name} added to cart`);
}
function changeQty(id, delta){
  refreshProductsFromAdminStore();
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  const limit = stockLimit(p);
  const nextQty = (cart[id] || 0) + delta;
  if(delta > 0 && Number.isFinite(limit) && nextQty > limit){
    alert(`${p.name}: only ${limit} available in stock.`);
    return;
  }
  cart[id] = nextQty;
  if(cart[id] <= 0) {
    delete cart[id];
    if(window.recentRelatedAddedId === id) window.recentRelatedAddedId = null;
  }
  save();
  renderCart();
  renderMostOrdered();
  renderSpecialOffers();
  renderOfferSlider();
  renderProducts();
  renderTopSearchResults();
  if(p) showToast(cart[id] ? `${p.name}: ${cart[id]} in cart` : `${p.name} removed`);
}
function updateCartCount(){
  const count = Object.values(cart).reduce((a,b)=>a+b,0) + requestedCart.length + claimedRewards.length;
  document.getElementById("cartCount").innerText = count;
}
function openCart(){ document.getElementById("cartDrawer").classList.add("open"); renderCart(); }
function closeCart(){ document.getElementById("cartDrawer").classList.remove("open"); }
function cartLines(){
  return Object.entries(cart).map(([id,qty])=>({p:PRODUCTS.find(x=>x.id==id), qty})).filter(x=>x.p);
}
function subtotal(){
  return cartLines().reduce((s,x)=>s + priceOf(x.p)*x.qty,0);
}
function renderCartRewards(){
  const box = document.getElementById("cartRewardsBox");
  if(!box) return;
  const earned = earnedPoints();
  const used = usedRewardPoints();
  const available = availablePoints();

  const claimable = REWARD_CATALOG.filter(r => available >= r.points && !claimedRewards.some(c=>c.id===r.id));
  const locked = REWARD_CATALOG.filter(r => available < r.points && !claimedRewards.some(c=>c.id===r.id));
  const nextRewards = locked.slice(0,3);

  let html = `<div class="reward-balance">
    <b>Your Reward Points</b>
    <div>Points from this order: <b>${earned}</b></div>
    <div>Already used: <b>${used}</b></div>
    <div>Available to claim now: <b>${available}</b></div>
  </div>`;

  if(claimedRewards.length){
    html += `<h4>Claimed Free Items</h4>`;
    html += claimedRewards.map(r=>`<div class="claimed-reward">
      <span>${r.emoji} ${r.name}<br><small>${r.points} points used</small></span>
      <button onclick="removeReward('${r.id}')">Remove</button>
    </div>`).join("");
  }

  html += `<h4>You Can Claim Now</h4>`;
  if(claimable.length){
    html += claimable.map(r=>`<div class="reward-option">
      <div><b>${r.emoji} ${r.name}</b><br><small>${r.points} points required</small></div>
      <button onclick="claimReward('${r.id}')">Claim</button>
    </div>`).join("");
  }else{
    html += `<div class="reward-info">No free item available yet. Keep adding products to unlock rewards.</div>`;
  }

  html += `<h4>Next Rewards</h4>`;
  if(nextRewards.length){
    html += nextRewards.map(r=>{
      const need = Math.max(0, r.points - available);
      const spendNeed = Math.ceil(need / 10);
      return `<div class="reward-option locked">
        <div><b>${r.name}</b><br><small>Need ${need} more points / approx £${spendNeed} more spend</small></div>
        <button disabled>${r.points} pts</button>
      </div>`;
    }).join("");
  }else{
    html += `<div class="reward-info">All available reward levels are unlocked.</div>`;
  }

  box.innerHTML = html;
}

function earnedPoints(){
  return Math.floor(subtotal() * 10);
}

function usedRewardPoints(){
  return claimedRewards.reduce((s,r)=>s + Number(r.points || 0), 0);
}

function availablePoints(){
  return Math.max(0, earnedPoints() - usedRewardPoints());
}

function rewardValueText(r){
  const value = Number(r && (r.value || r.reward_price || r.price));
  return Number.isFinite(value) && value > 0 ? `Worth ${money(value)}` : "";
}

function claimFixedReward(id){
  const reward = FIXED_REWARDS.find(r => r.id === id);
  if(!reward) return;
  if(availablePoints() < reward.points){
    alert("Not enough points for this reward.");
    return;
  }

  claimedRewards.push({
    ...reward,
    claimId: `${reward.id}_${Date.now()}_${Math.floor(Math.random()*10000)}`
  });

  save();
  renderCart();
  showToast(`${reward.name} claimed. ${availablePoints()} points remaining`);
}

function removeReward(claimId){
  claimedRewards = claimedRewards.filter(r => r.claimId !== claimId);
  save();
  renderCart();
  showToast("Reward removed");
}

function nextUnlockReward(){
  const points = availablePoints();
  return FIXED_REWARDS.find(r => points < r.points) || null;
}

function renderCartRewards(){
  const box = document.getElementById("cartRewardsBox");
  if(!box) return;

  const earned = earnedPoints();
  const used = usedRewardPoints();
  const available = availablePoints();
  const next = nextUnlockReward();

  let html = `<div class="reward-summary-card">
    <div class="reward-summary-title">Free Gift Rewards</div>
    <div class="reward-line"><span>Total points from this order</span><b>${earned}</b></div>
    <div class="reward-line"><span>Points used for gifts</span><b>${used}</b></div>
    <div class="reward-line strong"><span>Points remaining</span><b>${available}</b></div>
  `;

  if(claimedRewards.length){
    html += `<h4>Claimed Free Gifts</h4>`;
    html += `<div class="claimed-gift-grid">`;
    html += claimedRewards.map(r=>`<div class="claimed-gift-card">
      <img src="${r.image}" alt="${r.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
      <div><b>${r.name}</b><br><small>${r.points} points used${rewardValueText(r) ? ` / ${rewardValueText(r)} free` : ""}</small></div>
      <button onclick="removeReward('${r.claimId}')">Remove</button>
    </div>`).join("");
    html += `</div>`;
  }

  html += `<h4>Choose Free Gifts</h4>
  <p class="reward-help">You can claim again and again while you have enough points.</p>
  <div class="gift-grid">`;

  html += FIXED_REWARDS.map(r=>{
    const can = available >= r.points;
    return `<div class="gift-card ${can?'':'locked'}">
      <img src="${r.image}" alt="${r.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
      <b>${r.name}</b>
      ${rewardValueText(r) ? `<small class="gift-value">${rewardValueText(r)} free</small>` : ""}
      <span>${r.points} points</span>
      <button ${can?'':'disabled'} onclick="claimFixedReward('${r.id}')">${can?'Claim Free':'Locked'}</button>
    </div>`;
  }).join("");

  html += `</div>`;

  if(next){
    const need = next.points - available;
    const spendNeed = Math.ceil(need / 10);
    const progress = Math.max(0, Math.min(100, Math.round((available / next.points) * 100)));
    html += `<div class="next-reward-box">
      <img src="${next.image}" alt="${next.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
      <div><b>Next Gift</b><br><span>${next.name}</span>${rewardValueText(next) ? `<br><small>${rewardValueText(next)} free</small>` : ""}<br><small>Need ${need} more points / approx £${spendNeed} more spend</small></div>
    </div>
    <div class="reward-progress"><div style="width:${progress}%"></div></div>
    <div class="reward-progress-label">${available} / ${next.points} remaining points</div>`;
  }else{
    html += `<div class="next-reward-box">
      <div><b>All gift levels unlocked with remaining points.</b><br><span>You can keep claiming while points are available.</span></div>
    </div>`;
  }

  html += `<div class="reward-ladder">
    <b>Reward List</b>
    ${FIXED_REWARDS.map(r => `<div class="${available >= r.points ? 'unlocked' : 'locked'}">
      <span>${r.points} pts</span><span>${r.name}${rewardValueText(r) ? `<br><small>${rewardValueText(r)}</small>` : ""}</span>
    </div>`).join("")}
  </div>`;

  html += `</div>`;
  box.innerHTML = html;
}

function renderCart(){
  const lines = cartLines();
  const productHtml = lines.map(x=>`<div class="cart-item">
    <img class="mini-img" src="${x.p.image}" alt="${x.p.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
    <div><b>${x.p.name}</b><br><small>${money(priceOf(x.p))}</small><br><span class="qty"><button onclick="changeQty(${x.p.id},-1)">-</button> ${x.qty} <button onclick="changeQty(${x.p.id},1)">+</button></span></div>
    <b>${money(priceOf(x.p)*x.qty)}</b>
  </div>`).join("");

  const requestedHtml = requestedCart.map((r,i)=>`<div class="cart-item requested-item">
    <div class="request-icon">?</div>
    <div><b>${r.name}</b><br><small>Requested item - Price to be confirmed</small></div>
    <button class="remove-request" onclick="removeRequestedItem(${i})">Remove</button>
  </div>`).join("");

  const rewardHtml = claimedRewards.map(r=>`<div class="cart-item reward-cart-item">
    <img class="mini-img" src="${r.image}" alt="${r.name}" referrerpolicy="no-referrer" loading="lazy" decoding="async">
    <div><b>${r.name}</b><br><small>Free gift - ${r.points} points used</small></div>
    <b>FREE</b>
  </div>`).join("");

  document.getElementById("cartItems").innerHTML = (productHtml + requestedHtml + rewardHtml) || `<p style='padding:15px'>${tr("emptyCart")}</p>`;
  document.getElementById("subtotal").innerText = money(subtotal());
  document.getElementById("pointsEarned").innerText = tr("rewardPoints") + ": " + earnedPoints();
  renderCartRewards();
  updateDelivery();
}

function normalisePostcode(pc){
  return String(pc || "").toUpperCase().replace(/\s+/g," ").trim();
}

function estimateDistanceFromPostcode(postcode){
  const pc = normalisePostcode(postcode).replace(/\s/g,"");
  if(!pc) return null;

  // Prototype distance estimate from:
  // 203 Willows Lane, Bolton, BL3 4AZ
  if(pc.startsWith("BL3")) return 2.0;
  if(pc.startsWith("BL1") || pc.startsWith("BL2") || pc.startsWith("BL4") || pc.startsWith("BL5")) return 3.0;
  if(pc.startsWith("BL6") || pc.startsWith("BL7")) return 7.0;
  if(pc.startsWith("WN")) return 9.5;
  if(pc.startsWith("M")) return 14.0;
  if(pc.startsWith("WA")) return 18.0;
  if(pc.startsWith("L")) return 24.0;

  return 25.0;
}

function deliveryChargeByRules(distance, orderValue){
  if(distance === null || isNaN(distance)){
    return {allowed:false, charge:0, message:"Please enter a valid postcode and click Check Postcode."};
  }

  if(distance <= 3){
    if(orderValue >= 50){
      return {allowed:true, charge:0, message:"Delivery available. Within 3 miles and order is £50+, so delivery is FREE."};
    }
    return {allowed:true, charge:3, message:"Delivery available. Within 3 miles. Delivery charge is £3. Spend £50+ for free delivery."};
  }

  if(distance <= 10){
    if(orderValue >= 200){
      return {allowed:true, charge:0, message:"Delivery available. Within 10 miles and order is £200+, so delivery is FREE."};
    }
    return {allowed:true, charge:10, message:"Delivery available. 3-10 miles. Delivery charge is £10. Spend £200+ for free delivery."};
  }

  if(distance <= 20){
    if(orderValue >= 200){
      return {allowed:true, charge:10, message:"Delivery available. 10-20 miles and order is £200+, delivery charge is £10."};
    }
    return {allowed:false, charge:0, message:"Delivery is not available for this postcode unless order is £200+. Collection only for this order."};
  }

  return {allowed:false, charge:0, message:"This postcode is outside our delivery area. Collection only from 203 Willows Lane, Bolton, BL3 4AZ."};
}

function checkPostcodeDistance(){
  const input = document.getElementById("postcode");
  const pc = input ? input.value : "";
  const resultBox = document.getElementById("postcodeResult");
  checkedPostcode = normalisePostcode(pc);
  checkedDistanceMiles = estimateDistanceFromPostcode(checkedPostcode);

  if(!checkedPostcode){
    checkedDistanceMiles = null;
    if(resultBox){
      resultBox.innerHTML = "Please enter a postcode.";
      resultBox.className = "postcode-result show no";
    }
    updateDelivery();
    return;
  }

  const rule = deliveryChargeByRules(checkedDistanceMiles, subtotal());
  if(resultBox){
    resultBox.innerHTML = `
      <b>Postcode:</b> ${checkedPostcode}<br>
      <b>Estimated Distance from Collection Point:</b> ${checkedDistanceMiles.toFixed(1)} miles<br>
      <span>${rule.message}</span>
    `;
    resultBox.className = "postcode-result show " + (rule.allowed ? "ok" : "no");
  }
  updateDelivery();
}


function updateDelivery(){
  const type = document.querySelector("input[name='orderType']:checked").value;
  const sub = subtotal();
  let charge = 0;
  let msg = "";
  let allowed = true;

  const deliveryNotice = document.getElementById("deliveryNoticeBox");
  const addressBox = document.getElementById("address");
  const postcodeBox = document.getElementById("postcode");

  if(type === "Collection"){
    if(deliveryNotice) deliveryNotice.style.display = "none";
    if(addressBox){
      addressBox.style.display = "none";
      addressBox.value = "";
      addressBox.required = false;
    }
    if(postcodeBox){
      postcodeBox.style.display = "none";
      postcodeBox.value = "";
      postcodeBox.required = false;
    }
    msg = "Collection selected. Name and WhatsApp number only. Collection point: 203 Willows Lane, Bolton, BL3 4AZ. Collection time will be confirmed via WhatsApp.";
    document.getElementById("deliveryCharge").innerText = money(0);
  }else{
    if(deliveryNotice) deliveryNotice.style.display = "block";
    if(addressBox){
      addressBox.style.display = "block";
      addressBox.required = true;
    }
    if(postcodeBox){
      postcodeBox.style.display = "block";
      postcodeBox.required = true;
    }
    msg = tr("deliverySelected");
    document.getElementById("deliveryCharge").innerText = tr("mayApply");
  }

  document.getElementById("deliveryMsg").innerText = msg;
  document.getElementById("total").innerText = money(sub);
  return {allowed, charge, total: sub, msg};
}

function createOrderId(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  const rand = Math.floor(1000 + Math.random()*9000);
  return `CE-${y}${m}${day}-${rand}`;
}

function clearCartAfterOrder(){
  cart = {};
  requestedCart = [];
  claimedRewards = [];
  save();
  renderCart();
  renderProducts();
  renderMostOrdered();

  // Close cart drawer
  const drawer = document.getElementById("cartDrawer");
  if(drawer) drawer.classList.remove("open");

  // Return to home/top page
  window.scrollTo({top:0, behavior:"smooth"});

  // Clear checkout fields except persistent UI
  ["customerName","whatsappNumber","postcode","address","notes"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  showToast("Order sent. Cart cleared.");
}

async function sendWhatsAppOrder(){
  try{
    if(!validateCartStock(true)) return;
    const lines = cartLines();
    if(!lines.length && !requestedCart.length && !claimedRewards.length){
      alert("Cart is empty");
      return;
    }

    const d = updateDelivery();
    const type = document.querySelector("input[name='orderType']:checked").value;

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("whatsappNumber").value.trim();
    const postcodeEl = document.getElementById("postcode");
    const postcode = postcodeEl ? postcodeEl.value.trim() : "";
    const address = document.getElementById("address").value.trim();
    const notes = document.getElementById("notes").value.trim();
    const paymentEl = document.querySelector("input[name='paymentMethod']:checked");
    const paymentMethod = paymentEl ? paymentEl.value : "Cash";

    if(!name || !phone){
      alert("Please enter customer name and WhatsApp number.");
      return;
    }

    if(type === "Delivery"){
      if(!postcode){
        alert("Please enter delivery postcode.");
        return;
      }
      if(!address){
        alert("Please enter full delivery address.");
        return;
      }
    }

    const rewardPointsUsed = typeof usedRewardPoints === "function" ? usedRewardPoints() : claimedRewards.reduce((s,r)=>s + Number(r.points || 0),0);
    const rewardPointsRemaining = typeof availablePoints === "function" ? availablePoints() : Math.max(0, Math.floor(subtotal()*10) - rewardPointsUsed);

    const orderId = createOrderId();

    const orderData = {
      orderId: orderId,
      name: name,
      phone: phone,
      postcode: postcode,
      deliveryDistanceMiles: checkedDistanceMiles,
      type: type,
      address: address,
      notes: notes,
      items: lines.map(x => ({
        name: x.p.name,
        qty: x.qty,
        price: priceOf(x.p),
        total: priceOf(x.p) * x.qty
      })),
      requestedItems: requestedCart.map(x => x.name),
      rewards: claimedRewards.map(x => ({
        name: x.name,
        points: x.points,
        emoji: x.emoji || "Gift",
        image: x.image || ""
      })),
      rewardPointsUsed: rewardPointsUsed,
      rewardPointsRemaining: rewardPointsRemaining,
      paymentMethod: paymentMethod,
      bankDetails: paymentMethod === "Bank Transfer" ? BANK_TRANSFER_DETAILS : null,
      collectionInfo: STORE_COLLECTION_INFO,
      subtotal: subtotal(),
      delivery: d.charge || 0,
      total: d.total || subtotal()
    };

    const saveResult = await saveOrderToSupabase(orderData);
    if(!saveResult.ok){
      alert("Order WhatsApp message will open, but the admin dashboard may not update because the order could not save to Supabase: " + saveResult.message);
    }

    let encoded = "";
    try{
      encoded = btoa(unescape(encodeURIComponent(JSON.stringify(orderData))));
    }catch(e){
      encoded = btoa(JSON.stringify(orderData));
    }

    const basePath = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}`;
    const orderPageLink = `${basePath}customer_order.html?view=items-only&data=${encodeURIComponent(encoded)}`;

    let msg = `CHENNAI EXPRESS - MY ORDER\n`;
    msg += `--------------------\n\n`;
    msg += `Customer: ${name}\n`;
    msg += `WhatsApp: ${phone}\n`;
    if(postcode) msg += `Postcode: ${postcode}\n`;
    msg += `Order Type: ${type}\n`;
    if(address) msg += `Address: ${address}\n`;

    if(lines.length){
      msg += `\nORDER ITEMS\n`;
      msg += `--------------------\n`;
      lines.forEach((x,i)=> {
        msg += `${i+1}. ${x.qty} x ${x.p.name}\n`;
        msg += `   ${money(priceOf(x.p))} each = ${money(priceOf(x.p)*x.qty)}\n`;
      });
    }

    if(requestedCart.length){
      msg += `\nCUSTOMER REQUESTED ITEMS\n`;
      msg += `--------------------\n`;
      requestedCart.forEach((r,i)=> {
        msg += `${i+1}. ${r.name} - Price to be confirmed\n`;
      });
    }

    if(claimedRewards.length){
      msg += `\nFREE GIFTS CLAIMED\n`;
      msg += `--------------------\n`;
      claimedRewards.forEach((r,i)=> {
        msg += `${i+1}. ${r.name} - FREE (${r.points} points used)\n`;
      });
      msg += `\nReward Points Used: ${rewardPointsUsed}\n`;
      msg += `Reward Points Remaining: ${rewardPointsRemaining}\n`;
    }

    msg += `\nSUMMARY\n`;
    msg += `--------------------\n`;
    msg += `Subtotal: ${money(subtotal())}\n`;
    msg += `Delivery: ${type === "Delivery" ? "May apply - to be confirmed" : money(0)}\n`;
    msg += `TOTAL: ${money((d.total || subtotal()))}\n`;
    if(requestedCart.length) msg += `Requested items are not included in total.\n`;
    msg += `\nPayment Method: ${paymentMethod}\n`;
    if(paymentMethod === "Bank Transfer"){
      msg += `\nBANK TRANSFER DETAILS\n`;
      msg += `Bank Name: ${BANK_TRANSFER_DETAILS.bankName}\n`;
      msg += `Account Name: ${BANK_TRANSFER_DETAILS.accountName}\n`;
      msg += `Sort Code: ${BANK_TRANSFER_DETAILS.sortCode}\n`;
      msg += `Account Number: ${BANK_TRANSFER_DETAILS.accountNumber}\n`;
      msg += `Reference: ${BANK_TRANSFER_DETAILS.reference}\n`;
    }
    if(notes) msg += `Notes: ${notes}\n`;
    msg += `\nThis is my order:\n${orderPageLink}\n`;
    msg += `\nThank you.`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    alert(`Order sent. Order ID: ${orderId}`);
    reduceStockAfterOrder(lines);
    clearCartAfterOrder();
  }catch(error){
    console.error(error);
    alert("Sorry, WhatsApp order could not be created. Please check the cart details and try again.");
  }
}
function addRequestedItemToCart(){
  const input = document.getElementById("requestName");
  const item = input ? input.value.trim() : "";
  if(!item){
    alert("Please type the item name.");
    if(input) input.focus();
    return;
  }
  requestedCart.push({name:item, createdAt:new Date().toISOString()});
  if(input){ input.value=""; input.focus(); }
  save();
  renderCart();
  const msgBox = document.getElementById("requestAddedMsg");
  if(msgBox){
    msgBox.innerHTML = `<b>${item}</b> has been added to your cart as a requested item.<br>Need another product? Type it above and add again.`;
    msgBox.classList.add("show");
  }
  showToast(`${item} added to cart as requested item`);
}

function removeRequestedItem(index){
  requestedCart.splice(index,1);
  save();
  renderCart();
  showToast("Requested item removed");
}


function relatedProductsFor(p){
  const words = normaliseText([p.name, p.subcategory, cleanPublicDescription(p.description)].join(" ")).split(" ").filter(w=>w.length>3);
  // Do not show items already added to cart in Related Items
  let scored = PRODUCTS.filter(x=>x.id!==p.id && (!cart[x.id] || x.id===window.recentRelatedAddedId)).map(x=>{
    const t = productText(x);
    let score = 0;
    if(x.category === p.category) score += 4;
    if(x.subcategory === p.subcategory) score += 10;
    words.forEach(w=>{ if(t.includes(w)) score += 3; });
    return {...x, _relScore: score};
  }).filter(x=>x._relScore>3);
  scored.sort((a,b)=>b._relScore-a._relScore);
  return scored.slice(0,6);
}

function openProductPage(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  let modal = document.getElementById("productModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "productModal";
    modal.className = "product-modal";
    document.body.appendChild(modal);
  }
  const qty = cart[p.id] || 0;
  const old = p.offer_price ? `<span class="detail-old">${money(p.price)}</span>` : "";
  const related = relatedProductsFor(p);
  const description = cleanPublicDescription(p.description);
  modal.innerHTML = `
    <div class="product-detail" id="productDetailContent">
      <div class="detail-header">
        <button onclick="closeProductPage()">Back</button>
        <button onclick="closeProductPage()">X</button>
      </div>
      <img class="detail-img" src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" decoding="async">
      ${p.badge ? `<div class="detail-badge">${p.badge}</div>` : ""}
      <h1>${p.name}</h1>
      <p class="detail-category">${p.category} - ${p.subcategory} - ${p.pack}</p>
      <div class="detail-price">${old}<span>${money(priceOf(p))}</span></div>
      <p class="detail-stock">${stockLabel(p)}</p>
      <p class="detail-desc">${description}</p>
      <div class="detail-actions">
        ${p.stock !== "In Stock" 
          ? `<button class="disabled-detail" disabled>${tr("outOfStock")}</button>`
          : qty > 0
            ? `<div class="detail-qty"><button onclick="changeQty(${p.id},-1); refreshProductPageTop(${p.id})">-</button><b>${qty}</b><button onclick="addToCart(${p.id}); refreshProductPageTop(${p.id})">+</button></div>`
            : `<button class="detail-add" onclick="addToCart(${p.id}); refreshProductPageTop(${p.id})">${tr("addToCart")}</button>`
        }
        <div class="detail-added-note">Cart updates automatically</div>
      </div>
      <h2>Related Items</h2>
      <div class="detail-related">
        ${related.length ? related.map(relatedCard).join("") : "<p>No related items found.</p>"}
      </div>
    </div>
  `;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  modal.scrollTop = 0;
  const detail = document.getElementById("productDetailContent");
  if(detail) detail.scrollTop = 0;
  window.currentProductDetailId = id;
}

function relatedCard(r){
  const qty = cart[r.id] || 0;
  return `
    <div class="related-card ${qty>0?'selected-related':''}">
      ${qty>0?`<div class="related-added">${qty}</div>`:""}
      <img src="${r.image}" referrerpolicy="no-referrer" loading="lazy" decoding="async" onclick="openProductPageFromRelated(${r.id})">
      <b onclick="openProductPageFromRelated(${r.id})">${r.name}</b>
      <span>${money(priceOf(r))}</span>
      ${qty>0 
        ? `<div class="related-qty">
            <button onclick="event.stopPropagation(); window.recentRelatedAddedId=${r.id}; changeQty(${r.id},-1); refreshProductPageKeepRelated(window.currentProductDetailId)">-</button>
            <b>${qty}</b>
            <button onclick="event.stopPropagation(); window.recentRelatedAddedId=${r.id}; addToCart(${r.id}); refreshProductPageKeepRelated(window.currentProductDetailId)">+</button>
          </div>`
        : `<button onclick="event.stopPropagation(); window.recentRelatedAddedId=${r.id}; addToCart(${r.id}); refreshProductPageKeepRelated(window.currentProductDetailId)">${tr("add")}</button>`
      }
    </div>
  `;
}

function refreshProductPageTop(id){
  const modal = document.getElementById("productModal");
  if(id && modal && modal.classList.contains("show")){
    openProductPage(id);
    modal.scrollTop = 0;
    setTimeout(()=>{
      const detail = document.getElementById("productDetailContent");
      if(detail) detail.scrollTop = 0;
    },0);
  }
}

function refreshProductPageKeepRelated(id){
  const modal = document.getElementById("productModal");
  if(id && modal && modal.classList.contains("show")){
    openProductPage(id);
    setTimeout(()=>{
      const heading = [...document.querySelectorAll(".product-detail h2")].find(h=>h.innerText.includes("Related"));
      if(heading) heading.scrollIntoView({behavior:"auto", block:"start"});
    },0);
  }
}

function refreshProductPage(id){
  const modal = document.getElementById("productModal");
  if(id && modal && modal.classList.contains("show")){
    const keepTop = modal.scrollTop < 120;
    openProductPage(id);
    if(!keepTop){
      setTimeout(()=>{
        const heading = [...document.querySelectorAll(".product-detail h2")].find(h=>h.innerText.includes("Related"));
        if(heading) heading.scrollIntoView({behavior:"instant", block:"start"});
      },0);
    }
  }
}

function openProductPageFromRelated(id){
  openProductPage(id);
  const modal = document.getElementById("productModal");
  if(modal) modal.scrollTop = 0;
  setTimeout(()=>{
    const detail = document.getElementById("productDetailContent");
    if(detail) detail.scrollTop = 0;
  },0);
}

function closeProductPage(){
  const modal = document.getElementById("productModal");
  if(modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

function contactUsWhatsApp(){
  const msg = "Hello Chennai Express, I need help with my order.";
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
}


function toggleMenu(){
  const menu = document.getElementById("quickMenu");
  if(menu){ menu.remove(); return; }
  const m = document.createElement("div");
  m.id = "quickMenu";
  m.className = "quick-menu";
  const categoryButtons = categories()
    .filter(c => c !== "All")
    .map(c => `<button class="menu-category" onclick="setCategory('${c}'); toggleMenu()">${c}</button>`)
    .join("");
  m.innerHTML = `
    <button onclick="setCategory('Restaurant Food'); toggleMenu()">Restaurant Food</button>
    <div class="menu-category-title">Product Categories</div>
    <div class="menu-category-grid">${categoryButtons}</div>
    <button onclick="scrollToOffers(); toggleMenu()">Offers</button>
    <button onclick="document.querySelector('.request-box').scrollIntoView({behavior:'smooth'}); toggleMenu()">Request Item</button>
    <button class="contact-menu-btn" onclick="contactUsWhatsApp(); toggleMenu()">Contact Us on WhatsApp</button>
  `;
  document.body.appendChild(m);
}

function showToast(text){
  let t = document.getElementById("toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.innerText = text;
  t.className = "toast show";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(()=>{ t.className = "toast"; }, 1800);
}

init();



