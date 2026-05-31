"""
db.py — SQLite database helpers for Yield Matrix admin portal.
Manages market_prices and districts tables.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "market.db")


def get_db():
    """Return a new SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist. Called at app startup."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_prices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            district    TEXT    NOT NULL,
            crop        TEXT    NOT NULL,
            price       INTEGER NOT NULL,
            change_pct  REAL    NOT NULL DEFAULT 0.0,
            volume      INTEGER NOT NULL DEFAULT 0,
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
            UNIQUE(district, crop)
        )
    """)

    # Districts table — managed by superadmin
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS districts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL UNIQUE,
            password   TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Government schemes table — managed by schemes admin
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schemes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            category    TEXT    NOT NULL,
            description TEXT    NOT NULL,
            link        TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Crop guides table (metadata) — managed by guide admin
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crop_guides (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            crop_id     TEXT    NOT NULL UNIQUE,
            crop_name   TEXT    NOT NULL,
            emoji       TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)

    conn.commit()
    conn.close()


# ── Market Prices ─────────────────────────────────────────────────────────────

def upsert_price(district: str, crop: str, price: int, change_pct: float, volume: int):
    """Insert or update a price entry for a district+crop pair."""
    conn = get_db()
    
    row = conn.execute("SELECT id FROM market_prices WHERE district = ? AND crop = ?", (district, crop)).fetchone()
    
    if row:
        conn.execute("""
            UPDATE market_prices SET
                price = ?,
                change_pct = ?,
                volume = ?,
                updated_at = datetime('now', 'localtime')
            WHERE id = ?
        """, (price, change_pct, volume, row["id"]))
    else:
        conn.execute("""
            INSERT INTO market_prices (district, crop, price, change_pct, volume, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
        """, (district, crop, price, change_pct, volume))
        
    conn.commit()
    conn.close()


def get_prices_for_district(district: str) -> list:
    """Return all price rows for a given district."""
    conn = get_db()
    rows = conn.execute(
        "SELECT crop, price, change_pct, volume, updated_at FROM market_prices WHERE district = ? ORDER BY crop",
        (district,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_prices() -> dict:
    """
    Return all prices grouped as {crop: {district: {price, change, volume}}}.
    Used by market_data.py to merge with generated prices.
    """
    conn = get_db()
    rows = conn.execute(
        "SELECT district, crop, price, change_pct, volume FROM market_prices"
    ).fetchall()
    conn.close()

    result = {}
    for r in rows:
        crop     = r["crop"]
        district = r["district"]
        if crop not in result:
            result[crop] = {}
        result[crop][district] = {
            "price":  r["price"],
            "change": r["change_pct"],
            "volume": r["volume"],
        }
    return result


def delete_price(district: str, crop: str) -> bool:
    """Delete a specific crop entry for a district. Returns True if a row was deleted."""
    conn = get_db()
    cur = conn.execute(
        "DELETE FROM market_prices WHERE district = ? AND crop = ?",
        (district, crop)
    )
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


# ── Districts (managed by superadmin) ────────────────────────────────────────

def get_all_districts() -> list:
    """Return all districts as a list of dicts."""
    conn = get_db()
    rows = conn.execute(
        "SELECT name, created_at FROM districts ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_district_names() -> list:
    """Return just the district names."""
    conn = get_db()
    rows = conn.execute("SELECT name FROM districts ORDER BY name").fetchall()
    conn.close()
    return [r["name"] for r in rows]


def get_district_password(name: str) -> str | None:
    """Return the stored password for a district, or None if not found."""
    conn = get_db()
    row = conn.execute(
        "SELECT password FROM districts WHERE name = ?", (name,)
    ).fetchone()
    conn.close()
    return row["password"] if row else None


def add_district(name: str, password: str) -> bool:
    """Add a new district. Returns False if it already exists."""
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO districts (name, password) VALUES (?, ?)",
            (name.strip(), password)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False


def update_district_password(name: str, password: str) -> bool:
    """Update an existing district's password. Returns False if not found."""
    conn = get_db()
    cur = conn.execute(
        "UPDATE districts SET password = ? WHERE name = ?", (password, name)
    )
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


def delete_district(name: str) -> bool:
    """Delete a district (and all its price entries). Returns True if deleted."""
    conn = get_db()
    conn.execute("DELETE FROM market_prices WHERE district = ?", (name,))
    cur = conn.execute("DELETE FROM districts WHERE name = ?", (name,))
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


# ── Government Schemes ──────────────────────────────────────────────────────

def get_all_schemes() -> list:
    """Return all schemes ordered by category then name."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, category, description, link, created_at FROM schemes ORDER BY category, name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_scheme(name: str, category: str, description: str, link: str | None) -> int:
    """Insert a new scheme. Returns the new row id."""
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO schemes (name, category, description, link) VALUES (?, ?, ?, ?)",
        (name.strip(), category.strip(), description.strip(), link.strip() if link else None)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def delete_scheme(scheme_id: int) -> bool:
    """Delete a scheme by id. Returns True if deleted."""
    conn = get_db()
    cur = conn.execute("DELETE FROM schemes WHERE id = ?", (scheme_id,))
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0


# ── Crop Guides (managed by guide admin) ────────────────────────────────────

def get_all_crop_metadata() -> list:
    """Return all crop guide metadata ordered by name."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, crop_id, crop_name, emoji, created_at FROM crop_guides ORDER BY crop_name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_crop_metadata(crop_id: str, crop_name: str, emoji: str | None) -> bool:
    """Insert or update crop metadata."""
    conn = get_db()
    conn.execute("""
        INSERT INTO crop_guides (crop_id, crop_name, emoji) 
        VALUES (?, ?, ?)
        ON CONFLICT(crop_id) DO UPDATE SET 
            crop_name = excluded.crop_name,
            emoji = excluded.emoji
    """, (crop_id.strip(), crop_name.strip(), emoji.strip() if emoji else None))
    conn.commit()
    conn.close()
    return True


def delete_crop_metadata(crop_id: str) -> bool:
    """Delete crop metadata by crop_id. Returns True if deleted."""
    conn = get_db()
    cur = conn.execute("DELETE FROM crop_guides WHERE crop_id = ?", (crop_id,))
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0

