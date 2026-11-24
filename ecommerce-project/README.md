# Technova — PC Building & CCTV E-Commerce Platform

A full-stack e-commerce website for buying PC components (with a guided,
compatibility-checked PC Builder) and CCTV security equipment.

> Clone this repo, follow **Setup** below, and you'll have the site running
> locally. See `docs/technova-design-document.md` for the requirement
> analysis, DFDs, ER diagram and system design.

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework/build step)
- **Backend:** Node.js + Express REST API
- **Database:** Microsoft SQL Server
- **PDF invoices:** generated in the browser with jsPDF, downloadable after every order

```
ecommerce-project/
├── frontend/                 # static site — open directly or serve with any web server
│   ├── index.html            # home page
│   ├── products.html         # catalog with search/filter
│   ├── product.html          # single product detail page
│   ├── pc-builder.html       # guided PC builder with compatibility engine
│   ├── cart.html
│   ├── checkout.html
│   ├── order-success.html    # confirmation + "Download PDF invoice"
│   ├── orders.html           # order history + re-download invoices
│   ├── login.html / register.html
│   ├── admin.html            # admin dashboard, products, orders, customers, inventory
│   ├── css/style.css
│   └── js/                   # api.js, components.js, products.js, pcbuilder.js,
│                              # cart.js, checkout.js, invoice.js, auth.js, admin.js
└── backend/
    ├── server.js              # Express app entry point
    ├── config/db.js           # SQL Server connection pool
    ├── middleware/auth.js     # JWT auth + admin guard
    ├── routes/                # auth, products, categories, pcbuilder, cart, orders, admin
    ├── database/schema.sql    # full SQL Server schema
    ├── database/seed.sql      # sample categories + products
    ├── utils/hashPassword.js  # helper to bcrypt-hash an admin password
    └── package.json
```

---

## Setup

## 1. Set up the database (SQL Server)

1. Install SQL Server (Express edition is fine) and SQL Server Management
   Studio (SSMS), or use a Docker container:
   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong!Passw0rd" \
     -p 1433:1433 --name technova-sql -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. Connect with SSMS (or `sqlcmd`) and create the database:
   ```sql
   CREATE DATABASE TechnovaDB;
   ```
3. Run `backend/database/schema.sql` against `TechnovaDB` to create all tables.
4. Run `backend/database/seed.sql` to load sample categories and products.
5. Create a real admin password hash instead of the placeholder in `seed.sql`:
   ```bash
   cd backend
   npm install
   npm run hash -- YourAdminPassword123
   ```
   Copy the printed hash and update the admin row:
   ```sql
   UPDATE Users SET PasswordHash = '<paste hash here>' WHERE Email = 'admin@technova.com';
   ```
   (Or simply register a normal account on the site, then run
   `UPDATE Users SET Role = 'admin' WHERE Email = 'you@example.com';`.)

## 2. Run the backend API

```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your real SQL Server credentials
npm start                   # or: npm run dev (auto-restarts on changes)
```

The API starts on `http://localhost:5000` by default. Check it's alive:
`GET http://localhost:5000/api/health` → `{ "status": "ok" }`.

## 3. Run the frontend

The frontend is plain static HTML/CSS/JS — no build step required.

- **Easiest:** open `frontend/index.html` directly in a browser, or
- **Recommended:** serve it so relative paths and CORS behave normally, e.g.
  with the VS Code "Live Server" extension, or:
  ```bash
  cd frontend
  npx serve .        # or: python -m http.server 5500
  ```

If your frontend runs on a different port than `5000`, update:
- `CLIENT_ORIGIN` in `backend/.env` (for CORS), and
- `API_BASE` at the top of `frontend/js/api.js` if your backend isn't on
  `http://localhost:5000`.

## 4. Try it out

1. Register a customer account (`register.html`).
2. Browse **PC Parts** or **CCTV** from the nav, or use **Build a PC** to
   assemble a compatible machine step by step — the builder blocks
   mismatched sockets, RAM types, case sizes and under-powered PSUs.
3. Add items to the cart, check out with a shipping address and payment
   method, and land on the confirmation page.
4. Click **Download PDF invoice** — a tax invoice PDF is generated in the
   browser and downloaded immediately. Every past order can be
   re-downloaded from **My Orders**.
5. Log in as the admin account to manage products, categories, inventory,
   orders and customers from `admin.html`.

---

## How the PC Builder compatibility engine works

Each PC-part category (`Categories.SlotType`) stores extra compatibility
columns on `Products`: `Socket`, `RamType`, `FormFactor`,
`WattageNeeded`/`WattageSupplied`. When you pick a part in the wizard:

1. `GET /api/pcbuilder/options/:slot` filters the next slot's options
   (e.g. once a motherboard is chosen, the RAM list only shows the matching
   `RamType`).
2. `POST /api/pcbuilder/validate` re-checks the *entire* build server-side
   before it can be added to the cart — covering CPU/board socket, RAM
   type, case/board form factor, PSU wattage vs GPU requirement, and stock.
3. Only a build with zero issues (and at minimum a CPU + motherboard + RAM)
   can be added to the cart or saved to your account.

## Security notes for production use

This project is built as a learning/demo reference. Before deploying it
for real customers, you'd want to add: HTTPS, stronger password/email
validation, real payment-gateway integration (Razorpay/Stripe) instead of
the placeholder Card/UPI/COD options, CSRF protection, rate limiting,
server-side pagination hardening, and moving the JWT secret and DB
credentials into a secrets manager.
