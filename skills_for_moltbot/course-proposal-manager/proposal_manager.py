#!/usr/bin/env python3
"""
Course Proposal Manager - Handles confirm-then-ingest workflow for golf courses.

Stores proposals in SQLite, handles ingestion, and manages proposal lifecycle.
"""

import os
import json
import sqlite3
import urllib.request
import urllib.error
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List
import uuid

# Database path
DB_PATH = Path("/home/node/clawd/data/course_proposals.db")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Environment variables
COURSE_INGEST_URL = os.getenv("COURSE_INGEST_URL", "http://host.docker.internal:8088")
# Fallback token for testing if env var not set (matches docker-compose.courses.yml AUTH_TOKEN)
COURSE_INGEST_TOKEN = os.getenv("COURSE_INGEST_TOKEN") or "8-iVeTs0dZWb_Hw3PtzXV14wJlEkw3t29BzJw52Qc5Y"
AUTO_INGEST = os.getenv("AUTO_INGEST", "false").lower() == "true"


def init_db():
    """Initialize the proposals database."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS proposals (
            proposal_id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            payload_hash TEXT,
            course_name TEXT,
            city TEXT,
            state TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMPTZ NOT NULL,
            status TEXT DEFAULT 'pending',
            ingested_at TIMESTAMPTZ,
            snapshot_id TEXT,
            course_id TEXT,
            agent_label TEXT,
            run_id TEXT,
            proposal_message_id INTEGER,
            proposal_chat_id TEXT
        )
    """)
    # Add payload_hash column if it doesn't exist (migration)
    try:
        conn.execute("ALTER TABLE proposals ADD COLUMN payload_hash TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    # Add proposal_message_id and proposal_chat_id if they don't exist (migration)
    try:
        conn.execute("ALTER TABLE proposals ADD COLUMN proposal_message_id INTEGER")
        conn.execute("ALTER TABLE proposals ADD COLUMN proposal_chat_id TEXT")
    except sqlite3.OperationalError:
        pass  # Columns already exist
    conn.execute("CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS proposals_expires_at_idx ON proposals(expires_at)")
    conn.commit()
    conn.close()


def generate_proposal_id(course_json: Dict) -> str:
    """Generate a human-readable proposal ID."""
    course_id = course_json.get("course", {}).get("id", "")
    if course_id:
        # Extract prefix from course_id (e.g., "course_royal_scot" -> "RS")
        parts = course_id.replace("course_", "").split("_")
        prefix = "".join([p[0].upper() for p in parts[:2]])[:2]
    else:
        prefix = "CO"
    
    date_str = datetime.now().strftime("%Y%m%d")
    
    # Get next sequence number for today
    conn = sqlite3.connect(DB_PATH)
    today_prefix = f"{prefix}-{date_str}-"
    count = conn.execute(
        "SELECT COUNT(*) FROM proposals WHERE proposal_id LIKE ?",
        (f"{today_prefix}%",)
    ).fetchone()[0]
    conn.close()
    
    seq = count + 1
    return f"{prefix}-{date_str}-{seq:03d}"


def compute_payload_hash(payload: Dict) -> str:
    """Compute a deterministic hash of the payload for idempotency."""
    # Normalize JSON (sort keys, no whitespace) for consistent hashing
    normalized = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def create_proposal(
    payload: Dict,
    agent_label: str = "unknown",
    run_id: Optional[str] = None,
    expires_hours: int = 48,
    proposal_message_id: Optional[int] = None,
    proposal_chat_id: Optional[str] = None
) -> str:
    """Create a new proposal and return proposal_id."""
    init_db()
    
    proposal_id = generate_proposal_id(payload)
    course = payload.get("course", {})
    payload_hash = compute_payload_hash(payload)
    
    expires_at = datetime.now() + timedelta(hours=expires_hours)
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO proposals (
            proposal_id, payload_json, payload_hash, course_name, city, state,
            expires_at, agent_label, run_id, proposal_message_id, proposal_chat_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        proposal_id,
        json.dumps(payload),
        payload_hash,
        course.get("name"),
        course.get("city"),
        course.get("state"),
        expires_at.isoformat(),
        agent_label,
        run_id,
        proposal_message_id,
        proposal_chat_id
    ))
    conn.commit()
    conn.close()
    
    return proposal_id


def update_proposal_message_id(proposal_id: str, message_id: int, chat_id: str):
    """Update the stored Telegram message ID for a proposal."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        UPDATE proposals
        SET proposal_message_id = ?, proposal_chat_id = ?
        WHERE proposal_id = ?
    """, (message_id, chat_id, proposal_id))
    conn.commit()
    conn.close()


def get_proposal(proposal_id: str) -> Optional[Dict]:
    """Get a proposal by ID."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    
    # Get column names first (PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk)
    cursor = conn.execute("PRAGMA table_info(proposals)")
    columns = [desc[1] for desc in cursor.fetchall()]  # desc[1] is the column name
    
    # Get the row
    row = conn.execute(
        "SELECT * FROM proposals WHERE proposal_id = ?",
        (proposal_id,)
    ).fetchone()
    
    if not row:
        conn.close()
        return None
    
    # Create dict from row
    proposal = dict(zip(columns, row))
    conn.close()
    
    # Parse payload JSON
    if "payload_json" in proposal and proposal["payload_json"]:
        proposal["payload"] = json.loads(proposal["payload_json"])
    else:
        proposal["payload"] = {}
    
    return proposal


def ingest_proposal(proposal_id: str) -> Dict:
    """Ingest a proposal and return result."""
    proposal = get_proposal(proposal_id)
    if not proposal:
        raise ValueError(f"Proposal {proposal_id} not found")
    
    if proposal["status"] == "ingested":
        return {
            "ok": True,
            "course_id": proposal["course_id"],
            "snapshot_id": proposal["snapshot_id"],
            "already_ingested": True
        }
    
    payload = proposal["payload"]
    payload_hash = proposal.get("payload_hash") or compute_payload_hash(payload)
    
    # POST to ingest API with idempotency key
    url = f"{COURSE_INGEST_URL}/v1/courses/ingest"
    
    # Prepare request data
    payload_bytes = json.dumps(payload).encode('utf-8')
    headers = {
        "Authorization": f"Bearer {COURSE_INGEST_TOKEN}",
        "Content-Type": "application/json",
        "Idempotency-Key": payload_hash  # Use payload hash as idempotency key
    }
    
    try:
        # Create request
        req = urllib.request.Request(url, data=payload_bytes, headers=headers, method='POST')
        
        # Make request with timeout
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = response.read().decode('utf-8')
            result = json.loads(response_data)
        
        # Update proposal status
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE proposals
            SET status = 'ingested',
                ingested_at = ?,
                course_id = ?,
                snapshot_id = ?
            WHERE proposal_id = ?
        """, (
            datetime.now().isoformat(),
            result.get("courseId"),
            result.get("snapshotId"),
            proposal_id
        ))
        conn.commit()
        conn.close()
        
        return {
            "ok": True,
            "course_id": result.get("courseId"),
            "snapshot_id": result.get("snapshotId")
        }
    except urllib.error.HTTPError as e:
        # HTTP error (4xx, 5xx)
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        # Mark as failed but keep ingestable
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE proposals
            SET status = 'failed'
            WHERE proposal_id = ?
        """, (proposal_id,))
        conn.commit()
        conn.close()
        raise Exception(f"Ingest failed: HTTP {e.code} - {error_body}")
    except urllib.error.URLError as e:
        # Network/connection error
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE proposals
            SET status = 'failed'
            WHERE proposal_id = ?
        """, (proposal_id,))
        conn.commit()
        conn.close()
        raise Exception(f"Ingest failed: {str(e)}")
    except Exception as e:
        # Other errors
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE proposals
            SET status = 'failed'
            WHERE proposal_id = ?
        """, (proposal_id,))
        conn.commit()
        conn.close()
        raise Exception(f"Ingest failed: {str(e)}")


def skip_proposal(proposal_id: str) -> bool:
    """Mark a proposal as skipped."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        UPDATE proposals
        SET status = 'skipped'
        WHERE proposal_id = ?
    """, (proposal_id,))
    conn.commit()
    conn.close()
    return True


def list_pending_proposals() -> List[Dict]:
    """List all pending proposals."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT proposal_id, course_name, city, state, created_at, agent_label
        FROM proposals
        WHERE status = 'pending' AND expires_at > ?
        ORDER BY created_at DESC
    """, (datetime.now().isoformat(),)).fetchall()
    conn.close()
    
    return [
        {
            "proposal_id": r[0],
            "course_name": r[1],
            "city": r[2],
            "state": r[3],
            "created_at": r[4],
            "agent_label": r[5]
        }
        for r in rows
    ]


def cleanup_expired_proposals() -> int:
    """Remove expired proposals and return count."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("""
        UPDATE proposals
        SET status = 'expired'
        WHERE status = 'pending' AND expires_at < ?
    """, (datetime.now().isoformat(),)).rowcount
    conn.commit()
    conn.close()
    return count


def format_proposal_message(proposal_id: str, course_json: Dict) -> str:
    """Format a human-readable proposal message for Telegram."""
    course = course_json.get("course", {})
    tee_sets = course_json.get("teeSets", [])
    holes = course_json.get("holes", [])
    amenities = course_json.get("amenities", [])
    
    # Extract course types
    course_types = course_json.get("courseTypes", [])
    access = next((ct["typeKey"] for ct in course_types if ct["groupKey"] == "access"), "unknown")
    tech = next((ct["typeKey"] for ct in course_types if ct["groupKey"] == "tech"), "none")
    alt_types = [ct["typeKey"] for ct in course_types if ct["groupKey"] == "alternative_golf"]
    
    # Format address
    address = course.get("address", {})
    address_str = address.get("formatted") or address.get("line1", "")
    
    # Build message
    lines = [
        f"**{course.get('name', 'Unnamed Course')}** ({course.get('city', '')}, {course.get('state', '')})",
        "",
        f"• {course.get('playability', {}).get('holes', '?')} holes • {access} • tech: {tech}" + 
        (f" • alt: {', '.join(alt_types)}" if alt_types else ""),
        f"• {address_str}",
        f"• {course.get('phone', 'N/A')} • {course.get('domain', 'N/A')}",
        f"• Tee sets: {len(tee_sets)} • Holes data: {len(holes)} • Amenities: {len(amenities)}",
        "",
        f"Proposal: `{proposal_id}`"
    ]
    
    return "\n".join(lines)


def auto_ingest_if_enabled(course_json: Dict) -> Optional[Dict]:
    """Auto-ingest if AUTO_INGEST is enabled, otherwise return None."""
    if not AUTO_INGEST:
        return None
    
    url = f"{COURSE_INGEST_URL}/v1/courses/ingest"
    
    # Prepare request data
    payload_bytes = json.dumps(course_json).encode('utf-8')
    headers = {
        "Authorization": f"Bearer {COURSE_INGEST_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        # Create request
        req = urllib.request.Request(url, data=payload_bytes, headers=headers, method='POST')
        
        # Make request with timeout
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = response.read().decode('utf-8')
            return json.loads(response_data)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        raise Exception(f"Auto-ingest failed: HTTP {e.code} - {error_body}")
    except urllib.error.URLError as e:
        raise Exception(f"Auto-ingest failed: {str(e)}")


if __name__ == "__main__":
    # Test
    init_db()
    print(f"Database initialized at {DB_PATH}")
    print(f"Pending proposals: {len(list_pending_proposals())}")
