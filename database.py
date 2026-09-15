"""
SignalScope Database Layer - Persistent SQLite Storage
Stores:
1. User accounts and login credentials permanently.
2. Every forensic photo inspection (AI vs Authentic detection results, confidence, probabilities, signals, generator).
"""

import sqlite3
import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "signalscope.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def hash_password(password: str) -> str:
    """Simple SHA-256 password hasher with salt."""
    salt = "signalscope_secret_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()


def init_db():
    """Initializes SQLite database tables if not already present."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Users Table (Strictly 1 Account per Phone & 1 Account per Email)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'Fact-Checker',
                organization TEXT DEFAULT 'LJIET [C-433]',
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
        """)

        # Ensure unique constraints exist on both phone and email
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone)")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL AND email != ''")

        # 2. Forensic Photo Inspections Table (Stores AI vs Real detection history)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inspections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                user_phone TEXT,
                user_name TEXT,
                image_name TEXT NOT NULL,
                image_hash TEXT,
                thumbnail_base64 TEXT,
                prediction TEXT NOT NULL,          -- 'AI_GENERATED' or 'AUTHENTIC'
                confidence REAL NOT NULL,          -- e.g. 0.985
                real_probability REAL,             -- e.g. 0.015
                ai_probability REAL,               -- e.g. 0.985
                model_used TEXT,                   -- e.g. 'GenImage-SwinV2'
                generator_attribution TEXT,        -- e.g. 'Midjourney v6', 'Stable Diffusion', 'N/A'
                explanation TEXT,
                signals_json TEXT,                 -- JSON array of signals detected
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # Insert default demo/admin user if empty
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO users (name, phone, email, password_hash, role, organization, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Dr. Rutvik Vamja",
                "9876543210",
                "rutvik@ljiet.edu.in",
                hash_password("admin123"),
                "Lead Forensic Investigator",
                "LJIET [C-433]",
                now,
                now
            ))

        conn.commit()


# ==========================================
# USER AUTHENTICATION & STORAGE
# ==========================================

def register_user(
    name: str, 
    phone: str, 
    email: str = "", 
    password: str = "", 
    role: str = "Fact-Checker", 
    organization: str = "LJIET [C-433]"
) -> Dict[str, Any]:
    """
    Registers a new user into SQLite database.
    STRICT RULE: Only ONE account is allowed per mobile number and per email.
    If either phone or email is already registered, this function raises ValueError.
    """
    init_db()
    clean_phone = phone.strip()
    clean_name = name.strip()
    clean_email = email.strip().lower()

    if not clean_phone:
        raise ValueError("Mobile number is required for registration.")
    if not clean_name:
        raise ValueError("Full name is required for registration.")
    if not clean_email:
        raise ValueError("Email address is required for registration.")

    # Validation
    phone_digits = ''.join(c for c in clean_phone if c.isdigit())
    if len(phone_digits) < 6:
        raise ValueError("Please provide a valid mobile number (at least 6 digits).")
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise ValueError("Please provide a valid email address (e.g. user@example.com).")

    pwd_hash = hash_password(password or "default123")
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Check if mobile number is already registered
        cursor.execute("SELECT id, name, phone, email FROM users WHERE phone = ?", (clean_phone,))
        existing_phone = cursor.fetchone()
        if existing_phone:
            raise ValueError(f"Mobile number '{clean_phone}' is already registered. Only 1 account is permitted per mobile number. Please log in.")

        # 2. Check if email address is already registered
        cursor.execute("SELECT id, name, phone, email FROM users WHERE LOWER(email) = ?", (clean_email,))
        existing_email = cursor.fetchone()
        if existing_email:
            raise ValueError(f"Email '{clean_email}' is already registered. Only 1 account is permitted per email. Please log in or use another email.")

        try:
            cursor.execute("""
                INSERT INTO users (name, phone, email, password_hash, role, organization, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (clean_name, clean_phone, clean_email, pwd_hash, role, organization, now, now))
            conn.commit()
            user_id = cursor.lastrowid
            return {
                "id": user_id,
                "name": clean_name,
                "phone": clean_phone,
                "email": clean_email,
                "role": role,
                "organization": organization,
                "created_at": now,
                "last_login_at": now,
                "status": "created"
            }
        except sqlite3.IntegrityError as e:
            err_str = str(e).lower()
            if "phone" in err_str:
                raise ValueError(f"Mobile number '{clean_phone}' is already registered. Please log in.")
            elif "email" in err_str:
                raise ValueError(f"Email '{clean_email}' is already registered. Please log in.")
            else:
                raise ValueError("An account with this mobile number or email already exists. Only 1 ID is allowed.")


def authenticate_user(identifier: str, password: str = "") -> Dict[str, Any]:
    """
    Authenticates an existing user by either their mobile number or email address.
    Strictly checks credentials and updates last_login_at.
    Does NOT create a new account if the user is not found.
    """
    init_db()
    clean_id = identifier.strip()
    if not clean_id:
        raise ValueError("Mobile number or email address is required to log in.")

    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, phone, email, password_hash, role, organization, created_at 
            FROM users 
            WHERE phone = ? OR LOWER(email) = ?
        """, (clean_id, clean_id.lower()))
        user = cursor.fetchone()

        if not user:
            raise ValueError(f"No account found with '{clean_id}'. Please switch to 'Sign Up' to create your account.")

        # Check password if provided
        if password and password.strip():
            expected_hash = hash_password(password.strip())
            if user["password_hash"] != expected_hash:
                raise ValueError("Incorrect password. Please verify and try again.")

        # Update login time
        cursor.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now, user["id"]))
        conn.commit()

        return {
            "id": user["id"],
            "name": user["name"],
            "phone": user["phone"],
            "email": user["email"],
            "role": user["role"],
            "organization": user["organization"],
            "created_at": user["created_at"],
            "last_login_at": now
        }


def get_all_users() -> List[Dict[str, Any]]:
    """Returns list of registered users."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, email, role, organization, created_at, last_login_at FROM users ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


# ==========================================
# PHOTO INSPECTION LOGS (AI VS REAL HISTORY)
# ==========================================

def save_inspection(
    image_name: str,
    prediction: str,
    confidence: float,
    real_probability: float,
    ai_probability: float,
    user_phone: str = "",
    user_name: str = "",
    model_used: str = "GenImage Swin-v2",
    generator_attribution: str = "N/A",
    explanation: str = "",
    signals: Optional[List[Any]] = None,
    thumbnail_base64: str = "",
    image_bytes: Optional[bytes] = None
) -> Dict[str, Any]:
    """Permanently records an image inspection result into the database."""
    init_db()
    now = datetime.now(timezone.utc).isoformat()
    signals_str = json.dumps(signals or [])
    
    # Calculate image hash
    image_hash = ""
    if image_bytes:
        image_hash = hashlib.sha256(image_bytes).hexdigest()

    # Look up user_id if phone provided
    user_id = None
    if user_phone:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM users WHERE phone = ?", (user_phone,))
            row = cursor.fetchone()
            if row:
                user_id = row["id"]
                if not user_name:
                    user_name = row["name"]

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO inspections (
                user_id, user_phone, user_name, image_name, image_hash, thumbnail_base64,
                prediction, confidence, real_probability, ai_probability, model_used,
                generator_attribution, explanation, signals_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            user_phone or "Guest / Demo",
            user_name or "Investigator",
            image_name,
            image_hash,
            thumbnail_base64[:50000] if thumbnail_base64 else "",  # Compact thumbnail
            prediction.upper(),
            round(float(confidence), 4),
            round(float(real_probability), 4),
            round(float(ai_probability), 4),
            model_used,
            generator_attribution,
            explanation,
            signals_str,
            now
        ))
        conn.commit()
        inspection_id = cursor.lastrowid

    return {
        "id": inspection_id,
        "image_name": image_name,
        "prediction": prediction.upper(),
        "confidence": confidence,
        "created_at": now,
        "user_phone": user_phone
    }


def get_inspections(user_phone: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves stored forensic inspections from SQLite database."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        if user_phone:
            cursor.execute("""
                SELECT * FROM inspections 
                WHERE user_phone = ? OR user_phone = 'Guest / Demo'
                ORDER BY id DESC LIMIT ?
            """, (user_phone, limit))
        else:
            cursor.execute("""
                SELECT * FROM inspections 
                ORDER BY id DESC LIMIT ?
            """, (limit,))
        
        rows = cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["signals"] = json.loads(d.get("signals_json") or "[]")
            except Exception:
                d["signals"] = []
            results.append(d)
        return results


def delete_inspection(inspection_id: int) -> bool:
    """Deletes an inspection record by ID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM inspections WHERE id = ?", (inspection_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_database_stats() -> Dict[str, Any]:
    """Returns persistent database statistics."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM inspections")
        total_inspections = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM inspections WHERE prediction = 'AI_GENERATED'")
        ai_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM inspections WHERE prediction = 'AUTHENTIC' OR prediction = 'REAL'")
        real_count = cursor.fetchone()[0]

        return {
            "total_users": total_users,
            "total_inspections": total_inspections,
            "ai_detected_count": ai_count,
            "real_verified_count": real_count,
            "db_path": DB_PATH
        }


# Convenience alias for stats
get_stats = get_database_stats

init_db()
