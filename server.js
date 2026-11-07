const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dbModule = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// DASHBOARD STATS API
// -------------------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  try {
    const stats = dbModule.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// DONORS API
// -------------------------------------------------------------
// GET /api/donors
app.get('/api/donors', (req, res) => {
  try {
    const { search, blood_group } = req.query;
    const donors = dbModule.donorQueries.getAll(search, blood_group);
    res.json({ success: true, data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/donors/:id
app.get('/api/donors/:id', (req, res) => {
  try {
    const donor = dbModule.donorQueries.getById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, error: 'Donor not found' });
    res.json({ success: true, data: donor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/donors
app.post('/api/donors', (req, res) => {
  try {
    const { name, age, gender, blood_group, phone } = req.body;
    if (!name || !age || !gender || !blood_group || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    const result = dbModule.donorQueries.create(name, age, gender, blood_group, phone);
    res.status(201).json({ success: true, message: 'Donor registered successfully', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/donors/:id
app.put('/api/donors/:id', (req, res) => {
  try {
    const { name, age, gender, blood_group, phone } = req.body;
    if (!name || !age || !gender || !blood_group || !phone) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    dbModule.donorQueries.update(req.params.id, name, age, gender, blood_group, phone);
    res.json({ success: true, message: 'Donor details updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/donors/:id
app.delete('/api/donors/:id', (req, res) => {
  try {
    dbModule.donorQueries.delete(req.params.id);
    res.json({ success: true, message: 'Donor deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/donors/:id/donate (Record Donation -> updates blood_stock)
app.post('/api/donors/:id/donate', (req, res) => {
  try {
    const units = parseInt(req.body.units, 10) || 1;
    const result = dbModule.recordDonation(req.params.id, units);
    res.json({
      success: true,
      message: `Donation recorded: +${units} unit(s) added to ${result.blood_group} stock!`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// BLOOD STOCK API
// -------------------------------------------------------------
// GET /api/stock
app.get('/api/stock', (req, res) => {
  try {
    const stock = dbModule.stockQueries.getAll();
    res.json({ success: true, data: stock });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/stock/:bloodGroup
app.put('/api/stock/:bloodGroup', (req, res) => {
  try {
    const { bloodGroup } = req.params;
    const { units, isAbsolute } = req.body;
    if (units === undefined || units === null) {
      return res.status(400).json({ success: false, error: 'Units value is required.' });
    }
    dbModule.stockQueries.updateUnits(bloodGroup, parseInt(units, 10), !!isAbsolute);
    const updated = dbModule.stockQueries.getByGroup(bloodGroup);
    res.json({ success: true, message: `Stock for ${bloodGroup} updated successfully`, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// BLOOD REQUESTS API
// -------------------------------------------------------------
// GET /api/requests
app.get('/api/requests', (req, res) => {
  try {
    const { status } = req.query;
    const requests = dbModule.requestQueries.getAll(status);
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/requests
app.post('/api/requests', (req, res) => {
  try {
    const { hospital_name, blood_group, units_required, request_date } = req.body;
    if (!hospital_name || !blood_group || !units_required) {
      return res.status(400).json({ success: false, error: 'Hospital name, blood group, and units required are mandatory.' });
    }
    const result = dbModule.requestQueries.create(hospital_name, blood_group, units_required, request_date);
    res.status(201).json({ success: true, message: 'Blood request registered successfully', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/requests/:id/status
app.patch('/api/requests/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use Pending, Approved, or Rejected.' });
    }
    dbModule.requestQueries.updateStatus(req.params.id, status);
    res.json({ success: true, message: `Request status changed to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/requests/:id/fulfill (Fulfill Request -> deducts stock)
app.post('/api/requests/:id/fulfill', (req, res) => {
  try {
    const result = dbModule.fulfillRequest(req.params.id);
    res.json({
      success: true,
      message: `Request fulfilled: ${result.units_deducted} unit(s) of ${result.blood_group} issued to ${result.hospital_name}.`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/requests/:id
app.delete('/api/requests/:id', (req, res) => {
  try {
    dbModule.requestQueries.delete(req.params.id);
    res.json({ success: true, message: 'Blood request deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// UTILITY & DEMO APIs
// -------------------------------------------------------------
// Reset demo data
app.post('/api/reset', (req, res) => {
  try {
    dbModule.resetData();
    res.json({ success: true, message: 'Database reset to demo state with fresh sample records!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// View schema.sql content
app.get('/api/schema', (req, res) => {
  try {
    const schemaContent = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(schemaContent);
  } catch (err) {
    res.status(500).send('Unable to load schema.sql: ' + err.message);
  }
});

// Fallback to index.html for SPA-like navigation (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏥 Blood Bank Management System (Project 14) Running`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
