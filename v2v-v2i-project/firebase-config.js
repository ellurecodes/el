// ================================================================
//  FIREBASE CONFIG — V2X Connect v7.0
//  Google Auth · DB-based Admin Management · Vincenty GPS · Kalman
//  Project: v2v-v2i-project
// ================================================================

// ── FIREBASE INITIALIZATION ────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDrjgoE9ygZ7LDU3A4i8jamjHTLHnzc-n4",
  authDomain:        "v2v-v2i-project.firebaseapp.com",
  databaseURL:       "https://v2v-v2i-project-default-rtdb.firebaseio.com",
  projectId:         "v2v-v2i-project",
  storageBucket:     "v2v-v2i-project.firebasestorage.app",
  messagingSenderId: "7030262076",
  appId:             "1:7030262076:web:d94493e1c9411820f43639"
};

firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();

// ================================================================
//  ADMIN SYSTEM — DB-powered (no hardcoded emails except super admin)
//
//  SUPER ADMIN : vishal797577@gmail.com
//    → Seeded automatically into /v4/admins on first login
//    → Can never be removed
//    → Can promote any Google-signed-in user to admin
//
//  ADMINS : stored in /v4/admins/{uid}
//    { email, name, isSuperAdmin, addedAt, addedBy }
//
//  USERS  : stored in /v4/users/{uid}
//    { email, name, photo, role, status, lastSeen, joinedAt }
// ================================================================
const SUPER_ADMIN_EMAIL = 'vishal797577@gmail.com'; // ← your Gmail

// Demo fallback (works even without Firebase Auth configured)
const FALLBACK_ADMIN = { user: 'admin', pass: 'V2X@2024' };

// ── DETECTION RANGES ──────────────────────────────────────────
let RANGE_V2V = 25;
let RANGE_V2I = 50;

db.ref('v4/config').on('value', snap => {
  const cfg = snap.val();
  if (cfg) {
    if (cfg.rangeV2V && cfg.rangeV2V >= 5)  RANGE_V2V = cfg.rangeV2V;
    if (cfg.rangeV2I && cfg.rangeV2I >= 10) RANGE_V2I = cfg.rangeV2I;
    document.dispatchEvent(new CustomEvent('rangesUpdated', {
      detail: { v2v: RANGE_V2V, v2i: RANGE_V2I }
    }));
  }
});

db.ref('v4/config').once('value', snap => {
  if (!snap.val()) db.ref('v4/config').set({ rangeV2V: 25, rangeV2I: 50 });
});

// ── DATABASE REFERENCES ────────────────────────────────────────
const DB = {
  emergency: db.ref('v4/emergency'),
  signal:    db.ref('v4/signal'),
  vehicle1:  db.ref('v4/vehicle1'),
  vehicle2:  db.ref('v4/vehicle2'),
  events:    db.ref('v4/events'),
  sessions:  db.ref('v4/sessions'),
  config:    db.ref('v4/config'),
  admins:    db.ref('v4/admins'),   // NEW: admin list
  users:     db.ref('v4/users'),    // NEW: all users
};

// ── DEFAULT POSITIONS (Silk Board Junction, Bangalore) ─────────
const DEFAULT_POS = {
  vehicle1: { lat: 12.9176, lng: 77.6201 },
  vehicle2: { lat: 12.9185, lng: 77.6215 }
};

// ================================================================
//  ADMIN DB HELPERS
// ================================================================

/**
 * checkIsAdmin(uid) → Promise<boolean>
 * Reads /v4/admins/{uid} from Firebase.
 * This is the single source of truth for admin status.
 */
function checkIsAdmin(uid) {
  if (!uid) return Promise.resolve(false);
  return db.ref('v4/admins/' + uid).once('value')
    .then(snap => snap.exists())
    .catch(() => false);
}

/**
 * registerUser(firebaseUser)
 * Writes/updates the user's profile in /v4/users/{uid}.
 * Called on every Google sign-in so the admin can see all users.
 */
function registerUser(firebaseUser) {
  const now = new Date().toISOString();
  return db.ref('v4/users/' + firebaseUser.uid).transaction(current => {
    return {
      email:     firebaseUser.email,
      name:      firebaseUser.displayName || firebaseUser.email.split('@')[0],
      photo:     firebaseUser.photoURL || '',
      lastSeen:  now,
      joinedAt:  (current && current.joinedAt) ? current.joinedAt : now,
      role:      (current && current.role) ? current.role : '',
      status:    'active',
    };
  }).catch(() => {});
}

/**
 * seedSuperAdmin(firebaseUser)
 * If the signed-in user is the super admin AND they are not yet in /v4/admins,
 * write them in with isSuperAdmin: true. Safe to call on every login.
 */
function seedSuperAdmin(firebaseUser) {
  if (!firebaseUser || firebaseUser.email !== SUPER_ADMIN_EMAIL) return;
  db.ref('v4/admins/' + firebaseUser.uid).once('value', snap => {
    if (!snap.exists()) {
      db.ref('v4/admins/' + firebaseUser.uid).set({
        email:        firebaseUser.email,
        name:         firebaseUser.displayName || 'Super Admin',
        isSuperAdmin: true,
        addedAt:      new Date().toISOString(),
        addedBy:      'system',
      });
    }
  });
}

/**
 * promoteToAdmin(uid, email, name, addedByUid)
 * Grants admin access to a user. Only callable by admins.
 */
function promoteToAdmin(uid, email, name, addedByUid) {
  return db.ref('v4/admins/' + uid).set({
    email,
    name,
    isSuperAdmin: false,
    addedAt:      new Date().toISOString(),
    addedBy:      addedByUid || 'admin',
  });
}

/**
 * demoteAdmin(uid)
 * Removes admin access. Cannot demote super admin.
 */
function demoteAdmin(uid, email) {
  if (email === SUPER_ADMIN_EMAIL) {
    alert('⛔ Cannot remove Super Admin access.');
    return Promise.reject('Cannot demote super admin');
  }
  return db.ref('v4/admins/' + uid).remove();
}

/**
 * banUser(uid, email, reason, bannedByUid)
 * Bans a user from signing in. Adds to /v4/banned.
 */
function banUser(uid, email, reason, bannedByUid) {
  if (email === SUPER_ADMIN_EMAIL) {
    alert('⛔ Cannot ban the Super Admin.');
    return Promise.reject('Cannot ban super admin');
  }
  return Promise.all([
    db.ref('v4/banned/' + uid).set({
      email, reason: reason || 'Removed by admin',
      bannedAt: new Date().toISOString(),
      bannedBy: bannedByUid || 'admin',
    }),
    db.ref('v4/admins/' + uid).remove(),   // also remove admin if they had it
    db.ref('v4/users/' + uid + '/status').set('banned'),
  ]);
}

/**
 * unbanUser(uid)
 * Remove ban from a user.
 */
function unbanUser(uid) {
  return Promise.all([
    db.ref('v4/banned/' + uid).remove(),
    db.ref('v4/users/' + uid + '/status').set('active'),
  ]);
}

/**
 * removeUser(uid)
 * Remove user record (they can sign back in fresh).
 */
function removeUser(uid) {
  return db.ref('v4/users/' + uid).remove();
}

/**
 * checkAndApplyPendingInvite(firebaseUser)
 * After any Google sign-in, check if the user's email was pre-approved
 * as a pending admin invite. If yes, promote them and remove the pending entry.
 * Called by completeGoogleSignIn in login.html.
 */
async function checkAndApplyPendingInvite(firebaseUser) {
  if (!firebaseUser || !firebaseUser.email) return false;
  const email = firebaseUser.email.toLowerCase();
  try {
    const snap = await db.ref('v4/pending_admins')
      .orderByChild('email').equalTo(email).once('value');
    if (!snap.exists()) return false;
    const entries = Object.entries(snap.val());
    // Promote this user to admin
    await db.ref('v4/admins/' + firebaseUser.uid).set({
      email: firebaseUser.email,
      name:  firebaseUser.displayName || email.split('@')[0],
      isSuperAdmin: false,
      addedAt: new Date().toISOString(),
      addedBy: 'system_invite',
    });
    // Remove all pending entries for this email
    await Promise.all(entries.map(([key]) =>
      db.ref('v4/pending_admins/' + key).remove()
    ));
    return true; // was promoted
  } catch(e) {
    return false;
  }
}

/**
 * checkBanned(uid) → Promise<boolean>
 * Check if a user is banned.
 */
function checkBanned(uid) {
  if (!uid) return Promise.resolve(false);
  return db.ref('v4/banned/' + uid).once('value')
    .then(snap => snap.exists())
    .catch(() => false);
}

/**
 * isAdminSync() → boolean (NO Firebase read, instant)
 * Reads from sessionStorage — use this for immediate page guards
 * to prevent auth flash BEFORE Firebase resolves.
 */
function isAdminSync() {
  return sessionStorage.getItem('v2x_is_admin') === 'true' &&
         !!sessionStorage.getItem('v2x_user');
}

// ================================================================
//  VINCENTY FORMULA — WGS-84, ±0.5mm accuracy
// ================================================================
function haversine(lat1, lng1, lat2, lng2) {
  const a = 6378137, b = 6356752.314245, f = 1 / 298.257223563;
  const L  = (lng2 - lng1) * Math.PI / 180;
  const U1 = Math.atan((1 - f) * Math.tan(lat1 * Math.PI / 180));
  const U2 = Math.atan((1 - f) * Math.tan(lat2 * Math.PI / 180));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lambda = L, lambdaP, iterLimit = 100;
  let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha;
  let cosSqAlpha, cos2SigmaM, C;
  do {
    sinLambda = Math.sin(lambda); cosLambda = Math.cos(lambda);
    sinSigma  = Math.sqrt((cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2);
    if (sinSigma === 0) return 0;
    cosSigma   = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma      = Math.atan2(sinSigma, cosSigma);
    sinAlpha   = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    C          = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP    = lambda;
    lambda     = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);
  if (iterLimit === 0) {
    const R = 6371000, p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
    const fb = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(fb), Math.sqrt(1 - fb)));
  }
  const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
  const A2  = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B2  = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const ds  = B2 * sinSigma * (cos2SigmaM + B2 / 4 * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - B2 / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
  return Math.round(b * A2 * (sigma - ds));
}

// ================================================================
//  KALMAN FILTER — 1D GPS smoothing
// ================================================================
class KalmanFilter1D {
  constructor(processNoise = 0.008, measurementNoise = 0.5) {
    this.q = processNoise; this.r = measurementNoise;
    this.p = 1; this.x = null; this.k = 0;
  }
  filter(m) {
    if (this.x === null) { this.x = m; return m; }
    this.p = this.p + this.q;
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (m - this.x);
    this.p = (1 - this.k) * this.p;
    return this.x;
  }
}
const kalmanLat = new KalmanFilter1D(0.01, 1.0);
const kalmanLng = new KalmanFilter1D(0.01, 1.0);

// ── BEARING ────────────────────────────────────────────────────
function getBearing(lat1, lng1, lat2, lng2) {
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
}

function getYieldSide(evLat, evLng, evHdg, vLat, vLng) {
  return ((getBearing(evLat, evLng, vLat, vLng) - evHdg + 360) % 360) < 180 ? 'RIGHT' : 'LEFT';
}

function bearingToDir(b) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((b % 360) + 360) % 360 / 45) % 8];
}

// ── TIME ──────────────────────────────────────────────────────
function getTimeStr()   { return new Date().toLocaleTimeString('en-IN', { hour12: false }); }
function getTimestamp() { return new Date().toISOString(); }

// ── EVENT LOGGER ──────────────────────────────────────────────
function logEvent(type, message, extra) {
  DB.events.push({
    type, message, data: extra || null,
    timestamp:  getTimestamp(),
    serverTime: firebase.database.ServerValue.TIMESTAMP
  });
}

// ================================================================
//  SESSION MANAGEMENT — sessionStorage (cleared on tab close)
// ================================================================
function getSession() {
  return {
    user:    sessionStorage.getItem('v2x_user')    || null,
    role:    sessionStorage.getItem('v2x_role')    || null,
    isAdmin: sessionStorage.getItem('v2x_is_admin') === 'true',
    photo:   sessionStorage.getItem('v2x_photo')   || null,
    email:   sessionStorage.getItem('v2x_email')   || null,
    uid:     sessionStorage.getItem('v2x_uid')     || null,
  };
}

function setSession(data) {
  const map = { user:'v2x_user', role:'v2x_role', isAdmin:'v2x_is_admin', photo:'v2x_photo', email:'v2x_email', uid:'v2x_uid' };
  Object.keys(data).forEach(k => {
    if (map[k]) sessionStorage.setItem(map[k], k === 'isAdmin' ? (data[k] ? 'true' : 'false') : (data[k] || ''));
  });
}

function clearSession() {
  ['v2x_user','v2x_role','v2x_is_admin','v2x_photo','v2x_email','v2x_uid'].forEach(k => sessionStorage.removeItem(k));
}

// ================================================================
//  AUTH GUARDS
// ================================================================

/** Wait for Firebase Auth to resolve */
function waitForAuth() {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(user => { unsub(); resolve(user); });
  });
}

/**
 * requireAuth(allowedRoles?)
 * Call at top of every protected page. Redirects to login if not signed in.
 */
async function requireAuth(allowedRoles) {
  const s = getSession();
  if (!s.user) { window.location.href = 'login.html'; return false; }
  if (allowedRoles && !s.isAdmin && !allowedRoles.includes(s.role)) {
    window.location.href = 'user-portal.html'; return false;
  }
  return true;
}

/** requireAdmin — for admin-only pages */
async function requireAdmin() {
  const s = getSession();
  if (!s.user || !s.isAdmin) {
    const cur = window.location.pathname.split('/').pop() || 'control.html';
    window.location.href = 'login.html?target=' + encodeURIComponent(cur) + '&need=admin';
    return false;
  }
  return true;
}

/** Sign out completely */
function logoutSession() {
  clearSession();
  auth.signOut().catch(() => {});
  window.location.href = 'login.html';
}

/** Role → URL mapping */
function getRoleUrl(role) {
  return { ev:'emergency.html', signal:'signal.html', vehicle1:'vehicle1.html', vehicle2:'vehicle2.html', admin:'control.html' }[role] || 'user-portal.html';
}

console.log('🔥 V2X Connect v7.0 | DB-Admin | Google Auth | Vincenty WGS-84 | Kalman GPS | /v4/');