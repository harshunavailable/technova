"""
simple_connect.py
------------------
The simplest possible way to connect Python to SQL Server / SSMS.

Two connection styles are supported — pick whichever matches how you log
into SSMS:

  1) Windows Authentication (the "Windows Authentication" login option in
     SSMS) — no username/password needed. This is the easiest option if
     you're running everything on your own Windows PC.

  2) SQL Server Authentication (the "SQL Server Authentication" login
     option in SSMS, where you type a username + password) — used if
     you're connecting to a server, a Mac/Linux Docker container, etc.

Install first:
    pip install pyodbc
"""

import pyodbc

# ---- STEP 1: fill these in to match what you type into SSMS ----
SERVER   = "localhost"        # same "Server name" box you use in SSMS
DATABASE = "TechnovaDB"       # same database you see in SSMS's Object Explorer

USE_WINDOWS_LOGIN = True      # True = Windows Authentication, False = SQL Login

# only needed if USE_WINDOWS_LOGIN = False
USERNAME = "sa"
PASSWORD = "YourStrong!Passw0rd"


# ---- STEP 2: connect ----
def connect():
    if USE_WINDOWS_LOGIN:
        conn_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={SERVER};DATABASE={DATABASE};"
            f"Trusted_Connection=yes;TrustServerCertificate=yes;"
        )
    else:
        conn_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={SERVER};DATABASE={DATABASE};"
            f"UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
        )
    return pyodbc.connect(conn_str)


# ---- STEP 3: use it ----
if __name__ == "__main__":
    conn = connect()
    cursor = conn.cursor()

    cursor.execute("SELECT DB_NAME();")
    print("Connected to database:", cursor.fetchone()[0])

    cursor.execute("SELECT COUNT(*) FROM Products;")
    print("Total products in table:", cursor.fetchone()[0])

    conn.close()
