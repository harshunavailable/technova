"""
technova_db.py
--------------
A standalone Python script that connects directly to the same SQL Server
database (TechnovaDB) used by the Node.js backend, using pyodbc.

No .env file is used on purpose — every setting lives in the CONFIG block
below. Edit those four values, then run the script.

Install requirements first:
    pip install pyodbc

You also need the "ODBC Driver for SQL Server" installed on your machine
(see the explanation at the bottom of this file / in the chat answer).
"""

import pyodbc

# ======================================================================
# CONFIG — edit these four values for your own SQL Server instance
# ======================================================================
SERVER   = "localhost"          # e.g. "localhost", "localhost\\SQLEXPRESS", or a server IP
DATABASE = "TechnovaDB"
USERNAME = "sa"
PASSWORD = "YourStrong!Passw0rd"
DRIVER   = "{ODBC Driver 18 for SQL Server}"   # see notes below if this driver isn't installed
# ======================================================================


def get_connection():
    """Opens and returns a live connection to SQL Server."""
    conn_str = (
        f"DRIVER={DRIVER};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        f"UID={USERNAME};"
        f"PWD={PASSWORD};"
        f"TrustServerCertificate=yes;"   # needed for local/dev servers without a real SSL cert
    )
    return pyodbc.connect(conn_str)


def test_connection():
    """Simple health check — prints the SQL Server version if the connection works."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION;")
        version = cursor.fetchone()[0]
        print("✅ Connected successfully.\n")
        print(version)


def list_products(limit=10):
    """Fetches the newest products, joined with their category name."""
    query = """
        SELECT TOP (?) p.ProductID, p.Name, p.Price, p.Stock, c.Name AS CategoryName
        FROM Products p
        JOIN Categories c ON c.CategoryID = p.CategoryID
        WHERE p.IsActive = 1
        ORDER BY p.CreatedAt DESC;
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, limit)
        rows = cursor.fetchall()

        print(f"\n{'ID':<5}{'Name':<32}{'Category':<18}{'Price':<10}{'Stock':<6}")
        print("-" * 71)
        for row in rows:
            print(f"{row.ProductID:<5}{row.Name[:30]:<32}{row.CategoryName:<18}"
                  f"{float(row.Price):<10.2f}{row.Stock:<6}")


def add_product(category_id, name, brand, price, stock, description=""):
    """Inserts a new product — mirrors what the admin panel's 'Add product' form does."""
    query = """
        INSERT INTO Products (CategoryID, Name, Brand, Description, Price, Stock)
        OUTPUT INSERTED.ProductID
        VALUES (?, ?, ?, ?, ?, ?);
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, category_id, name, brand, description, price, stock)
        new_id = cursor.fetchone()[0]
        conn.commit()   # writes (INSERT/UPDATE/DELETE) must be committed explicitly
        print(f"✅ Product created with ProductID = {new_id}")
        return new_id


def update_stock(product_id, new_stock):
    """Updates a single product's stock count."""
    query = "UPDATE Products SET Stock = ? WHERE ProductID = ?;"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, new_stock, product_id)
        conn.commit()
        print(f"✅ ProductID {product_id} stock updated to {new_stock} "
              f"({cursor.rowcount} row(s) affected)")


def get_customer_orders(email):
    """Looks up all orders placed by a customer, by email."""
    query = """
        SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.Status
        FROM Orders o
        JOIN Users u ON u.UserID = o.UserID
        WHERE u.Email = ?
        ORDER BY o.OrderDate DESC;
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, email)
        rows = cursor.fetchall()
        if not rows:
            print(f"No orders found for {email}.")
            return
        print(f"\nOrders for {email}:")
        for row in rows:
            print(f"  #{row.OrderID}  {row.OrderDate}  ₹{row.TotalAmount}  [{row.Status}]")


if __name__ == "__main__":
    # Run this file directly (python technova_db.py) to try each function in turn.
    test_connection()
    list_products(limit=10)

    # Uncomment to try writing to the database:
    # add_product(category_id=9, name="Test CCTV Camera", brand="Demo",
    #             price=1999, stock=15, description="Created from Python.")
    # update_stock(product_id=1, new_stock=42)
    # get_customer_orders("admin@technova.com")
