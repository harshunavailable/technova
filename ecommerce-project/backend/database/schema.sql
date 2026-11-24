/* ============================================================
   TECHNOVA  —  Database Schema (Microsoft SQL Server)
   PC Building + CCTV E-Commerce Platform
   ============================================================
   Run this once against a fresh database, e.g.:
     CREATE DATABASE TechnovaDB;
     GO
     USE TechnovaDB;
     GO
     -- then run this whole file
   ============================================================ */

IF DB_ID('TechnovaDB') IS NULL
BEGIN
    PRINT 'Please CREATE DATABASE TechnovaDB and USE it before running this script.';
END
GO

/* ---------- 1. USERS ---------- */
CREATE TABLE Users (
    UserID          INT IDENTITY(1,1) PRIMARY KEY,
    FullName        NVARCHAR(120)   NOT NULL,
    Email           NVARCHAR(150)   NOT NULL UNIQUE,
    PasswordHash    NVARCHAR(255)   NOT NULL,
    Phone           NVARCHAR(20)    NULL,
    Role            VARCHAR(20)     NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 2. ADDRESSES ---------- */
CREATE TABLE Addresses (
    AddressID       INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    Line1           NVARCHAR(200) NOT NULL,
    City            NVARCHAR(100) NOT NULL,
    State           NVARCHAR(100) NOT NULL,
    PostalCode      NVARCHAR(20)  NOT NULL,
    Country         NVARCHAR(100) NOT NULL DEFAULT 'India',
    IsDefault       BIT NOT NULL DEFAULT 0
);
GO

/* ---------- 3. CATEGORIES ---------- */
-- SectionType: 'PC' or 'CCTV'  |  SlotType is used by the PC-Builder compatibility engine
CREATE TABLE Categories (
    CategoryID      INT IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(100) NOT NULL,          -- e.g. Processor, Motherboard, CCTV Camera
    SectionType     VARCHAR(10)   NOT NULL,          -- 'PC' | 'CCTV'
    SlotType        VARCHAR(30)   NULL,              -- cpu | motherboard | ram | gpu | storage | psu | cabinet | monitor
    IconClass       NVARCHAR(50)  NULL
);
GO

/* ---------- 4. PRODUCTS ---------- */
CREATE TABLE Products (
    ProductID       INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID      INT NOT NULL FOREIGN KEY REFERENCES Categories(CategoryID),
    Name            NVARCHAR(200) NOT NULL,
    Brand           NVARCHAR(100) NULL,
    Description     NVARCHAR(MAX) NULL,
    Price           DECIMAL(10,2) NOT NULL,
    DiscountPrice   DECIMAL(10,2) NULL,
    Stock           INT NOT NULL DEFAULT 0,
    ImageURL        NVARCHAR(400) NULL,
    Rating          DECIMAL(2,1)  NOT NULL DEFAULT 4.0,
    SpecsJSON       NVARCHAR(MAX) NULL,   -- free-form key/value specs, e.g. {"Socket":"AM5","Cores":"6"}
    -- Compatibility columns used ONLY by PC-part categories (NULL for CCTV items)
    Socket          NVARCHAR(30)  NULL,   -- CPU & Motherboard: AM5, AM4, LGA1700 ...
    RamType         NVARCHAR(10)  NULL,   -- Motherboard & RAM: DDR4, DDR5
    FormFactor      NVARCHAR(20)  NULL,   -- Motherboard & Cabinet: ATX, mATX, ITX
    WattageNeeded   INT           NULL,   -- GPU: recommended PSU wattage
    WattageSupplied INT           NULL,   -- PSU: wattage it supplies
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 5. CART ---------- */
CREATE TABLE CartItems (
    CartItemID      INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    ProductID       INT NOT NULL FOREIGN KEY REFERENCES Products(ProductID),
    Quantity        INT NOT NULL DEFAULT 1,
    AddedAt         DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 6. SAVED PC BUILDS ---------- */
CREATE TABLE PCBuilds (
    BuildID         INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE,
    BuildName       NVARCHAR(150) NOT NULL DEFAULT 'My Custom Build',
    ComponentsJSON  NVARCHAR(MAX) NOT NULL,   -- {"cpu":12,"motherboard":34,...}
    TotalPrice      DECIMAL(10,2) NOT NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------- 7. ORDERS ---------- */
CREATE TABLE Orders (
    OrderID         INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    OrderDate       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Subtotal        DECIMAL(10,2) NOT NULL,
    Tax             DECIMAL(10,2) NOT NULL DEFAULT 0,
    ShippingFee     DECIMAL(10,2) NOT NULL DEFAULT 0,
    TotalAmount     DECIMAL(10,2) NOT NULL,
    Status          VARCHAR(20)   NOT NULL DEFAULT 'Pending', -- Pending|Paid|Shipped|Delivered|Cancelled
    PaymentMethod   VARCHAR(30)   NOT NULL DEFAULT 'COD',
    ShippingLine1   NVARCHAR(200) NOT NULL,
    ShippingCity    NVARCHAR(100) NOT NULL,
    ShippingState   NVARCHAR(100) NOT NULL,
    ShippingPostal  NVARCHAR(20)  NOT NULL,
    ShippingCountry NVARCHAR(100) NOT NULL DEFAULT 'India'
);
GO

/* ---------- 8. ORDER ITEMS ---------- */
CREATE TABLE OrderItems (
    OrderItemID     INT IDENTITY(1,1) PRIMARY KEY,
    OrderID         INT NOT NULL FOREIGN KEY REFERENCES Orders(OrderID) ON DELETE CASCADE,
    ProductID       INT NOT NULL FOREIGN KEY REFERENCES Products(ProductID),
    ProductName     NVARCHAR(200) NOT NULL,   -- snapshot at purchase time
    UnitPrice       DECIMAL(10,2) NOT NULL,
    Quantity        INT NOT NULL,
    LineTotal       AS (UnitPrice * Quantity) PERSISTED
);
GO

/* ---------- Helpful indexes ---------- */
CREATE INDEX IX_Products_Category ON Products(CategoryID);
CREATE INDEX IX_Products_Section  ON Products(CategoryID) INCLUDE (Price, Stock);
CREATE INDEX IX_CartItems_User    ON CartItems(UserID);
CREATE INDEX IX_Orders_User       ON Orders(UserID);
CREATE INDEX IX_OrderItems_Order  ON OrderItems(OrderID);
GO

PRINT 'TechnovaDB schema created successfully.';
