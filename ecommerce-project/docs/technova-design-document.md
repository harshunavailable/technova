# Technova — Requirement Analysis & System Design Document
### PC Building & CCTV E-Commerce Platform

---

## 1. Introduction

Technova is a two-in-one e-commerce platform that lets customers (a) buy individual PC components with a guided, compatibility-checked builder, and (b) buy CCTV/security equipment for homes, offices and shops — all through one account, one cart and one checkout. This document covers requirement analysis, Data Flow Diagrams (Level 0–2), the ER diagram and database design, and the overall system design.

---

## 2. Requirement Analysis

### 2.1 Stakeholders / User Classes

| User Class | Description |
|---|---|
| **Guest** | Unregistered visitor; can browse and search products but cannot buy |
| **Customer** | Registered user; can build PCs, buy products, manage cart/orders, download invoices |
| **Administrator** | Manages catalog, categories, inventory, orders and customers |

### 2.2 Functional Requirements

| ID | Module | Requirement |
|---|---|---|
| FR-01 | Authentication | System shall allow a guest to register with name, email, phone and password |
| FR-02 | Authentication | System shall authenticate registered users via email + password and issue a session token |
| FR-03 | Catalog | System shall let users browse products by section (PC / CCTV), category, price and search keyword |
| FR-04 | Catalog | System shall display full product detail: specs, price, stock, images, rating |
| FR-05 | PC Builder | System shall let a customer pick one component per slot (CPU, Motherboard, RAM, GPU, Storage, PSU, Cabinet, Monitor) |
| FR-06 | PC Builder | System shall filter each slot's options to only those compatible with prior selections (socket, RAM type, form factor, wattage) |
| FR-07 | PC Builder | System shall validate the complete build and block checkout if any incompatibility or stock issue exists |
| FR-08 | PC Builder | System shall allow a customer to save a build to their account for later |
| FR-09 | Cart | System shall let a customer add, update quantity, and remove products from a persistent cart |
| FR-10 | Checkout | System shall collect a shipping address and payment method, then create an order |
| FR-11 | Checkout | System shall calculate subtotal, tax and shipping, deduct stock, and clear the cart atomically |
| FR-12 | Orders | System shall let a customer view past orders and their status |
| FR-13 | Invoice | System shall generate a downloadable PDF invoice for any completed order |
| FR-14 | Admin | System shall let an admin create, edit and deactivate products and categories |
| FR-15 | Admin | System shall let an admin update stock levels and view low-stock items |
| FR-16 | Admin | System shall let an admin view all orders and update order status |
| FR-17 | Admin | System shall let an admin view registered customers and dashboard KPIs (revenue, order/customer/product counts) |

### 2.3 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Product listing queries shall return in under 1 second for catalogs up to ~10,000 products (indexed on CategoryID) |
| **Security** | Passwords stored only as bcrypt hashes; all state-changing endpoints require a valid JWT; all SQL executed via parameterized queries |
| **Usability** | Responsive layout usable on mobile and desktop; compatibility errors shown in plain language, not error codes |
| **Availability** | Backend stateless behind a connection pool so it can be horizontally scaled / restarted without data loss |
| **Scalability** | Product and order tables indexed for growth; pagination on all list endpoints |
| **Maintainability** | Layered architecture (routes → middleware → data layer) so backend logic, UI and schema evolve independently |
| **Data Integrity** | Order placement wrapped in a database transaction — stock, order and order-items always stay consistent |
| **Portability** | Frontend is framework-free HTML/CSS/JS; backend is a standard Node/Express + SQL Server stack deployable on any host |

### 2.4 Assumptions & Constraints

- Single currency (INR) and single-warehouse inventory model.
- Payment gateway integration (Razorpay/Stripe) is out of scope for this version; COD/Card/UPI are captured as a payment method label only.
- One default shipping address is collected per order (no saved multi-address book in v1).

---

## 3. Data Flow Diagrams

### 3.1 Level 0 — Context Diagram

The entire platform is treated as a single process, showing only its boundary with external entities.

```mermaid
flowchart LR
    CUST[Customer]
    ADMIN[Administrator]
    SYS((0.0<br/>Technova<br/>E-Commerce System))

    CUST -- "Registration data, search/filter criteria,<br/>cart actions, order & shipping details" --> SYS
    SYS -- "Product listings, build compatibility results,<br/>order confirmation, PDF invoice" --> CUST

    ADMIN -- "Product/category data,<br/>stock updates, order status changes" --> SYS
    SYS -- "Dashboard KPIs, product/order/customer reports" --> ADMIN
```

### 3.2 Level 1 — Major Processes

Decomposes the single Level-0 process into the system's core subsystems and their data stores.

```mermaid
flowchart TB
    CUST[Customer]
    ADMIN[Administrator]

    P1((1.0<br/>User<br/>Authentication))
    P2((2.0<br/>Product Catalog<br/>Management))
    P3((3.0<br/>PC Builder &<br/>Compatibility Engine))
    P4((4.0<br/>Cart<br/>Management))
    P5((5.0<br/>Order & Invoice<br/>Processing))
    P6((6.0<br/>Admin<br/>Management))

    D1[(D1 Users)]
    D2[(D2 Categories /<br/>Products)]
    D3[(D3 PC Builds)]
    D4[(D4 Cart Items)]
    D5[(D5 Orders /<br/>Order Items)]

    CUST -- "name, email, password" --> P1
    P1 -- "auth token" --> CUST
    P1 <--> D1

    CUST -- "search / filter" --> P2
    P2 -- "product list / detail" --> CUST
    P2 <--> D2

    CUST -- "component selections" --> P3
    P3 -- "compatible options,<br/>validation result" --> CUST
    P3 <--> D2
    P3 --> D3

    CUST -- "add/update/remove item" --> P4
    P4 -- "cart contents & totals" --> CUST
    P4 <--> D4
    P4 -- "verified item data" --> D2

    CUST -- "shipping address,<br/>payment method" --> P5
    P5 -- "order confirmation,<br/>invoice data" --> CUST
    P5 <--> D5
    P5 -- "stock deduction" --> D2
    P5 -- "read cart, then clear" --> D4

    ADMIN -- "product / category /<br/>stock / order-status data" --> P6
    P6 -- "dashboard KPIs,<br/>tables" --> ADMIN
    P6 <--> D2
    P6 <--> D5
    P6 <--> D1
```

### 3.3 Level 2 — Decomposition of Key Processes

#### 3.3a Process 3.0 — PC Builder & Compatibility Engine

```mermaid
flowchart TB
    CUST[Customer]
    D2[(D2 Products)]
    D3[(D3 PC Builds)]

    P31((3.1<br/>Fetch Compatible<br/>Options per Slot))
    P32((3.2<br/>Select<br/>Component))
    P33((3.3<br/>Validate Full<br/>Build))
    P34((3.4<br/>Calculate<br/>Build Total))
    P35((3.5<br/>Save Build to<br/>Account))

    CUST -- "open slot (e.g. RAM)" --> P31
    P31 <-- "filter by socket/RAM<br/>type/form factor" --> D2
    P31 -- "filtered part list" --> CUST

    CUST -- "chosen part" --> P32
    P32 -- "updated selection" --> P33

    P33 <-- "read socket, RAM type,<br/>wattage, stock" --> D2
    P33 -- "issues list (if any)" --> CUST

    P33 --> P34
    P34 -- "running total price" --> CUST

    CUST -- "save request" --> P35
    P35 --> D3
```

#### 3.3b Process 5.0 — Order & Invoice Processing

```mermaid
flowchart TB
    CUST[Customer]
    D2[(D2 Products)]
    D4[(D4 Cart Items)]
    D5[(D5 Orders /<br/>Order Items)]

    P51((5.1<br/>Validate Cart<br/>& Stock))
    P52((5.2<br/>Calculate Subtotal,<br/>Tax & Shipping))
    P53((5.3<br/>Create Order &<br/>Order Items))
    P54((5.4<br/>Deduct Inventory<br/>& Clear Cart))
    P55((5.5<br/>Generate PDF<br/>Invoice))

    CUST -- "checkout request +<br/>shipping/payment info" --> P51
    P51 <-- "read cart items" --> D4
    P51 <-- "check stock" --> D2
    P51 -- "error if empty/out of stock" --> CUST

    P51 --> P52
    P52 --> P53
    P53 --> D5

    P53 --> P54
    P54 -- "update stock" --> D2
    P54 -- "delete cart rows" --> D4

    P54 -- "order confirmation" --> CUST
    CUST -- "download request" --> P55
    P55 <-- "read order + items" --> D5
    P55 -- "PDF invoice file" --> CUST
```

---

## 4. ER Diagram & Database Design

### 4.1 Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ ADDRESSES : "has"
    USERS ||--o{ CARTITEMS : "owns"
    USERS ||--o{ PCBUILDS : "saves"
    USERS ||--o{ ORDERS : "places"

    CATEGORIES ||--o{ PRODUCTS : "classifies"
    PRODUCTS ||--o{ CARTITEMS : "added as"
    PRODUCTS ||--o{ ORDERITEMS : "purchased as"

    ORDERS ||--|{ ORDERITEMS : "contains"

    USERS {
        int UserID PK
        nvarchar FullName
        nvarchar Email UK
        nvarchar PasswordHash
        nvarchar Phone
        varchar Role
        datetime2 CreatedAt
    }
    ADDRESSES {
        int AddressID PK
        int UserID FK
        nvarchar Line1
        nvarchar City
        nvarchar State
        nvarchar PostalCode
        nvarchar Country
        bit IsDefault
    }
    CATEGORIES {
        int CategoryID PK
        nvarchar Name
        varchar SectionType
        varchar SlotType
        nvarchar IconClass
    }
    PRODUCTS {
        int ProductID PK
        int CategoryID FK
        nvarchar Name
        nvarchar Brand
        decimal Price
        decimal DiscountPrice
        int Stock
        nvarchar ImageURL
        decimal Rating
        nvarchar SpecsJSON
        nvarchar Socket
        nvarchar RamType
        nvarchar FormFactor
        int WattageNeeded
        int WattageSupplied
        bit IsActive
    }
    CARTITEMS {
        int CartItemID PK
        int UserID FK
        int ProductID FK
        int Quantity
        datetime2 AddedAt
    }
    PCBUILDS {
        int BuildID PK
        int UserID FK
        nvarchar BuildName
        nvarchar ComponentsJSON
        decimal TotalPrice
        datetime2 CreatedAt
    }
    ORDERS {
        int OrderID PK
        int UserID FK
        datetime2 OrderDate
        decimal Subtotal
        decimal Tax
        decimal ShippingFee
        decimal TotalAmount
        varchar Status
        varchar PaymentMethod
        nvarchar ShippingLine1
        nvarchar ShippingCity
        nvarchar ShippingState
        nvarchar ShippingPostal
        nvarchar ShippingCountry
    }
    ORDERITEMS {
        int OrderItemID PK
        int OrderID FK
        int ProductID FK
        nvarchar ProductName
        decimal UnitPrice
        int Quantity
        decimal LineTotal
    }
```

### 4.2 Relationship Cardinality Summary

| Relationship | Cardinality | Notes |
|---|---|---|
| Users → Addresses | 1 : N | A user may store multiple shipping addresses |
| Users → CartItems | 1 : N | A user's cart is a set of rows, one per product |
| Users → PCBuilds | 1 : N | A user can save multiple builds |
| Users → Orders | 1 : N | Order history per user |
| Categories → Products | 1 : N | Each product belongs to exactly one category |
| Products → CartItems | 1 : N | A product can appear in many users' carts |
| Products → OrderItems | 1 : N | A product can appear across many past orders |
| Orders → OrderItems | 1 : N | An order contains one or more line items (identifying relationship) |

### 4.3 Data Dictionary Highlights

**Products** — the only table serving both catalog display *and* the PC-Builder compatibility engine. `Socket`, `RamType`, `FormFactor`, `WattageNeeded`/`WattageSupplied` are populated only for PC-part categories and stay `NULL` for CCTV items.

**Categories.SlotType** — drives the builder's slot list (`cpu`, `motherboard`, `ram`, `gpu`, `storage`, `psu`, `cabinet`, `monitor`); `NULL` for CCTV categories, which are grouped by `SectionType = 'CCTV'` instead.

**OrderItems.ProductName / UnitPrice** — intentionally denormalized (copied at purchase time) so historical invoices stay accurate even if a product is later renamed, repriced or deactivated.

**OrderItems.LineTotal** — a computed, persisted column (`UnitPrice * Quantity`), removing the need to recompute it in application code and keeping it consistent at the database level.

### 4.4 Normalization

The schema is in **Third Normal Form (3NF)**:
- 1NF: every column holds a single atomic value (the one exception, `SpecsJSON`, is intentionally semi-structured free-form spec data that varies per product type, not a repeating group).
- 2NF: every non-key attribute depends on the whole primary key (all tables use single-column surrogate keys, so partial dependency cannot occur).
- 3NF: no transitive dependencies — e.g. `CategoryName` is never stored on `Products`, only `CategoryID`, and is joined in at query time.

---

## 5. System Design

### 5.1 Architecture — 3-Tier

```mermaid
flowchart LR
    subgraph Presentation Tier
        A[HTML / CSS / JavaScript<br/>Browser Client]
    end
    subgraph Application Tier
        B[Node.js + Express REST API<br/>Auth · Products · PC Builder<br/>Cart · Orders · Admin]
    end
    subgraph Data Tier
        C[(Microsoft SQL Server<br/>TechnovaDB)]
    end

    A -- "HTTPS / fetch()<br/>JSON + JWT" --> B
    B -- "JSON responses" --> A
    B -- "Parameterized SQL<br/>via connection pool" --> C
    C -- "Result sets" --> B
```

### 5.2 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript | Structure, styling, client-side logic — no build step |
| PDF generation | jsPDF (client-side) | Renders and downloads the order invoice in-browser |
| Backend | Node.js, Express.js | REST API, routing, business logic |
| Auth | JSON Web Tokens (JWT), bcrypt | Stateless session tokens; salted password hashing |
| Database | Microsoft SQL Server | Persistent storage, transactions, referential integrity |
| DB driver | `mssql` (Node), `pyodbc` (Python tooling) | Connection pooling and parameterized queries |

### 5.3 Module Design

| Module | Responsibility |
|---|---|
| `routes/auth.js` | Register, login, JWT issuance |
| `routes/products.js` | Catalog search/filter/pagination, product detail |
| `routes/categories.js` | Category listing by section |
| `routes/pcbuilder.js` | Slot-filtered options, build validation, save build |
| `routes/cart.js` | Add/update/remove/clear cart (auth required) |
| `routes/orders.js` | Transactional checkout, order history, invoice data |
| `routes/admin.js` | Dashboard KPIs, product/category CRUD, inventory, order status, customer list |
| `middleware/auth.js` | JWT verification + admin-role gate |
| `config/db.js` | Single pooled SQL Server connection shared by all routes |

### 5.4 Sequence Diagram — Place an Order

```mermaid
sequenceDiagram
    participant U as Customer (Browser)
    participant API as Express API
    participant DB as SQL Server

    U->>API: POST /api/orders { shipping, paymentMethod } (JWT)
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT cart items + stock for user
    DB-->>API: item rows
    alt cart empty or insufficient stock
        API-->>U: 400/409 error message
    else all items available
        API->>DB: INSERT INTO Orders
        API->>DB: INSERT INTO OrderItems (per item)
        API->>DB: UPDATE Products SET Stock -= qty
        API->>DB: DELETE FROM CartItems WHERE UserID = ?
        API->>DB: COMMIT
        DB-->>API: success
        API-->>U: 201 { orderId, totalAmount }
        U->>API: GET /api/orders/:id (for invoice data)
        API->>DB: SELECT order + order items
        DB-->>API: order detail
        API-->>U: order + items JSON
        U->>U: jsPDF builds & downloads invoice
    end
```

### 5.5 Security Design

- **Passwords:** bcrypt-hashed (never stored or logged in plain text).
- **Sessions:** stateless JWTs signed with a server-side secret; verified on every protected route before any database call.
- **Authorization:** a separate `requireAdmin` guard on top of `requireAuth` restricts admin-only routes.
- **SQL injection:** every query uses parameterized inputs (`request.input(...)`) — no string-concatenated SQL.
- **Data integrity:** checkout runs inside a single DB transaction, so a failure mid-order rolls back stock/order/cart changes together rather than leaving partial data.

### 5.6 Deployment View

```mermaid
flowchart TB
    subgraph Client Device
        BR[Web Browser]
    end
    subgraph App Server
        NODE[Node.js / Express<br/>Port 5000]
    end
    subgraph DB Server
        SQL[(SQL Server<br/>Port 1433)]
    end

    BR <-->|"HTTP(S)"| NODE
    NODE <-->|"TDS protocol"| SQL
```

In local development, all three run on one machine (`localhost`). In production, the frontend can be served from a static host or CDN, the API from an app host (e.g. a VM or container service), and SQL Server from a managed database service — communicating over the same HTTP/TDS boundaries shown above.
