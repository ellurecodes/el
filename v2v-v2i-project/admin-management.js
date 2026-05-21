// ================================================================
//  V2X ADMIN MANAGEMENT MODULE — v1.0
//  
//  Handles all admin-related operations:
//  - Add/remove admins by email
//  - Manage pending invites
//  - Ban/unban users
//  - Real-time list updates
//  
//  Use in: admin.html + login.html (control.html coming soon)
// ================================================================

class V2XAdminManager {
  constructor(dbRef, authRef) {
    this.db = dbRef;
    this.auth = authRef;
    this.listeners = {};
    this.dataSnapshot = {
      users: {},
      admins: {},
      banned: {},
      pending: {},
    };
  }

  /**
   * startRealtime() — Attach Firebase listeners for live updates
   */
  startRealtime() {
    if (this.listeners.users) return; // Already listening

    this.listeners.users = this.db.ref('v4/users').on('value', snap => {
      this.dataSnapshot.users = snap.val() || {};
      this._dispatchEvent('users-updated', { data: this.dataSnapshot.users });
    });

    this.listeners.admins = this.db.ref('v4/admins').on('value', snap => {
      this.dataSnapshot.admins = snap.val() || {};
      this._dispatchEvent('admins-updated', { data: this.dataSnapshot.admins });
    });

    this.listeners.banned = this.db.ref('v4/banned').on('value', snap => {
      this.dataSnapshot.banned = snap.val() || {};
      this._dispatchEvent('banned-updated', { data: this.dataSnapshot.banned });
    });

    this.listeners.pending = this.db.ref('v4/pending_admins').on('value', snap => {
      this.dataSnapshot.pending = snap.val() || {};
      this._dispatchEvent('pending-updated', { data: this.dataSnapshot.pending });
    });
  }

  /**
   * stopRealtime() — Detach all listeners (cleanup)
   */
  stopRealtime() {
    Object.keys(this.listeners).forEach(key => {
      this.db.ref('v4/' + key).off();
    });
    this.listeners = {};
  }

  /**
   * getStats() — Return aggregated statistics
   */
  getStats() {
    return {
      totalAdmins: Object.keys(this.dataSnapshot.admins).length,
      totalUsers: Object.keys(this.dataSnapshot.users).length,
      totalBanned: Object.keys(this.dataSnapshot.banned).length,
      totalPending: Object.keys(this.dataSnapshot.pending).length,
      superAdminCount: Object.values(this.dataSnapshot.admins).filter(a => a.isSuperAdmin).length,
      regularAdminCount: Object.values(this.dataSnapshot.admins).filter(a => !a.isSuperAdmin).length,
    };
  }

  /**
   * promoteUser(uid, email, name, addedByUid) → Promise
   * Promote a user to admin
   */
  async promoteUser(uid, email, name, addedByUid) {
    if (!uid || !email) throw new Error('Missing uid or email');

    return this.db.ref('v4/admins/' + uid).set({
      email,
      name: name || email.split('@')[0],
      isSuperAdmin: false,
      addedAt: new Date().toISOString(),
      addedBy: addedByUid || 'admin',
    });
  }

  /**
   * demoteUser(uid, email) → Promise
   * Remove admin access from user
   */
  async demoteUser(uid, email) {
    if (email === SUPER_ADMIN_EMAIL) {
      throw new Error('Cannot demote Super Admin');
    }
    return this.db.ref('v4/admins/' + uid).remove();
  }

  /**
   * banUser(uid, email, reason, bannedByUid) → Promise
   * Ban a user from signing in
   */
  async banUser(uid, email, reason, bannedByUid) {
    if (email === SUPER_ADMIN_EMAIL) {
      throw new Error('Cannot ban Super Admin');
    }

    const now = new Date().toISOString();
    return Promise.all([
      this.db.ref('v4/banned/' + uid).set({
        email,
        reason: reason || 'Removed by admin',
        bannedAt: now,
        bannedBy: bannedByUid || 'admin',
      }),
      this.db.ref('v4/admins/' + uid).remove(), // Remove admin if they had it
      this.db.ref('v4/users/' + uid + '/status').set('banned'),
    ]);
  }

  /**
   * unbanUser(uid) → Promise
   * Remove ban from a user
   */
  async unbanUser(uid) {
    return Promise.all([
      this.db.ref('v4/banned/' + uid).remove(),
      this.db.ref('v4/users/' + uid + '/status').set('active'),
    ]);
  }

  /**
   * removeUser(uid) → Promise
   * Delete user record entirely
   */
  async removeUser(uid) {
    return this.db.ref('v4/users/' + uid).remove();
  }

  /**
   * inviteAdminByEmail(email, addedByUid) → Promise
   * Pre-approve an email as admin (they get promoted on first login)
   */
  async inviteAdminByEmail(email, addedByUid) {
    const emailLower = email.toLowerCase();

    // Check if already admin
    const adminExists = Object.values(this.dataSnapshot.admins)
      .find(a => (a.email || '').toLowerCase() === emailLower);
    if (adminExists) throw new Error('Already an admin');

    // Check if already pending
    const pendingExists = Object.values(this.dataSnapshot.pending)
      .find(p => (p.email || '').toLowerCase() === emailLower);
    if (pendingExists) throw new Error('Already has pending invite');

    const now = new Date().toISOString();
    const key = emailLower.replace(/[@.]/g, '_') + '_' + Date.now();

    return this.db.ref('v4/pending_admins/' + key).set({
      email: emailLower,
      addedBy: addedByUid || 'admin',
      addedAt: now,
    });
  }

  /**
   * cancelInvite(inviteKey) → Promise
   * Cancel a pending admin invite
   */
  async cancelInvite(inviteKey) {
    return this.db.ref('v4/pending_admins/' + inviteKey).remove();
  }

  /**
   * getUsersFiltered(searchQuery, filterType) → Array
   * Get filtered user list
   * filterType: 'all' | 'admin' | 'banned'
   */
  getUsersFiltered(searchQuery = '', filterType = 'all') {
    let results = Object.entries(this.dataSnapshot.users);

    // Search by name or email
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(([_, u]) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    // Filter by type
    if (filterType === 'admin') {
      results = results.filter(([uid]) => !!this.dataSnapshot.admins[uid]);
    } else if (filterType === 'banned') {
      results = results.filter(([uid, u]) =>
        u.status === 'banned' || !!this.dataSnapshot.banned[uid]
      );
    }

    return results;
  }

  /**
   * getAdminsList() → Array<[uid, adminData]>
   * Get all admins, sorted by isSuperAdmin first
   */
  getAdminsList() {
    return Object.entries(this.dataSnapshot.admins).sort((a, b) => {
      // Super admins first
      if (b[1].isSuperAdmin && !a[1].isSuperAdmin) return 1;
      if (a[1].isSuperAdmin && !b[1].isSuperAdmin) return -1;
      // Then by date (newest first)
      return new Date(b[1].addedAt) - new Date(a[1].addedAt);
    });
  }

  /**
   * getPendingList() → Array<[key, pendingData]>
   */
  getPendingList() {
    return Object.entries(this.dataSnapshot.pending).sort((a, b) =>
      new Date(b[1].addedAt) - new Date(a[1].addedAt)
    );
  }

  /**
   * isUserAdmin(uid) → Boolean
   * Quick check if a user is admin
   */
  isUserAdmin(uid) {
    return !!this.dataSnapshot.admins[uid];
  }

  /**
   * isUserBanned(uid) → Boolean
   * Quick check if a user is banned
   */
  isUserBanned(uid) {
    return !!this.dataSnapshot.banned[uid];
  }

  /**
   * getUserInfo(uid) → Object | null
   */
  getUserInfo(uid) {
    return this.dataSnapshot.users[uid] || null;
  }

  /**
   * getAdminInfo(uid) → Object | null
   */
  getAdminInfo(uid) {
    return this.dataSnapshot.admins[uid] || null;
  }

  // ── EVENTS ──
  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    if (typeof callback === 'function') {
      document.addEventListener('v2x-admin-' + type, callback);
    }
  }

  off(type, callback) {
    if (typeof callback === 'function') {
      document.removeEventListener('v2x-admin-' + type, callback);
    }
  }

  _dispatchEvent(type, detail) {
    document.dispatchEvent(new CustomEvent('v2x-admin-' + type, { detail }));
  }
}

// ── EXPORT: if using modules ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = V2XAdminManager;
}

// ================================================================
//  USAGE EXAMPLE:
//
//  const admin = new V2XAdminManager(db, auth);
//  admin.startRealtime();
//  
//  admin.on('admins-updated', (e) => {
//    console.log('Admins:', admin.getStats());
//  });
//  
//  await admin.promoteUser(uid, 'user@example.com', 'User Name', currentAdminUid);
//  await admin.inviteAdminByEmail('newemail@example.com', currentAdminUid);
//  await admin.banUser(uid, 'baduser@example.com', 'Spam', currentAdminUid);
//
// ================================================================
