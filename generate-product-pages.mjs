import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
const productsSource = await readFile(path.join(projectRoot, "products.js"), "utf8");
const products = Function(`${productsSource}; return PRODUCTS;`)();
const configSource = await readFile(path.join(projectRoot, "site_config.js"), "utf8");
const configuredUrl = configSource.match(/publicSiteUrl:\s*["']([^"']+)/)?.[1];
const baseUrl = String(configuredUrl || "https://kannammaiglasgow-prog.github.io/chennai-express-live").replace(/\/+$/, "");

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactText(value){
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function productTitle(product){
  const name = String(product.name || "").trim();
  const pack = String(product.pack || product.pack_size || "").trim();
  if(!pack || compactText(name).includes(compactText(pack))) return name;
  return `${name} - ${pack}`;
}

function productSlug(product){
  return String(product.name || "product")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `product-${product.id || "item"}`;
}

function cleanDescription(value){
  return String(value || "")
    .replace(/\s*Price includes 40% profit from invoice cost\./gi, "")
    .trim();
}

function isSpecialOffer(product){
  if(!product.offer_price) return false;
  if(Object.prototype.hasOwnProperty.call(product, "badge")) return product.badge === "Special Offer";
  return Boolean(product.is_special_offer);
}

function productPrice(product){
  return Number(isSpecialOffer(product) ? product.offer_price : (product.normal_price || product.price || 0));
}

function absoluteImageUrl(image){
  const source = String(image || "").trim();
  if(/^https?:\/\//i.test(source)) return source;
  if(!source || source.startsWith("data:")) return `${baseUrl}/assets/banners/shankar-gingelly-oil-banner.png`;
  return `${baseUrl}/${source.replace(/^(\.\.\/|\.\/|\/)+/, "")}`;
}

for(const product of products){
  const slug = productSlug(product);
  const title = productTitle(product);
  const price = `£${productPrice(product).toFixed(2)}`;
  const description = cleanDescription(product.description) || `${title} available from Chennai Express.`;
  const offerText = isSpecialOffer(product)
    ? `Special offer: ${price}. ${description}`
    : description;
  const productUrl = `${baseUrl}/product/${slug}/`;
  const imageUrl = absoluteImageUrl(product.image);
  const pageDir = path.join(projectRoot, "product", slug);
  await mkdir(pageDir, {recursive:true});

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - ${escapeHtml(price)} | Chennai Express</title>
<meta name="description" content="${escapeHtml(offerText)}">
<link rel="canonical" href="${escapeHtml(productUrl)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Chennai Express">
<meta property="og:title" content="${escapeHtml(title)} - ${escapeHtml(price)}">
<meta property="og:description" content="${escapeHtml(offerText)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta property="og:url" content="${escapeHtml(productUrl)}">
<meta property="product:price:amount" content="${productPrice(product).toFixed(2)}">
<meta property="product:price:currency" content="GBP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)} - ${escapeHtml(price)}">
<meta name="twitter:description" content="${escapeHtml(offerText)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<style>
body{font-family:Arial,sans-serif;margin:0;background:#fffaf2;color:#171717}.product{max-width:620px;margin:24px auto;padding:20px}.product img{display:block;width:100%;max-height:480px;object-fit:contain;background:#fff;border:1px solid #eadcc8;border-radius:8px}.product h1{font-size:28px}.price{color:#d71020;font-size:30px;font-weight:900}.description{line-height:1.55}.actions{display:grid;gap:10px;margin-top:20px}.actions a{padding:14px;text-align:center;text-decoration:none;border-radius:8px;background:#07833f;color:white;font-weight:800}.actions a:first-child{background:#111}
</style>
<script>
window.addEventListener("DOMContentLoaded", function(){
  var target = new URL("../../index.html", window.location.href);
  target.searchParams.set("product", ${JSON.stringify(slug)});
  window.location.replace(target.href);
});
</script>
</head>
<body>
<main class="product">
  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">
  <h1>${escapeHtml(title)}</h1>
  <p class="price">${escapeHtml(price)}</p>
  <p class="description">${escapeHtml(description)}</p>
  <div class="actions">
    <a href="../../index.html?product=${encodeURIComponent(slug)}">Add to Cart</a>
    <a href="../../index.html?product=${encodeURIComponent(slug)}">Order on WhatsApp</a>
  </div>
</main>
</body>
</html>
`;
  await writeFile(path.join(pageDir, "index.html"), html, "utf8");
}

console.log(`Generated ${products.length} product share pages in ${path.join(projectRoot, "product")}`);
