# 🩸 LifePulse — Blood Bank Management System
**Full Stack Development (FSD) Mini-Project #14**

A complete, production-ready Full Stack Web Application for managing blood bank operations, donor registrations, real-time blood inventory tracking, and hospital requisition fulfillment.

---

## 📌 Project Overview
> **Project Goal:** Maintain information about blood donors and available blood units. Hospitals can request blood. Blood stock can be updated after donations and issue transactions.

---

## 🗄️ Database Architecture & Schema

The application strictly implements the schema requirements with primary keys and standard column types:

### 1. `donors` Table
Stores registered blood donors and their contact information.
| Field | Type | Attributes | Description |
|---|---|---|---|
| `donor_id` | INT | Primary Key, Auto-Increment | Unique Donor Identifier |
| `name` | VARCHAR(100) | NOT NULL | Donor's Full Name |
| `age` | INT | NOT NULL | Age (18 - 65) |
| `gender` | VARCHAR(10) | NOT NULL | Gender (Male / Female / Other) |
| `blood_group` | VARCHAR(5) | NOT NULL | Blood Group (A+, A-, B+, B-, AB+, AB-, O+, O-) |
| `phone` | VARCHAR(15) | NOT NULL | Contact Phone Number |

### 2. `blood_stock` Table
Maintains live units inventory for all 8 standard blood groups with automated timestamps.
| Field | Type | Attributes | Description |
|---|---|---|---|
| `stock_id` | INT | Primary Key, Auto-Increment | Unique Stock Entry ID |
| `blood_group` | VARCHAR(5) | NOT NULL, UNIQUE | Blood Group (A+, A-, B+, etc.) |
| `units_available` | INT | NOT NULL, DEFAULT 0 | Available Units in Storage |
| `last_updated` | DATE | NOT NULL | Date when stock was last altered |

### 3. `blood_requests` Table
Tracks hospital emergency and elective blood requisitions and workflow states.
| Field | Type | Attributes | Description |
|---|---|---|---|
| `request_id` | INT | Primary Key, Auto-Increment | Unique Requisition ID |
| `hospital_name` | VARCHAR(150) | NOT NULL | Name of Requesting Hospital / Clinic |
| `blood_group` | VARCHAR(5) | NOT NULL | Blood Group Requested |
| `units_required` | INT | NOT NULL | Number of Units Demanded |
| `request_date` | DATE | NOT NULL | Requisition Date |
| `status` | VARCHAR(30) | NOT NULL | Workflow Status (`Pending`, `Approved`, `Fulfilled`, `Rejected`) |

---

## 🚀 Key Functional Features

1. **Executive Operations Dashboard**:
   - Live KPI cards: Total Registered Donors, Total Blood Units in Storage, Pending Requisitions, and Dispatched Issues.
   - Interactive visual inventory gauge for each of the 8 blood groups (color-coded for Adequate, Low, or Critical shortage).
   - Quick-action widgets for recent hospital requests and recent donors.

2. **Voluntary Donor Management**:
   - Register new donors with form validation (valid age range 18-65, standard blood groups).
   - Search donors dynamically by name or contact number.
   - Filter donors by blood type.
   - **One-Click Live Donation Transaction**: Automatically credits units into `blood_stock` and updates `last_updated`.
   - Edit donor information or delete records.

3. **Blood Stock Inventory**:
   - Direct inventory inspection matching the `blood_stock` schema.
   - Real-time stock status badges (Adequate / Low / Critical Shortage).
   - Manual stock adjustment modal with audit timestamps.
   - Built-in blood compatibility triage matrix (Universal donor O-, Universal recipient AB+).

4. **Hospital Requisition & Issue Workflow**:
   - Hospitals submit requests with hospital name, blood group, required units, and date.
   - Approval / Rejection lifecycle.
   - **Atomic Issue & Fulfillment Transaction**:
     - Automatically verifies if sufficient units exist in `blood_stock`.
     - Atomically deducts required units and updates `last_updated`.
     - Marks request as `Fulfilled`.
     - Prevents fulfilling requests if inventory is insufficient and shows an exact shortfall alert.

5. **SQL Export & Reset Tools**:
   - Interactive in-app viewer for `schema.sql` with a 1-click copy feature.
   - "Reset Demo Data" button to instantly populate clean sample test records.

---

## 💻 Tech Stack
- **Backend**: Node.js & Express.js REST API
- **Database**: SQLite (`better-sqlite3`) pre-configured with zero configuration + `schema.sql` for MySQL Workbench / phpMyAdmin
- **Frontend**: HTML5, CSS3, Modern ES6+ JavaScript, Tailwind CSS, FontAwesome

---

## ⚡ How to Run the Website

### Method 1: Double-Click
Simply double-click the **`start.bat`** file in this folder! It will automatically start the server and open your browser.

### Method 2: Via Terminal / Command Prompt
```bash
npm start
```
Then open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔌 REST API Endpoints Reference

### Donors
- `GET /api/donors` — List all donors (supports `?search=` and `?blood_group=`)
- `GET /api/donors/:id` — Get donor details by ID
- `POST /api/donors` — Register new donor
- `PUT /api/donors/:id` — Update donor details
- `DELETE /api/donors/:id` — Remove donor
- `POST /api/donors/:id/donate` — Record blood donation transaction (adds units to stock)

### Blood Stock
- `GET /api/stock` — Get live stock inventory of all 8 blood groups
- `PUT /api/stock/:bloodGroup` — Adjust units for a specific blood group

### Blood Requests
- `GET /api/requests` — List requisitions (supports `?status=`)
- `POST /api/requests` — Submit new hospital requisition
- `PATCH /api/requests/:id/status` — Change status (`Pending`, `Approved`, `Rejected`)
- `POST /api/requests/:id/fulfill` — Issue units & fulfill requisition (deducts stock)
- `DELETE /api/requests/:id` — Delete requisition

### System & Utilities
- `GET /api/dashboard` — Aggregated KPI statistics & recent records
- `POST /api/reset` — Reset database to default demonstration records
- `GET /api/schema` — Download or view the raw `schema.sql` file
