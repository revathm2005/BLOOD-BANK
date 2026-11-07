const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'blood_bank.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize Tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donors (
      donor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blood_stock (
      stock_id INTEGER PRIMARY KEY AUTOINCREMENT,
      blood_group TEXT NOT NULL UNIQUE,
      units_available INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blood_requests (
      request_id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital_name TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      units_required INTEGER NOT NULL,
      request_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
    );
  `);

  // Ensure all 8 blood groups exist in blood_stock
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const today = new Date().toISOString().split('T')[0];

  const checkStock = db.prepare('SELECT COUNT(*) as count FROM blood_stock').get();
  if (checkStock.count === 0) {
    const insertStock = db.prepare(`
      INSERT INTO blood_stock (blood_group, units_available, last_updated)
      VALUES (?, ?, ?)
    `);

    const initialStock = [
      ['A+', 15],
      ['A-', 6],
      ['B+', 22],
      ['B-', 5],
      ['AB+', 9],
      ['AB-', 3],
      ['O+', 28],
      ['O-', 7]
    ];

    const seedStockTx = db.transaction(() => {
      for (const [bg, units] of initialStock) {
        insertStock.run(bg, units, today);
      }
    });
    seedStockTx();
  }

  // Seed sample donors if empty
  const checkDonors = db.prepare('SELECT COUNT(*) as count FROM donors').get();
  if (checkDonors.count === 0) {
    const insertDonor = db.prepare(`
      INSERT INTO donors (name, age, gender, blood_group, phone)
      VALUES (?, ?, ?, ?, ?)
    `);

    const sampleDonors = [
      ['Aarav Sharma', 28, 'Male', 'O+', '9876543210'],
      ['Priya Patel', 24, 'Female', 'A+', '9812345678'],
      ['Rahul Verma', 32, 'Male', 'B+', '9823456789'],
      ['Ananya Iyer', 29, 'Female', 'AB+', '9834567890'],
      ['Rohan Kulkarni', 35, 'Male', 'O-', '9845678901'],
      ['Sneha Reddy', 27, 'Female', 'B-', '9856789012'],
      ['Vikram Singh', 41, 'Male', 'A-', '9867890123'],
      ['Kavita Rao', 30, 'Female', 'AB-', '9878901234']
    ];

    const seedDonorsTx = db.transaction(() => {
      for (const donor of sampleDonors) {
        insertDonor.run(...donor);
      }
    });
    seedDonorsTx();
  }

  // Seed sample hospital requests if empty
  const checkRequests = db.prepare('SELECT COUNT(*) as count FROM blood_requests').get();
  if (checkRequests.count === 0) {
    const insertRequest = db.prepare(`
      INSERT INTO blood_requests (hospital_name, blood_group, units_required, request_date, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const sampleRequests = [
      ['City Apollo Hospital', 'O+', 3, today, 'Pending'],
      ['St. John Medical Center', 'A+', 2, today, 'Approved'],
      ['LifeCare Super Specialty Hospital', 'B-', 1, today, 'Fulfilled'],
      ['Global Health Institute', 'AB+', 2, today, 'Pending'],
      ['Sunrise Emergency Care', 'O-', 4, today, 'Pending']
    ];

    const seedRequestsTx = db.transaction(() => {
      for (const req of sampleRequests) {
        insertRequest.run(...req);
      }
    });
    seedRequestsTx();
  }
}

// Run table initialization
initDatabase();

// --- DONOR MODEL OPERATIONS ---
const donorQueries = {
  getAll: (search = '', bloodGroup = '') => {
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (bloodGroup && bloodGroup !== 'ALL') {
      sql += ' AND blood_group = ?';
      params.push(bloodGroup);
    }
    sql += ' ORDER BY donor_id DESC';
    return db.prepare(sql).all(...params);
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM donors WHERE donor_id = ?').get(id);
  },

  create: (name, age, gender, bloodGroup, phone) => {
    const info = db.prepare(`
      INSERT INTO donors (name, age, gender, blood_group, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, parseInt(age, 10), gender, bloodGroup, phone);
    return { donor_id: info.lastInsertRowid };
  },

  update: (id, name, age, gender, bloodGroup, phone) => {
    return db.prepare(`
      UPDATE donors
      SET name = ?, age = ?, gender = ?, blood_group = ?, phone = ?
      WHERE donor_id = ?
    `).run(name, parseInt(age, 10), gender, bloodGroup, phone, id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM donors WHERE donor_id = ?').run(id);
  }
};

// --- BLOOD STOCK MODEL OPERATIONS ---
const stockQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM blood_stock ORDER BY blood_group ASC').all();
  },

  getByGroup: (bloodGroup) => {
    return db.prepare('SELECT * FROM blood_stock WHERE blood_group = ?').get(bloodGroup);
  },

  updateUnits: (bloodGroup, unitsChange, isAbsolute = false) => {
    const today = new Date().toISOString().split('T')[0];
    if (isAbsolute) {
      return db.prepare(`
        UPDATE blood_stock
        SET units_available = MAX(0, ?), last_updated = ?
        WHERE blood_group = ?
      `).run(unitsChange, today, bloodGroup);
    } else {
      return db.prepare(`
        UPDATE blood_stock
        SET units_available = MAX(0, units_available + ?), last_updated = ?
        WHERE blood_group = ?
      `).run(unitsChange, today, bloodGroup);
    }
  },

  getTotalUnits: () => {
    const row = db.prepare('SELECT SUM(units_available) as total FROM blood_stock').get();
    return row.total || 0;
  }
};

// --- BLOOD REQUEST MODEL OPERATIONS ---
const requestQueries = {
  getAll: (statusFilter = '') => {
    let sql = 'SELECT * FROM blood_requests WHERE 1=1';
    const params = [];
    if (statusFilter && statusFilter !== 'ALL') {
      sql += ' AND status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY request_id DESC';
    return db.prepare(sql).all(...params);
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM blood_requests WHERE request_id = ?').get(id);
  },

  create: (hospitalName, bloodGroup, unitsRequired, requestDate) => {
    const date = requestDate || new Date().toISOString().split('T')[0];
    const info = db.prepare(`
      INSERT INTO blood_requests (hospital_name, blood_group, units_required, request_date, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `).run(hospitalName, bloodGroup, parseInt(unitsRequired, 10), date);
    return { request_id: info.lastInsertRowid };
  },

  updateStatus: (id, status) => {
    return db.prepare('UPDATE blood_requests SET status = ? WHERE request_id = ?').run(status, id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM blood_requests WHERE request_id = ?').run(id);
  }
};

// --- TRANSACTION WORKFLOWS (Core Project Requirements) ---

// 1. Record a Donation: Increments stock for donor's blood group and updates last_updated
function recordDonation(donorId, units = 1) {
  const donor = donorQueries.getById(donorId);
  if (!donor) {
    throw new Error('Donor not found');
  }

  const tx = db.transaction(() => {
    stockQueries.updateUnits(donor.blood_group, units, false);
    return {
      success: true,
      donor_id: donor.donor_id,
      name: donor.name,
      blood_group: donor.blood_group,
      units_added: units
    };
  });

  return tx();
}

// 2. Fulfill a Hospital Request: Validates stock and atomically deducts units
function fulfillRequest(requestId) {
  const req = requestQueries.getById(requestId);
  if (!req) {
    throw new Error('Request not found');
  }
  if (req.status === 'Fulfilled') {
    throw new Error('Request is already fulfilled');
  }

  const stock = stockQueries.getByGroup(req.blood_group);
  if (!stock || stock.units_available < req.units_required) {
    const available = stock ? stock.units_available : 0;
    throw new Error(`Insufficient stock for ${req.blood_group}. Requested: ${req.units_required} units, Available: ${available} units.`);
  }

  const tx = db.transaction(() => {
    // Deduct stock
    stockQueries.updateUnits(req.blood_group, -req.units_required, false);
    // Mark request as fulfilled
    requestQueries.updateStatus(requestId, 'Fulfilled');
    return {
      success: true,
      request_id: requestId,
      hospital_name: req.hospital_name,
      blood_group: req.blood_group,
      units_deducted: req.units_required,
      remaining_stock: stock.units_available - req.units_required
    };
  });

  return tx();
}

// Reset data to initial demo state
function resetData() {
  db.exec(`
    DELETE FROM donors;
    DELETE FROM blood_stock;
    DELETE FROM blood_requests;
  `);
  initDatabase();
}

// Dashboard statistics aggregation
function getDashboardStats() {
  const totalDonors = db.prepare('SELECT COUNT(*) as count FROM donors').get().count;
  const totalUnits = stockQueries.getTotalUnits();
  const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'Pending'").get().count;
  const fulfilledRequests = db.prepare("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'Fulfilled'").get().count;
  const stockList = stockQueries.getAll();
  const recentRequests = db.prepare('SELECT * FROM blood_requests ORDER BY request_id DESC LIMIT 5').all();
  const recentDonors = db.prepare('SELECT * FROM donors ORDER BY donor_id DESC LIMIT 5').all();

  return {
    totalDonors,
    totalUnits,
    pendingRequests,
    fulfilledRequests,
    stockList,
    recentRequests,
    recentDonors
  };
}

module.exports = {
  db,
  donorQueries,
  stockQueries,
  requestQueries,
  recordDonation,
  fulfillRequest,
  resetData,
  getDashboardStats
};
