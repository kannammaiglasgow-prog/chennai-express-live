
let products = [];
let pendingImageUpload = null;
const ADMIN_PRODUCTS_STORAGE_KEY = "ce_admin_products";
const ADMIN_REWARDS_STORAGE_KEY = "ce_rewards";
const DEFAULT_SUPPLIER = "Shanker & Co";
function showAdminError(message){
  const box = document.getElementById("adminError");
  if(box){
    box.textContent = message;
    box.classList.add("show");
  }else{
    alert(message);
  }
}

window.addEventListener("error", event => {
  if(event.target && event.target.tagName === "IMG") return;
  showAdminError("Admin page error: " + (event.message || "Please refresh."));
});

window.addEventListener("unhandledrejection", event => {
  const reason = event.reason;
  showAdminError("Admin page error: " + ((reason && reason.message) || "Please refresh."));
});

let orders = [
  {
    order_id:"CE-DEMO-0001",
    customer_name:"Demo Customer",
    whatsapp_number:"07300000000",
    order_type:"Collection",
    payment_method:"Cash",
    status:"pending",
    collection_date:"",
    collection_time:"",
    delivery_date:"",
    delivery_time:"",
    admin_note:"",
    subtotal:28.97,
    delivery_charge:0,
    total:28.97,
    reward_points_used:500,
    reward_points_remaining:0,
    items:[
      {name:"Chicken Biryani", qty:2, price:8.99, total:17.98, status:"available"},
      {name:"Gingelly Oil 1L", qty:1, price:5.99, total:5.99, status:"available"},
      {name:"Chicken Roll", qty:2, price:2.50, total:5.00, status:"available"}
    ],
    removed_items:[],
    rewards:[
      {name:"Free Chicken Roll", points:500, emoji:"ðŸŒ¯"}
    ]
  }
];

let customers = [];
let rewards = loadSavedRewards() || [
  {id:"free_chicken_roll_0", points_required:500, reward_name:"Puli Satham 500ml Box", reward_price:4.99, emoji:"", image:"https://rakskitchen.net/wp-content/uploads/2014/05/14097742883_de6b965cb9_z-500x375.jpg"},
  {id:"free_1kg_puttu_1", points_required:1000, reward_name:"1 Chicken biryani 500ml box", reward_price:9.99, emoji:"", image:"https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Chicken-Biryani-Recipe.jpg"},
  {id:"free_chicken_biryani_2", points_required:2000, reward_name:"1kg Chicken Biryani", reward_price:18.99, emoji:"", image:"https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Chicken-Biryani-Recipe.jpg"},
  {id:"free_gingelly_oil_3", points_required:3000, reward_name:"Free Gingelly Oil", reward_price:0, emoji:"", image:""}
];
function showTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function statusBadge(status){
  return `<span class="badge ${status}">${String(status || "").replace("_"," ")}</span>`;
}

function imageSrc(path){
  if(!path) return "";
  if(path.startsWith("http") || path.startsWith("data:")) return path;
  if(path.startsWith("../")) return path;
  return "../" + path;
}

document.addEventListener("error", function(event){
  const img = event.target;
  if(!img || img.tagName !== "IMG" || img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "true";
  const fallback = document.createElement("div");
  fallback.className = `${img.className || ""} image-placeholder admin-img-fallback`.trim();
  fallback.textContent = img.alt || "No Image";
  img.replaceWith(fallback);
}, true);

function escapeHtml(v){
  return String(v || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function cleanText(value){
  const text = String(value || "").trim();
  return text || null;
}

function cleanPublicDescription(value){
  return String(value || "")
    .replace(/\s*Price includes 40% profit from invoice cost\./gi, "")
    .trim();
}

function numberOrNull(value){
  if(value === null || value === undefined) return null;
  const text = String(value).trim();
  if(text === "") return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function isSpecialOfferProduct(p){
  return !!(p && (p.is_special_offer || p.badge === "Special Offer") && p.offer_price);
}

function effectiveProductPrice(p){
  return isSpecialOfferProduct(p) ? Number(p.offer_price || 0) : Number(p.normal_price || p.price || 0);
}

function hasOwnValue(obj, key){
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function keepSaved(saved, fileProduct, key, fallback = ""){
  return hasOwnValue(saved, key) ? saved[key] : (fileProduct && hasOwnValue(fileProduct, key) ? fileProduct[key] : fallback);
}

function dbProductToAdmin(p){
  return {
    db_id:p.id,
    sku:p.sku || "",
    name:p.name || "",
    category:p.category || "",
    subcategory:p.subcategory || "",
    description:cleanPublicDescription(p.description),
    price:Number(p.price || 0),
    normal_price:Number(p.price || 0),
    offer_price:p.offer_price,
    pack_size:p.pack_size || "",
    image:p.image_url || "",
    stock_qty:Number(p.stock_qty || 0),
    stock_status:p.stock_status || "in_stock",
    is_best_seller:!!p.is_best_seller,
    is_special_offer:!!p.is_special_offer,
    allergy_information:p.allergy_information || "",
    ingredients:p.ingredients || "",
    is_vegetarian:p.is_vegetarian || "",
    is_halal:p.is_halal || "",
    supplier:p.supplier || p.purchase_source || DEFAULT_SUPPLIER
  };
}

function localProductToAdmin(p){
  return {
    db_id:null,
    frontend_id:p.id || null,
    sku:p.sku || `LOCAL-${p.id || ""}`,
    name:p.name || "",
    category:p.category || "",
    subcategory:p.subcategory || "",
    description:cleanPublicDescription(p.description),
    price:Number(p.normal_price || p.price || 0),
    normal_price:Number(p.normal_price || p.price || 0),
    offer_price:p.offer_price || null,
    pack_size:p.pack || p.pack_size || "",
    image:p.image || "",
    stock_qty:Number(p.stock_qty || p.units_per_case || 1),
    stock_status:p.stock_status || (p.stock === "Out of Stock" ? "out_of_stock" : "in_stock"),
    is_best_seller:!!p.is_best_seller || p.badge === "Best Seller",
    is_special_offer:!!p.is_special_offer || p.badge === "Special Offer",
    invoice_amount:p.invoice_amount,
    invoice_qty:p.invoice_qty,
    units_per_case:p.units_per_case,
    allergy_information:p.allergy_information || "",
    ingredients:p.ingredients || "",
    is_vegetarian:p.is_vegetarian || "",
    is_halal:p.is_halal || "",
    supplier:p.supplier || p.purchase_source || DEFAULT_SUPPLIER
  };
}

function adminProductToFrontend(p, index){
  const normalPrice = numberOrNull(p.normal_price) ?? numberOrNull(p.price) ?? 0;
  const offerPrice = p.is_special_offer ? numberOrNull(p.offer_price) : null;
  return {
    id:p.frontend_id || p.id || index + 1,
    sku:p.sku || `CE-${String(index + 1).padStart(3,"0")}`,
    name:p.name || "",
    category:p.category || "Grocery",
    subcategory:p.subcategory || "",
    price:normalPrice,
    normal_price:normalPrice,
    offer_price:offerPrice,
    pack:p.pack_size || p.pack || "",
    pack_size:p.pack_size || p.pack || "",
    stock:p.stock_status === "out_of_stock" ? "Out of Stock" : "In Stock",
    stock_status:p.stock_status || "in_stock",
    stock_qty:Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0,
    badge:p.is_special_offer ? "Special Offer" : (p.is_best_seller ? "Best Seller" : ""),
    is_best_seller:!!p.is_best_seller,
    is_special_offer:!!p.is_special_offer,
    emoji:"ðŸ›’",
    description:cleanPublicDescription(p.description),
    image:p.image || "",
    invoice_amount:p.invoice_amount,
    invoice_qty:p.invoice_qty,
    units_per_case:p.units_per_case,
    supplier:p.supplier || p.purchase_source || DEFAULT_SUPPLIER,
    allergy_information:p.allergy_information || "",
    ingredients:p.ingredients || "",
    is_vegetarian:p.is_vegetarian || "",
    is_halal:p.is_halal || ""
  };
}

function productKey(p){
  return String((p && (p.sku || p.id || p.frontend_id || p.name)) || "").toLowerCase().trim();
}

function mergeLatestFileProductData(savedProducts){
  const fileProducts = typeof PRODUCTS !== "undefined" ? PRODUCTS : window.PRODUCTS;
  if(!Array.isArray(fileProducts) || !Array.isArray(savedProducts)) return savedProducts;
  const fileByKey = new Map(fileProducts.map(p => [productKey(p), p]).filter(([key]) => key));
  const merged = savedProducts.map(saved => {
    const fileProduct = fileByKey.get(productKey(saved));
    if(!fileProduct) return saved;
    return {
      ...saved,
      category:keepSaved(saved, fileProduct, "category", "Grocery"),
      subcategory:keepSaved(saved, fileProduct, "subcategory", ""),
      price:keepSaved(saved, fileProduct, "price", 0),
      normal_price:keepSaved(saved, fileProduct, "normal_price", saved.price ?? fileProduct.price ?? 0),
      offer_price:keepSaved(saved, fileProduct, "offer_price", null),
      stock:keepSaved(saved, fileProduct, "stock", "In Stock"),
      stock_qty:keepSaved(saved, fileProduct, "stock_qty", saved.units_per_case ?? fileProduct.units_per_case ?? 0),
      stock_status:keepSaved(saved, fileProduct, "stock_status", fileProduct.stock === "Out of Stock" ? "out_of_stock" : "in_stock"),
      badge:keepSaved(saved, fileProduct, "badge", ""),
      is_best_seller:!!keepSaved(saved, fileProduct, "is_best_seller", false),
      is_special_offer:!!keepSaved(saved, fileProduct, "is_special_offer", false) || keepSaved(saved, fileProduct, "badge", "") === "Special Offer",
      image:keepSaved(saved, fileProduct, "image", ""),
      description:cleanPublicDescription(keepSaved(saved, fileProduct, "description", "")),
      pack:keepSaved(saved, fileProduct, "pack", ""),
      pack_size:keepSaved(saved, fileProduct, "pack_size", saved.pack || fileProduct.pack || ""),
      units_per_case:keepSaved(saved, fileProduct, "units_per_case", undefined),
      invoice_amount:keepSaved(saved, fileProduct, "invoice_amount", undefined),
      invoice_qty:keepSaved(saved, fileProduct, "invoice_qty", undefined),
      supplier:keepSaved(saved, fileProduct, "supplier", saved.purchase_source || DEFAULT_SUPPLIER),
      allergy_information:keepSaved(saved, fileProduct, "allergy_information", ""),
      ingredients:keepSaved(saved, fileProduct, "ingredients", ""),
      is_vegetarian:keepSaved(saved, fileProduct, "is_vegetarian", ""),
      is_halal:keepSaved(saved, fileProduct, "is_halal", "")
    };
  });
  const savedKeys = new Set(merged.map(productKey).filter(Boolean));
  fileProducts.forEach(fileProduct => {
    const key = productKey(fileProduct);
    if(key && !savedKeys.has(key)){
      merged.push(fileProduct);
      savedKeys.add(key);
    }
  });
  return merged;
}

function saveProductsToLocalStore(){
  const frontendProducts = products.map(adminProductToFrontend);
  localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(frontendProducts));
}

function loadSavedFrontendProducts(){
  try{
    const saved = JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY) || "null");
    if(!Array.isArray(saved) || !saved.length) return null;
    const merged = mergeLatestFileProductData(saved);
    if(JSON.stringify(merged) !== JSON.stringify(saved)){
      localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  }catch(e){
    console.warn("Could not load saved admin products", e);
    return null;
  }
}

function exportLocalProducts(){
  saveProductsToLocalStore();
  const data = localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY) || "[]";
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chennai-express-local-products.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  let box = document.getElementById("localExportBox");
  if(!box){
    box = document.createElement("div");
    box.id = "localExportBox";
    box.className = "card";
    const productList = document.getElementById("productList");
    if(productList && productList.parentElement){
      productList.parentElement.insertBefore(box, productList);
    }else{
      document.body.appendChild(box);
    }
  }
  box.innerHTML = `
    <b>Local product data is ready.</b>
    <p>If the download did not start, use this backup link or copy the text below.</p>
    <p><a href="${url}" download="chennai-express-local-products.json">Download product data JSON</a></p>
    <textarea readonly style="width:100%;height:120px">${escapeHtml(data)}</textarea>`;
  alert("Export ready. If download did not start, use the download link shown on the Products page.");
}

function importLocalProducts(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const imported = JSON.parse(reader.result);
      if(!Array.isArray(imported) || !imported.length){
        alert("Import file does not contain products.");
        return;
      }
      localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(imported));
      products = imported.map(localProductToAdmin);
      renderProducts();
      renderDashboard();
      alert("Imported. Open or refresh the shop page in this browser.");
    }catch(e){
      alert("Import failed. Please choose the exported product JSON file.");
    }
  };
  reader.readAsText(file);
}

function loadLocalProductsFallback(message){
  const fileProducts = typeof PRODUCTS !== "undefined" ? PRODUCTS : window.PRODUCTS;
  const sourceProducts = loadSavedFrontendProducts() || fileProducts;
  if(Array.isArray(sourceProducts) && sourceProducts.length){
    products = sourceProducts.map(localProductToAdmin);
    renderProducts();
    renderDashboard();
    return true;
  }
  const productList = document.getElementById("productList");
  if(productList && message) productList.innerHTML = `<div class="card"><b>Products not loaded</b><p>${message}</p></div>`;
  return false;
}

function adminProductToDb(p){
  const normalPrice = numberOrNull(p.normal_price) ?? numberOrNull(p.price) ?? 0;
  const offerPrice = p.is_special_offer ? numberOrNull(p.offer_price) : null;
  return {
    sku:cleanText(p.sku),
    name:cleanText(p.name),
    category:cleanText(p.category) || "Grocery",
    subcategory:cleanText(p.subcategory),
    description:cleanText(cleanPublicDescription(p.description)),
    price:normalPrice,
    offer_price:offerPrice,
    pack_size:cleanText(p.pack_size),
    image_url:cleanText(p.image),
    stock_status:p.stock_status || "in_stock",
    stock_qty:Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0,
    is_best_seller:!!p.is_best_seller,
    is_special_offer:!!p.is_special_offer,
    allergy_information:cleanText(p.allergy_information),
    ingredients:cleanText(p.ingredients),
    is_vegetarian:cleanText(p.is_vegetarian),
    is_halal:cleanText(p.is_halal),
    is_active:true,
    updated_at:new Date().toISOString()
  };
}

async function loadProductsFromSupabase(){
  loadLocalProductsFallback("Showing local invoice products from products.js.");
}

async function saveProductToSupabase(index){
  const p = products[index];
  if(!p) return false;
  if(!String(p.name || "").trim()){
    alert("Product name is required.");
    return false;
  }
  products[index] = p;
  saveProductsToLocalStore();
  alert("Product saved. Shop page refresh pannina same browser-la reflect aagum.");
  renderProducts();
  closeProductEditor();
  return true;
}

async function deleteProductFromSupabase(index){
  const p = products[index];
  if(!p) return;
  if(!confirm(`Delete product: ${p.name}?`)) return;

  products.splice(index,1);
  saveProductsToLocalStore();
  renderProducts();
  renderDashboard();
}

async function uploadProductImage(file){
  if(!file) return null;
  if(!window.ceSupabase || !ceSupabase.storage){
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

  const {error} = await ceSupabase.storage
    .from("product-images")
    .upload(path, file, {
      cacheControl:"3600",
      contentType:file.type || "image/jpeg",
      upsert:false
    });

  if(error){
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        alert("Image upload failed: " + error.message);
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  const {data} = ceSupabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function renderDashboard(){
  document.getElementById("todayOrders").innerText = orders.length;
  document.getElementById("pendingOrders").innerText = orders.filter(o=>o.status==="pending").length;
  document.getElementById("outStock").innerText = products.filter(p=>p.stock_status==="out_of_stock").length;
  document.getElementById("rewardClaims").innerText = "Demo";
}

async function loadOrdersFromSupabase(){
  if(!window.ceSupabase){
    showAdminError("Orders dashboard is not connected to Supabase. Check supabase_config.js and refresh.");
    renderOrders();
    renderDashboard();
    return;
  }
  try{
    const {data, error} = await ceSupabase
      .from("orders")
      .select("*")
      .order("created_at", {ascending:false});

    if(error) throw error;

    if(Array.isArray(data)){
      orders = data.map(o => ({
        db_id:o.id,
        order_id:o.order_id,
        customer_name:o.customer_name,
        whatsapp_number:o.whatsapp_number,
        order_type:o.order_type,
        payment_method:o.payment_method,
        status:o.status || "pending",
        collection_date:o.collection_date || "",
        collection_time:o.collection_time || "",
        delivery_date:o.delivery_date || "",
        delivery_time:o.delivery_time || "",
        admin_note:o.admin_note || "",
        subtotal:Number(o.subtotal || 0),
        delivery_charge:Number(o.delivery_charge || 0),
        total:Number(o.total || 0),
        reward_points_used:Number(o.reward_points_used || 0),
        reward_points_remaining:Number(o.reward_points_remaining || 0),
        delivery_address:o.delivery_address || "",
        postcode:o.postcode || "",
        customer_note:o.customer_note || "",
        items:[]
      }));
    }
  }catch(error){
    console.error("Could not load Supabase orders", error);
    showAdminError("Orders could not load from Supabase: " + (error.message || "Please run SUPABASE_ORDERS_POLICY_FIX.sql in Supabase SQL Editor."));
  }
  renderOrders();
  renderDashboard();
}

function normaliseSearchText(value){
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function productSearchText(p){
  return normaliseSearchText([
    p.name,
    p.sku,
    p.category,
    p.subcategory,
    p.pack_size,
    p.description,
    p.stock_status,
    p.supplier
  ].join(" "));
}

function clearProductSearch(){
  const input = document.getElementById("productSearch");
  if(input) input.value = "";
  renderProducts();
}

function renderProducts(){
  const searchInput = document.getElementById("productSearch");
  const query = normaliseSearchText(searchInput ? searchInput.value : "");
  const visibleProducts = products
    .map((p, index) => ({p, index}))
    .filter(({p}) => !query || productSearchText(p).includes(query));
  const html = `<div class="table product-table">
    <div class="row head product-row"><div>Product</div><div>Category</div><div>Price</div><div>Stock</div><div>Actions</div></div>
    ${visibleProducts.map(({p,index})=>`<div class="row product-row product-click" onclick="openProductEditor(${index})">
      <div class="admin-product-main">
        ${p.image ? `<img src="${imageSrc(p.image)}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" loading="lazy" decoding="async">` : `<div class="no-img">No Image</div>`}
        <div>
          <b>${escapeHtml(p.name)}</b><br>
          <small>${escapeHtml(p.sku || "")} - ${escapeHtml(p.pack_size || "")}</small><br>
          <small>${escapeHtml(cleanPublicDescription(p.description))}</small>
          <br><small><b>Supplier:</b> ${escapeHtml(p.supplier || DEFAULT_SUPPLIER)}</small>
          ${p.allergy_information ? `<br><small><b>Allergy:</b> ${escapeHtml(p.allergy_information)}</small>` : ""}
        </div>
      </div>
      <div>${escapeHtml(p.category)}<br><small>${escapeHtml(p.subcategory || "")}</small></div>
      <div>
        ${isSpecialOfferProduct(p) ? `<span class="old-price">£${Number(p.normal_price || p.price).toFixed(2)}</span><br><b class="offer-price">£${Number(p.offer_price).toFixed(2)}</b>` : `<b>£${Number(p.normal_price || p.price).toFixed(2)}</b>`}
        ${p.is_special_offer ? `<br><span class="badge low_stock">Offer</span>` : ""}
      </div>
      <div>${statusBadge(p.stock_status)}<br><small>Qty: ${p.stock_qty}</small></div>
      <div class="actions" onclick="event.stopPropagation()">
        <button class="green" onclick="setStock(${index},'in_stock')">In</button>
        <button class="dark" onclick="setStock(${index},'low_stock')">Low</button>
        <button class="red" onclick="setStock(${index},'out_of_stock')">Out</button>
        <button class="red" onclick="deleteProductFromSupabase(${index})">Delete</button>
      </div>
    </div>`).join("")}
  </div>
  <div id="productEditor"></div>`;
  const countLine = query
    ? `<p><b>Showing:</b> ${visibleProducts.length} of ${products.length} products</p>`
    : `<p><b>Total Products:</b> ${products.length}</p>`;
  const emptyLine = visibleProducts.length ? "" : `<div class="card"><b>No products found</b><p>Try another search word.</p></div>`;
  document.getElementById("productList").innerHTML = countLine + emptyLine + html;
}

async function setStock(i,status){
  if(!products[i]) return;
  const previousStatus = products[i].stock_status;
  products[i].stock_status = status;
  const saved = await saveProductToSupabase(i);
  if(!saved) products[i].stock_status = previousStatus;
  renderDashboard();
}

function addLocalProduct(){
  products.unshift({
    sku:"CE-" + Date.now(),
    name:document.getElementById("pName").value || "New Product",
    category:document.getElementById("pCategory").value || "Grocery",
    subcategory:"",
    description:"",
    price:Number(document.getElementById("pPrice").value || 0),
    normal_price:Number(document.getElementById("pPrice").value || 0),
    offer_price:null,
    pack_size:"",
    image:"",
    stock_qty:Number(document.getElementById("pStock").value || 0),
    stock_status:document.getElementById("pStatus").value,
    allergy_information:"",
    ingredients:"",
    is_vegetarian:"",
    is_halal:"",
    supplier:DEFAULT_SUPPLIER,
    is_best_seller:false,
    is_special_offer:false
  });
  saveProductsToLocalStore();
  renderProducts();
  openProductEditor(0);
}

function openProductEditor(index){
  const p = products[index];

  let modal = document.getElementById("productEditorModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "productEditorModal";
    modal.className = "product-editor-modal";
    document.body.appendChild(modal);
  }

  const categories = ["Grocery", "Restaurant Food", "Household", "Fresh Vegetables", "Fresh Seafood", "Fresh Meat"];
  const categoryOptions = categories.map(c => `<option value="${c}" ${p.category===c?"selected":""}>${c}</option>`).join("");

  modal.innerHTML = `<div class="product-editor-popup">
    <div class="popup-head">
      <h2>Edit Product</h2>
      <button onclick="closeProductEditor()">x</button>
    </div>

    <div class="editor-preview">
      ${p.image ? `<img id="editImagePreview" src="${imageSrc(p.image)}" alt="${escapeHtml(p.name)}" referrerpolicy="no-referrer" decoding="async">` : `<div id="editImagePreview" class="image-placeholder">No Image</div>`}
      <div>
        <b>${escapeHtml(p.name)}</b><br>
        <small>Product ID / SKU is locked</small>
      </div>
    </div>

    <div class="editor-grid">
      <label>Product ID / SKU
        <input id="editSku" value="${escapeHtml(p.sku || "")}" readonly class="readonly-input">
      </label>

      <label>Product Name
        <input id="editName" value="${escapeHtml(p.name || "")}">
      </label>

      <label>Category
        <select id="editCategory">${categoryOptions}</select>
      </label>

      <label>Subcategory
        <input id="editSubcategory" value="${escapeHtml(p.subcategory || "")}">
      </label>

      <label>Normal Price
        <input id="editNormalPrice" type="number" step="0.01" value="${Number(p.normal_price || p.price || 0)}">
      </label>

      <label>Offer Price
        <input id="editOfferPrice" type="number" step="0.01" value="${p.offer_price || ""}">
      </label>

      <label>Pack Size / Weight
        <input id="editPackSize" value="${escapeHtml(p.pack_size || "")}">
      </label>

      <label>Stock Quantity
        <input id="editStockQty" type="number" value="${Number(p.stock_qty || 0)}">
      </label>

      <label>Stock Status
        <select id="editStockStatus">
          <option value="in_stock" ${p.stock_status==="in_stock"?"selected":""}>In Stock</option>
          <option value="low_stock" ${p.stock_status==="low_stock"?"selected":""}>Low Stock</option>
          <option value="out_of_stock" ${p.stock_status==="out_of_stock"?"selected":""}>Out of Stock</option>
        </select>
      </label>

      <label>Supplier / Cash & Carry
        <input id="editSupplier" list="supplierOptions" value="${escapeHtml(p.supplier || DEFAULT_SUPPLIER)}" placeholder="Example: Shanker & Co">
        <datalist id="supplierOptions">
          <option value="Shanker & Co"></option>
          <option value="Costco"></option>
          <option value="Bosco"></option>
          <option value="Booker"></option>
          <option value="Local Supplier"></option>
        </datalist>
      </label>

      <label>Vegetarian / Non-Vegetarian
        <select id="editVeg">
          <option value="">Not specified</option>
          <option value="Vegetarian" ${p.is_vegetarian==="Vegetarian"?"selected":""}>Vegetarian</option>
          <option value="Non-Vegetarian" ${p.is_vegetarian==="Non-Vegetarian"?"selected":""}>Non-Vegetarian</option>
        </select>
      </label>

      <label>Halal
        <select id="editHalal">
          <option value="">Not specified</option>
          <option value="Yes" ${p.is_halal==="Yes"?"selected":""}>Yes</option>
          <option value="No" ${p.is_halal==="No"?"selected":""}>No</option>
        </select>
      </label>

      <label>Badges
        <select id="editBadge">
          <option value="">No badge</option>
          <option value="Best Seller" ${p.is_best_seller?"selected":""}>Best Seller</option>
          <option value="Special Offer" ${p.is_special_offer?"selected":""}>Special Offer</option>
        </select>
      </label>
    </div>

    <div class="editor-full">
      <label>Photo URL
        <input id="editImageUrl" value="${escapeHtml(p.image || "")}" oninput="previewImageUrl()">
      </label>

      <label>Upload Photo
        <input id="editImageUpload" type="file" accept="image/*" onchange="previewUploadedImage(event)">
      </label>

      <label>Description
        <textarea id="editDescription">${escapeHtml(p.description || "")}</textarea>
      </label>

      <label>Ingredients
        <textarea id="editIngredients">${escapeHtml(p.ingredients || "")}</textarea>
      </label>

      <label>Allergy Information
        <textarea id="editAllergy">${escapeHtml(p.allergy_information || "")}</textarea>
      </label>
    </div>

    <div class="actions big-actions">
      <button class="green" onclick="saveProductEdit(${index})">Save Product Permanently</button>
      <button class="dark" onclick="closeProductEditor()">Close</button>
    </div>

    <p class="muted">Product ID is locked. Use Photo URL or Upload Photo. Upload needs Supabase Storage bucket: product-images.</p>
  </div>`;

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}
function previewImageUrl(){
  const url = document.getElementById("editImageUrl").value.trim();
  const preview = document.getElementById("editImagePreview");
  if(!preview) return;
  if(url){
    if(preview.tagName.toLowerCase() === "img"){
      preview.src = imageSrc(url);
    }else{
      preview.outerHTML = `<img id="editImagePreview" src="${imageSrc(url)}" alt="Product preview" referrerpolicy="no-referrer" decoding="async">`;
    }
  }
}

async function previewUploadedImage(event){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const preview = document.getElementById("editImagePreview");
    if(preview){
      if(preview.tagName.toLowerCase() === "img") preview.src = dataUrl;
      else preview.outerHTML = `<img id="editImagePreview" src="${dataUrl}" alt="Uploaded preview" referrerpolicy="no-referrer" decoding="async">`;
    }
  };
  reader.readAsDataURL(file);

  pendingImageUpload = uploadProductImage(file);
  const publicUrl = await pendingImageUpload;
  pendingImageUpload = null;
  if(publicUrl){
    const imageUrl = document.getElementById("editImageUrl");
    if(imageUrl) imageUrl.value = publicUrl;
    previewImageUrl();
  }
}

async function saveProductEdit(index){
  const p = products[index];
  if(!p) return;
  if(pendingImageUpload){
    const publicUrl = await pendingImageUpload;
    pendingImageUpload = null;
    if(publicUrl){
      const imageUrl = document.getElementById("editImageUrl");
      if(imageUrl) imageUrl.value = publicUrl;
    }
  }
  const badge = document.getElementById("editBadge").value;

  // Product ID / SKU is locked and cannot be changed from popup
  p.sku = p.sku;
  p.name = document.getElementById("editName").value.trim();
  p.category = document.getElementById("editCategory").value.trim();
  p.subcategory = document.getElementById("editSubcategory").value.trim();
  p.normal_price = Number(document.getElementById("editNormalPrice").value || 0);
  const offerPriceInput = document.getElementById("editOfferPrice").value ? Number(document.getElementById("editOfferPrice").value) : null;
  p.offer_price = badge === "Special Offer" ? offerPriceInput : null;
  p.price = p.normal_price;
  p.pack_size = document.getElementById("editPackSize").value.trim();
  p.stock_qty = Number(document.getElementById("editStockQty").value || 0);
  p.stock_status = document.getElementById("editStockStatus").value;
  p.supplier = document.getElementById("editSupplier").value.trim() || DEFAULT_SUPPLIER;
  p.is_vegetarian = document.getElementById("editVeg").value;
  p.is_halal = document.getElementById("editHalal").value;
  p.is_best_seller = badge === "Best Seller";
  p.is_special_offer = badge === "Special Offer";
  p.image = document.getElementById("editImageUrl").value.trim();
  p.description = cleanPublicDescription(document.getElementById("editDescription").value);
  p.ingredients = document.getElementById("editIngredients").value.trim();
  p.allergy_information = document.getElementById("editAllergy").value.trim();

  await saveProductToSupabase(index);
}

function closeProductEditor(){
  const modal = document.getElementById("productEditorModal");
  if(modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

function renderOrders(){
  const emptyMessage = orders.length ? "" : `<div class="card"><b>No orders found</b><p>If customer placed an order, run SUPABASE_ORDERS_POLICY_FIX.sql in Supabase and then click Refresh Orders.</p></div>`;
  const html = `<button class="primary" onclick="loadOrdersFromSupabase()">Refresh Orders</button>
  ${emptyMessage}
  <div class="table">
    <div class="row head order-row"><div>Order</div><div>Customer</div><div>Total</div><div>Status</div><div>Actions</div></div>
    ${orders.map((o,i)=>`<div class="row order-row order-click" onclick="openOrderDetail(${i})">
      <div><b>${o.order_id}</b><br><small>${o.order_type}</small></div>
      <div>${escapeHtml(o.customer_name)}<br><small>${escapeHtml(o.whatsapp_number)}</small></div>
      <div>£${Number(o.total).toFixed(2)}</div>
      <div>${statusBadge(o.status)}</div>
      <div class="actions" onclick="event.stopPropagation()">
        <button class="green" onclick="openOrderDetail(${i})">View / Edit</button>
        <button class="green" onclick="setOrderStatus(${i},'confirmed')">Confirm</button>
        <button class="dark" onclick="setOrderStatus(${i},'preparing')">Preparing</button>
        <button class="green" onclick="setOrderStatus(${i},'ready')">Ready</button>
        <button class="red" onclick="setOrderStatus(${i},'cancelled')">Cancel</button>
      </div>
    </div>`).join("")}
  </div>`;
  document.getElementById("orderList").innerHTML = html;
}

function adminMoney(value){
  return "£" + Number(value || 0).toFixed(2);
}

function orderVisibleItems(order){
  return (order.items || []).filter(item => item.status !== "removed" && Number(item.qty || item.quantity || 0) > 0);
}

function recalculateOrder(order){
  const subtotal = orderVisibleItems(order).reduce((sum, item) => {
    const qty = Number(item.qty || item.quantity || 0);
    const price = Number(item.price || item.unit_price || 0);
    item.qty = qty;
    item.price = price;
    item.total = Number((qty * price).toFixed(2));
    return sum + item.total;
  }, 0);
  order.subtotal = Number(subtotal.toFixed(2));
  order.delivery_charge = Number(order.delivery_charge || 0);
  order.total = Number((order.subtotal + order.delivery_charge).toFixed(2));
}

async function loadOrderItems(index){
  const order = orders[index];
  if(!order || order.itemsLoaded || !window.ceSupabase || !order.db_id) return;
  const {data, error} = await ceSupabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.db_id)
    .order("created_at", {ascending:true});
  if(error){
    alert("Order items load ஆகலை: " + error.message);
    return;
  }
  order.items = (data || []).map(item => ({
    db_id:item.id,
    name:item.product_name,
    qty:Number(item.quantity || 0),
    price:Number(item.unit_price || 0),
    total:Number(item.line_total || 0),
    status:item.status || "available"
  }));
  order.itemsLoaded = true;
  recalculateOrder(order);
}

function orderDateValue(order){
  return order.order_type === "Delivery" ? order.delivery_date : order.collection_date;
}

function orderTimeValue(order){
  return order.order_type === "Delivery" ? order.delivery_time : order.collection_time;
}

async function openOrderDetail(index){
  const order = orders[index];
  if(!order) return;
  await loadOrderItems(index);

  let modal = document.getElementById("orderEditorModal");
  if(!modal){
    modal = document.createElement("div");
    modal.id = "orderEditorModal";
    modal.className = "product-editor-modal";
    document.body.appendChild(modal);
  }

  const itemRows = (order.items || []).map((item, itemIndex) => `
    <div class="admin-item-row ${item.status === "removed" ? "removed-order-item" : ""}">
      <div>
        <b>${escapeHtml(item.name)}</b><br>
        <small>${adminMoney(item.price)} each ${item.status === "removed" ? "- removed" : ""}</small>
      </div>
      <div class="qty-controls">
        <button onclick="changeOrderItemQty(${index},${itemIndex},-1)">-</button>
        <b>${Number(item.qty || 0)}</b>
        <button onclick="changeOrderItemQty(${index},${itemIndex},1)">+</button>
      </div>
      <div><b>${adminMoney(item.total)}</b></div>
      <div class="actions">
        <button class="red" onclick="removeOrderItem(${index},${itemIndex})">Remove</button>
      </div>
    </div>
  `).join("");

  const productOptions = products.map((p, pIndex) => `<option value="${pIndex}">${escapeHtml(p.name)} - ${adminMoney(effectiveProductPrice(p))}</option>`).join("");
  const dateLabel = order.order_type === "Delivery" ? "Delivery Date" : "Collection Date";
  const timeLabel = order.order_type === "Delivery" ? "Delivery Time" : "Collection Time";

  modal.innerHTML = `<div class="product-editor-popup order-editor-popup">
    <div class="popup-head">
      <h2>View / Edit Order</h2>
      <button onclick="closeOrderDetail()">x</button>
    </div>

    <div class="detail-grid">
      <div><b>Order</b><br>${escapeHtml(order.order_id)}</div>
      <div><b>Customer</b><br>${escapeHtml(order.customer_name)}<br><small>${escapeHtml(order.whatsapp_number)}</small></div>
      <div><b>Type</b><br>${escapeHtml(order.order_type)}</div>
      <div><b>Total</b><br>${adminMoney(order.total)}</div>
      <div><b>Status</b><br>${statusBadge(order.status)}</div>
    </div>

    <div class="timing-admin">
      <h3>${escapeHtml(order.order_type)} Date & Time</h3>
      <div class="editor-grid">
        <label>${dateLabel}
          <input id="orderDate" type="date" value="${escapeHtml(orderDateValue(order) || "")}">
        </label>
        <label>${timeLabel}
          <input id="orderTime" type="time" value="${escapeHtml(orderTimeValue(order) || "")}">
        </label>
        <label>Status
          <select id="orderStatus">
            <option value="pending" ${order.status==="pending"?"selected":""}>Pending</option>
            <option value="confirmed" ${order.status==="confirmed"?"selected":""}>Confirmed</option>
            <option value="preparing" ${order.status==="preparing"?"selected":""}>Preparing</option>
            <option value="ready" ${order.status==="ready"?"selected":""}>Ready</option>
            <option value="completed" ${order.status==="completed"?"selected":""}>Completed</option>
            <option value="cancelled" ${order.status==="cancelled"?"selected":""}>Cancelled</option>
          </select>
        </label>
      </div>
      <label>Admin Note
        <textarea id="orderAdminNote" placeholder="Example: Please collect after 6 PM">${escapeHtml(order.admin_note || "")}</textarea>
      </label>
    </div>

    <h3>Order Items</h3>
    <div id="orderItemsBox">${itemRows || "<p>No items found for this order.</p>"}</div>

    <div class="form-grid order-add-grid">
      <select id="orderAddProduct">${productOptions}</select>
      <input id="orderAddQty" type="number" min="1" value="1" placeholder="Qty">
      <button onclick="addProductToOrder(${index})">Add Item</button>
    </div>

    <div class="summary-admin">
      <div><span>Subtotal</span><b>${adminMoney(order.subtotal)}</b></div>
      <div><span>Delivery</span><b>${adminMoney(order.delivery_charge)}</b></div>
      <div><span>Total</span><b>${adminMoney(order.total)}</b></div>
    </div>

    <div class="actions big-actions">
      <button class="green" onclick="saveOrderDetail(${index})">Save Order</button>
      <button class="green" onclick="sendUpdatedOrderToCustomer(${index})">Send Order List to Customer</button>
      <button class="dark" onclick="closeOrderDetail()">Close</button>
    </div>
  </div>`;

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeOrderDetail(){
  const modal = document.getElementById("orderEditorModal");
  if(modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

function changeOrderItemQty(orderIndex, itemIndex, delta){
  const order = orders[orderIndex];
  const item = order && order.items && order.items[itemIndex];
  if(!item) return;
  item.status = "available";
  item.qty = Math.max(1, Number(item.qty || 0) + delta);
  item.total = Number((item.qty * Number(item.price || 0)).toFixed(2));
  recalculateOrder(order);
  openOrderDetail(orderIndex);
}

function removeOrderItem(orderIndex, itemIndex){
  const order = orders[orderIndex];
  const item = order && order.items && order.items[itemIndex];
  if(!item) return;
  item.status = "removed";
  item.qty = 0;
  item.total = 0;
  recalculateOrder(order);
  openOrderDetail(orderIndex);
}

function addProductToOrder(orderIndex){
  const order = orders[orderIndex];
  if(!order) return;
  const productIndex = Number(document.getElementById("orderAddProduct").value);
  const qty = Math.max(1, Number(document.getElementById("orderAddQty").value || 1));
  const product = products[productIndex];
  if(!product) return;
  const price = effectiveProductPrice(product);
  order.items = order.items || [];
  order.items.push({
    product_db_id:product.db_id || null,
    name:product.name,
    qty:qty,
    price:price,
    total:Number((qty * price).toFixed(2)),
    status:"available",
    isNew:true
  });
  recalculateOrder(order);
  openOrderDetail(orderIndex);
}

async function saveOrderDetail(index){
  const order = orders[index];
  if(!order) return;
  const date = document.getElementById("orderDate").value;
  const time = document.getElementById("orderTime").value;
  order.status = document.getElementById("orderStatus").value;
  order.admin_note = document.getElementById("orderAdminNote").value.trim();
  if(order.order_type === "Delivery"){
    order.delivery_date = date;
    order.delivery_time = time;
  }else{
    order.collection_date = date;
    order.collection_time = time;
  }
  recalculateOrder(order);

  if(window.ceSupabase && order.db_id){
    const orderUpdate = {
      status:order.status,
      admin_note:order.admin_note || null,
      subtotal:order.subtotal,
      delivery_charge:order.delivery_charge,
      total:order.total,
      collection_date:order.collection_date || null,
      collection_time:order.collection_time || null,
      delivery_date:order.delivery_date || null,
      delivery_time:order.delivery_time || null,
      updated_at:new Date().toISOString()
    };
    const {error: orderError} = await ceSupabase.from("orders").update(orderUpdate).eq("id", order.db_id);
    if(orderError){
      alert("Order save ஆகலை: " + orderError.message);
      return;
    }

    for(const item of (order.items || [])){
      const itemRow = {
        product_name:item.name,
        quantity:Number(item.qty || 0),
        unit_price:Number(item.price || 0),
        line_total:Number(item.total || 0),
        status:item.status || "available"
      };
      if(item.db_id){
        const {error:itemError} = await ceSupabase.from("order_items").update(itemRow).eq("id", item.db_id);
        if(itemError){
          alert("Item save ஆகலை: " + itemError.message);
          return;
        }
      }else{
        const {data:newItem, error:itemError} = await ceSupabase
          .from("order_items")
          .insert({...itemRow, order_id:order.db_id, product_id:item.product_db_id || null})
          .select("id")
          .single();
        if(itemError){
          alert("New item save ஆகலை: " + itemError.message);
          return;
        }
        item.db_id = newItem.id;
        item.isNew = false;
      }
    }
  }

  renderOrders();
  renderDashboard();
  openOrderDetail(index);
  alert("Order saved.");
}

function orderPayloadForCustomer(order){
  recalculateOrder(order);
  return {
    orderId:order.order_id,
    name:order.customer_name,
    phone:order.whatsapp_number,
    type:order.order_type,
    paymentMethod:order.payment_method,
    items:orderVisibleItems(order).map(item => ({
      name:item.name,
      qty:Number(item.qty || 0),
      price:Number(item.price || 0),
      total:Number(item.total || 0)
    })),
    requestedItems:[],
    rewards:[],
    subtotal:order.subtotal,
    delivery:order.delivery_charge,
    total:order.total
  };
}

function sendUpdatedOrderToCustomer(index){
  const order = orders[index];
  if(!order) return;
  const payload = orderPayloadForCustomer(order);
  let encoded = "";
  try{
    encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }catch(e){
    encoded = btoa(JSON.stringify(payload));
  }
  const basePath = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}`;
  const link = `${basePath}customer_order.html?view=items-only&data=${encodeURIComponent(encoded)}`;
  const timing = order.order_type === "Delivery"
    ? [order.delivery_date, order.delivery_time].filter(Boolean).join(" ")
    : [order.collection_date, order.collection_time].filter(Boolean).join(" ");
  let message = `CHENNAI EXPRESS - ORDER LIST\n\nOrder: ${order.order_id}\nTotal: ${adminMoney(order.total)}\n`;
  if(timing) message += `${order.order_type} Time: ${timing}\n`;
  message += `\nView order:\n${link}`;
  const rawPhone = String(order.whatsapp_number || "").replace(/\D/g, "");
  const phone = rawPhone.startsWith("44") ? rawPhone : rawPhone ? "44" + rawPhone.replace(/^0/,"") : "";
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

async function setOrderStatus(i,status){
  const order = orders[i];
  if(!order) return;
  order.status = status;
  if(window.ceSupabase && order.db_id){
    const {error} = await ceSupabase
      .from("orders")
      .update({status:status, updated_at:new Date().toISOString()})
      .eq("id", order.db_id);
    if(error) alert("Status changed on screen, but Supabase did not save it: " + error.message);
  }
  renderOrders();
  renderDashboard();
}

function renderCustomers(){
  const html = `<div class="table">
    <div class="row head"><div>Name</div><div>WhatsApp</div><div>Points</div><div>Orders</div><div>Actions</div></div>
    ${customers.map(c=>`<div class="row">
      <div>${c.name}</div>
      <div>${c.whatsapp_number}</div>
      <div>${c.reward_points}</div>
      <div>${c.total_orders}</div>
      <div class="actions"><button class="green">View</button></div>
    </div>`).join("")}
  </div>`;
  document.getElementById("customerList").innerHTML = html;
}

function addLocalCustomer(){
  customers.push({
    name:document.getElementById("cName").value || "Customer",
    whatsapp_number:document.getElementById("cPhone").value || "",
    reward_points:Number(document.getElementById("cPoints").value || 0),
    total_orders:0
  });
  renderCustomers();
}

function rewardIdFromName(name){
  return String(name || "reward").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `reward_${Date.now()}`;
}

function normaliseReward(r, index){
  const name = String(r.reward_name || r.name || "").trim() || "Free Gift";
  return {
    id:r.id || rewardIdFromName(name) + "_" + index,
    reward_name:name,
    points_required:Number(r.points_required || r.points || 0),
    reward_price:Number(r.reward_price || r.value || r.price || 0),
    emoji:r.emoji || "",
    image:r.image || ""
  };
}

function loadSavedRewards(){
  try{
    const saved = JSON.parse(localStorage.getItem(ADMIN_REWARDS_STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved.map(normaliseReward) : null;
  }catch(e){
    console.warn("Could not load saved rewards", e);
    return null;
  }
}

function saveRewardsToLocalStore(){
  rewards = rewards.map(normaliseReward).sort((a,b)=>Number(a.points_required)-Number(b.points_required));
  localStorage.setItem(ADMIN_REWARDS_STORAGE_KEY, JSON.stringify(rewards));
}

function exportRewardData(){
  saveRewardsToLocalStore();
  const data = localStorage.getItem(ADMIN_REWARDS_STORAGE_KEY) || "[]";
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chennai-express-rewards.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  let box = document.getElementById("rewardExportBox");
  if(!box){
    box = document.createElement("div");
    box.id = "rewardExportBox";
    box.className = "card";
    const rewardList = document.getElementById("rewardList");
    if(rewardList) rewardList.prepend(box);
  }
  box.innerHTML = `
    <b>Reward data is ready.</b>
    <p>If download did not start, use this backup link or copy the text below.</p>
    <p><a href="${url}" download="chennai-express-rewards.json">Download rewards JSON</a></p>
    <textarea readonly style="width:100%;height:110px">${escapeHtml(data)}</textarea>`;
  alert("Rewards export ready. Send this JSON here if you want it fixed into online files.");
}

function importRewardData(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const imported = JSON.parse(reader.result);
      if(!Array.isArray(imported) || !imported.length){
        alert("Import file does not contain rewards.");
        return;
      }
      rewards = imported.map(normaliseReward);
      saveRewardsToLocalStore();
      renderRewards();
      alert("Rewards imported. Open or refresh customer page in this browser.");
    }catch(e){
      alert("Import failed. Please choose the exported rewards JSON file.");
    }
  };
  reader.readAsText(file);
}

function renderRewards(){
  rewards = rewards.map(normaliseReward).sort((a,b)=>Number(a.points_required)-Number(b.points_required));
  document.getElementById("rewardList").innerHTML = `
    <div class="reward-admin-tools card">
      <h3>Add Reward</h3>
      <div class="form-grid reward-form">
        <button onclick="exportRewardData()">Export Reward Data</button>
        <label class="file-action">Import Reward Data
          <input type="file" accept=".json" onchange="importRewardData(event)">
        </label>
      </div>
      <div class="form-grid reward-form">
        <input id="rewardName" placeholder="Reward name e.g. Free Chicken Roll">
        <input id="rewardPoints" type="number" min="1" step="1" placeholder="Points e.g. 500">
        <input id="rewardPrice" type="number" min="0" step="0.01" placeholder="Gift value e.g. 2.50">
        <input id="rewardEmoji" placeholder="Emoji optional">
        <input id="rewardImage" placeholder="Image URL optional">
        <button onclick="addReward()">Add Reward</button>
      </div>
      <p>Saved rewards will show in customer cart rewards in the same browser. Export/upload code when ready for online.</p>
    </div>
    <div class="table reward-table">
      <div class="row head reward-row"><div>Reward</div><div>Points</div><div>Value</div><div>Image</div><div>Actions</div></div>
      ${rewards.map((r,i)=>`<div class="row reward-row">
        <div><b>${escapeHtml(r.reward_name)}</b><br><small>${escapeHtml(r.id)}</small></div>
        <div>${Number(r.points_required)}</div>
        <div>${Number(r.reward_price || 0) ? `£${Number(r.reward_price).toFixed(2)}` : "-"}</div>
        <div>${r.image ? `<img class="reward-thumb" src="${imageSrc(r.image)}" alt="${escapeHtml(r.reward_name)}" referrerpolicy="no-referrer" loading="lazy" decoding="async">` : `<span class="badge low_stock">No image</span>`}</div>
        <div class="actions">
          <button class="green" onclick="openRewardEditor(${i})">Edit</button>
          <button class="red" onclick="deleteReward(${i})">Delete</button>
        </div>
      </div>`).join("")}
    </div>
    <div id="rewardEditor"></div>`;
}

function addReward(){
  const name = document.getElementById("rewardName").value.trim();
  const points = Number(document.getElementById("rewardPoints").value || 0);
  if(!name){
    alert("Reward name is required.");
    return;
  }
  if(!Number.isFinite(points) || points <= 0){
    alert("Points must be more than 0.");
    return;
  }
  rewards.push(normaliseReward({
    id:rewardIdFromName(name),
    reward_name:name,
    points_required:points,
    reward_price:Number(document.getElementById("rewardPrice").value || 0),
    emoji:document.getElementById("rewardEmoji").value.trim(),
    image:document.getElementById("rewardImage").value.trim()
  }, rewards.length));
  saveRewardsToLocalStore();
  renderRewards();
  renderDashboard();
  alert("Reward added. Open or refresh customer page in this browser.");
}

function openRewardEditor(index){
  const r = rewards[index];
  if(!r) return;
  const box = document.getElementById("rewardEditor");
  box.innerHTML = `
    <div class="product-editor-modal show">
      <div class="product-editor-popup">
        <div class="popup-head">
          <h2>Edit Reward</h2>
          <button onclick="closeRewardEditor()">X</button>
        </div>
        <div class="editor-grid">
          <label>Reward Name
            <input id="editRewardName" value="${escapeHtml(r.reward_name)}">
          </label>
          <label>Points Required
            <input id="editRewardPoints" type="number" min="1" step="1" value="${Number(r.points_required)}">
          </label>
          <label>Gift Value / Price
            <input id="editRewardPrice" type="number" min="0" step="0.01" value="${Number(r.reward_price || 0)}">
          </label>
          <label>Emoji optional
            <input id="editRewardEmoji" value="${escapeHtml(r.emoji || "")}">
          </label>
          <label>Image URL optional
            <input id="editRewardImage" value="${escapeHtml(r.image || "")}">
          </label>
        </div>
        <div class="big-actions">
          <button class="green" onclick="saveReward(${index})">Save Reward</button>
          <button class="red" onclick="deleteReward(${index})">Delete</button>
          <button class="dark" onclick="closeRewardEditor()">Close</button>
        </div>
      </div>
    </div>`;
  document.body.style.overflow = "hidden";
}

function saveReward(index){
  const r = rewards[index];
  if(!r) return;
  const name = document.getElementById("editRewardName").value.trim();
  const points = Number(document.getElementById("editRewardPoints").value || 0);
  if(!name){
    alert("Reward name is required.");
    return;
  }
  if(!Number.isFinite(points) || points <= 0){
    alert("Points must be more than 0.");
    return;
  }
  rewards[index] = normaliseReward({
    ...r,
    id:r.id || rewardIdFromName(name),
    reward_name:name,
    points_required:points,
    reward_price:Number(document.getElementById("editRewardPrice").value || 0),
    emoji:document.getElementById("editRewardEmoji").value.trim(),
    image:document.getElementById("editRewardImage").value.trim()
  }, index);
  saveRewardsToLocalStore();
  renderRewards();
  closeRewardEditor();
  alert("Reward saved. Open or refresh customer page in this browser.");
}

function deleteReward(index){
  const r = rewards[index];
  if(!r) return;
  if(!confirm(`Delete reward: ${r.reward_name}?`)) return;
  rewards.splice(index, 1);
  saveRewardsToLocalStore();
  renderRewards();
  renderDashboard();
}

function closeRewardEditor(){
  const box = document.getElementById("rewardEditor");
  if(box) box.innerHTML = "";
  document.body.style.overflow = "";
}

function previewCSV(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    document.getElementById("csvPreview").innerHTML = `<div class="card"><b>CSV Preview</b><pre>${lines.slice(0,8).join("\n")}</pre><p>In production this will upload to Supabase products table.</p></div>`;
  };
  reader.readAsText(file);
}

function downloadTemplate(){
  const csv = "sku,name,category,subcategory,description,price,offer_price,pack_size,stock_qty,stock_status,ingredients,allergy_information,is_vegetarian,is_halal\\nCE-001,Product Name,Grocery,Masala,Description,1.99,,100g,10,in_stock,Ingredients,Allergy info,Vegetarian,Yes";
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products_upload_template.csv";
  a.click();
}

async function init(){
  try{
    renderOrders();
    renderCustomers();
    renderRewards();
    await loadOrdersFromSupabase();
    await loadProductsFromSupabase();
  }catch(error){
    console.error(error);
    showAdminError("Admin page could not load. Please refresh. " + (error.message || ""));
    loadLocalProductsFallback("Showing local products after an admin loading issue.");
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
}else{
  init();
}
