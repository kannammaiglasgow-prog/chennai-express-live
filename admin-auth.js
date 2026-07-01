const ADMIN_SESSION_KEY = "ce_admin_session";
const ADMIN_USERNAME = "ramanan";
const ADMIN_PASSWORD_HASH = "7676aaafb027c825bd9abab78b234070e702752f625b752e55e55b48e607e358";
const ADMIN_SESSION_HOURS = 8;

async function adminPasswordHash(value){
  const bytes = new TextEncoder().encode(String(value || ""));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function adminSessionIsValid(){
  try{
    const session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || "null");
    return Boolean(session && session.username === ADMIN_USERNAME && Number(session.expiresAt) > Date.now());
  }catch(error){
    return false;
  }
}

function showAdminLogin(){
  window.CE_ADMIN_AUTHENTICATED = false;
  document.body.classList.add("admin-locked");
  const screen = document.getElementById("adminLoginScreen");
  if(screen) screen.hidden = false;
}

function unlockAdmin(){
  window.CE_ADMIN_AUTHENTICATED = true;
  document.body.classList.remove("admin-locked");
  const screen = document.getElementById("adminLoginScreen");
  if(screen) screen.hidden = true;
  if(typeof window.startAdminApp === "function") window.startAdminApp();
}

async function loginAdmin(event){
  event.preventDefault();
  const username = document.getElementById("adminLoginUsername").value.trim().toLowerCase();
  const password = document.getElementById("adminLoginPassword").value;
  const message = document.getElementById("adminLoginMessage");
  const passwordHash = await adminPasswordHash(password);
  if(username !== ADMIN_USERNAME || passwordHash !== ADMIN_PASSWORD_HASH){
    if(message) message.textContent = "Incorrect username or password.";
    document.getElementById("adminLoginPassword").value = "";
    return;
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    username:ADMIN_USERNAME,
    expiresAt:Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000
  }));
  if(message) message.textContent = "";
  unlockAdmin();
}

function logoutAdmin(){
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.reload();
}

function initialiseAdminAuth(){
  if(adminSessionIsValid()) unlockAdmin();
  else showAdminLogin();
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initialiseAdminAuth);
}else{
  initialiseAdminAuth();
}
