# 🔐 Google Auth + Admin Management Setup — V2X Connect v6.0

---

## ✅ STEP 1 — Enable Google Sign-In in Firebase Console

1. Open: https://console.firebase.google.com/project/v2v-v2i-project/authentication/providers
2. Click **Google** → toggle **Enable** → click **Save**
3. (Optional) Enable **Email/Password** for the admin email/password login

---

## ✅ STEP 2 — Set Firebase Database Rules

Go to: https://console.firebase.google.com/project/v2v-v2i-project/database/rules

Paste these rules (allows authenticated users to read/write):

```json
{
  "rules": {
    "v4": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

> For production tighten to: only admins can write to `/v4/admins`

---

## ✅ STEP 3 — Run Locally (Required for Google Auth)

Google Auth does NOT work with `file://` (double-clicking HTML).  
You MUST run via Firebase CLI:

```powershell
# Install Firebase CLI (once)
npm install -g firebase-tools
firebase login

# Run local server from project folder
firebase serve
```

Then open: **http://localhost:5000**

---

## ✅ STEP 4 — First Login as Super Admin

1. Open `http://localhost:5000/login.html`
2. Click **Continue with Google**
3. Sign in with **vishal797577@gmail.com**
4. The system auto-seeds you into `/v4/admins` as **Super Admin** ⭐
5. You are redirected to **Control Center**

---

## ✅ STEP 5 — Add Other Admins

From the **Control Center**:

1. Click the **👥 Users** tab in the right panel
2. Any user who has signed in with Google appears here
3. Click **✅ Admin** next to their name to promote them
4. Click **❌ Revoke** to remove their admin access

> The promoted user gets admin access on their **next page load** (their `/v4/admins` entry is checked live).

---

## ✅ STEP 6 — Deploy to Firebase Hosting

```powershell
firebase deploy --only hosting
```

Live URL: **https://v2v-v2i-project.web.app**

---

## 🗄️ Firebase DB Structure

```
/v4/
  admins/
    {uid}: { email, name, isSuperAdmin, addedAt, addedBy }
  users/
    {uid}: { email, name, photo, role, lastSeen, joinedAt }
  emergency/  … EV GPS data
  signal/     … Signal state
  vehicle1/   … V1 GPS data
  vehicle2/   … V2 GPS data
  events/     … Event log
  config/     … rangeV2V, rangeV2I, intersection
  sessions/   … Active role sessions
```

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `auth/operation-not-allowed` | Enable Google in Firebase Console → Authentication |
| `auth/configuration-not-found` | Same as above |
| `auth/unauthorized-domain` | Run `firebase serve` — do NOT use `file://` |
| `auth/popup-blocked` | Allow popups — code auto-falls back to redirect |
| User not getting admin | Sign in with Google first, then promote in Control Center |
| Super admin not auto-seeded | Make sure you sign in with `vishal797577@gmail.com` exactly |

---

## 🔑 Demo Login (Works Without Firebase Auth)

- **Username**: `admin`  
- **Password**: `V2X@2024`

This bypasses Firebase Auth and gives full admin access (no DB write, local only).
