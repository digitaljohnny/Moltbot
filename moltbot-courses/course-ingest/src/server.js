import Fastify from "fastify";
import crypto from "node:crypto";

import { makePool, ensureSchema } from "./db.js";
import { PayloadSchema } from "./schema.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});

const AUTH_TOKEN = process.env.AUTH_TOKEN || "";
const VIEWER_AUTH = process.env.VIEWER_AUTH || ""; // Basic auth for viewer (user:pass format)

function requireAuth(req, reply) {
  if (!AUTH_TOKEN) return; // allow unauthenticated if not set
  const h = req.headers["authorization"] || "";
  const ok = h === `Bearer ${AUTH_TOKEN}`;
  if (!ok) {
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
}

function requireViewerAuth(req, reply) {
  if (!VIEWER_AUTH || VIEWER_AUTH.trim() === "") return true; // allow unauthenticated if not set
  const authHeader = (req.headers["authorization"] || req.headers.authorization || "").trim();
  if (!authHeader.startsWith("Basic ")) {
    reply.code(401).header("WWW-Authenticate", 'Basic realm="Course Viewer"').send({ error: "unauthorized" });
    return false;
  }
  const provided = authHeader.substring(6).trim();
  const expected = Buffer.from(VIEWER_AUTH.trim()).toString("base64");
  if (provided !== expected) {
    reply.code(401).header("WWW-Authenticate", 'Basic realm="Course Viewer"').send({ error: "unauthorized" });
    return false;
  }
  return true;
}

function requireApiAuth(req, reply) {
  // API routes require bearer token (except /health)
  if (req.url === "/health") return true;
  
  // If VIEWER_AUTH is set, also accept Basic Auth (for viewer convenience)
  if (VIEWER_AUTH && VIEWER_AUTH.trim() !== "") {
    const authHeader = (req.headers["authorization"] || req.headers.authorization || "").trim();
    if (authHeader.startsWith("Basic ")) {
      const provided = authHeader.substring(6).trim();
      const expected = Buffer.from(VIEWER_AUTH.trim()).toString("base64");
      if (provided === expected) {
        return true; // Basic Auth accepted
      }
    }
  }
  
  // Otherwise require Bearer token
  return requireAuth(req, reply);
}

function milesToMeters(miles) {
  return miles * 1609.344;
}

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_()\-]/g, "");
}

function amenityId(name, category) {
  const raw = `${String(name ?? "").trim()}|${String(category ?? "").trim()}`;
  return "am_" + crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function teeSetId(courseId, color, name) {
  const key = [courseId, "tee", norm(color), norm(name)].filter(Boolean).join("_");
  return key;
}

function holeId(teeSetId, holeNumber) {
  return `${teeSetId}_hole_${Number(holeNumber)}`;
}

const pool = makePool();

app.get("/health", async () => {
  await pool.query("select 1 as ok");
  return { ok: true };
});

function getViewerHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Golf Courses Viewer</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .view-toggle {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .view-toggle button {
      padding: 10px 20px;
      border: 2px solid #34495e;
      background: white;
      color: #34495e;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    .view-toggle button.active {
      background: #34495e;
      color: white;
    }
    .filters {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
    }
    input, select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    button {
      padding: 8px 20px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
    }
    button:hover { background: #229954; }
    .results {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .results-header {
      padding: 15px 20px;
      background: #34495e;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .course-list {
      max-height: 600px;
      overflow-y: auto;
    }
    .course-item {
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background 0.2s;
    }
    .course-item:hover {
      background: #f8f9fa;
    }
    .course-item:last-child {
      border-bottom: none;
    }
    .course-name {
      font-weight: 600;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .course-details {
      font-size: 14px;
      color: #7f8c8d;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .course-detail {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-holes {
      background: #3498db;
      color: white;
    }
    .badge-state {
      background: #95a5a6;
      color: white;
    }
    .map-container {
      height: 600px;
      border-radius: 8px;
      overflow: hidden;
    }
    #map {
      width: 100%;
      height: 100%;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }
    .error {
      background: #e74c3c;
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .pagination {
      padding: 15px 20px;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #eee;
    }
    .pagination button {
      background: #34495e;
      padding: 6px 12px;
      font-size: 12px;
    }
    .pagination button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      overflow-y: auto;
    }
    .modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      padding: 30px;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      margin: 20px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #eee;
    }
    .modal-header h2 {
      margin: 0;
      color: #2c3e50;
    }
    .close-btn {
      background: #e74c3c;
      padding: 8px 16px;
      font-size: 14px;
    }
    .modal-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    .modal-tab {
      padding: 10px 20px;
      background: none;
      border: none;
      color: #7f8c8d;
      cursor: pointer;
      font-weight: 600;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
    }
    .modal-tab.active {
      color: #34495e;
      border-bottom-color: #34495e;
    }
    .modal-tab-content {
      display: none;
    }
    .modal-tab-content.active {
      display: block;
    }
    pre {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏌️ Golf Courses</h1>
    
    <div class="view-toggle">
      <button id="list-view-btn" class="active" onclick="switchView('list')">📋 List</button>
      <button id="map-view-btn" onclick="switchView('map')">🗺️ Map</button>
    </div>
    
    <div class="filters">
      <div class="filter-group">
        <label>Search</label>
        <input type="text" id="search" placeholder="Course name, city, state...">
      </div>
      <div class="filter-group">
        <label>State</label>
        <input type="text" id="state" placeholder="MI" maxlength="2" style="width: 80px;">
      </div>
      <div class="filter-group">
        <label>City</label>
        <input type="text" id="city" placeholder="Lansing">
      </div>
      <button onclick="loadCourses()">Search</button>
      <button onclick="clearFilters()" style="background: #95a5a6;">Clear</button>
    </div>

    <div id="error" class="error" style="display: none;"></div>

    <div id="list-view" class="results">
      <div class="results-header">
        <span id="results-count">Loading...</span>
        <span id="results-total"></span>
      </div>
      <div id="course-list" class="course-list">
        <div class="loading">Loading courses...</div>
      </div>
      <div id="pagination" class="pagination" style="display: none;">
        <button id="prev-btn" onclick="prevPage()">← Previous</button>
        <span id="page-info"></span>
        <button id="next-btn" onclick="nextPage()">Next →</button>
      </div>
    </div>

    <div id="map-view" class="map-container" style="display: none;">
      <div id="map"></div>
    </div>
  </div>

  <div id="course-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title">Course Details</h2>
        <button class="close-btn" onclick="closeModal()">Close</button>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab active" onclick="switchTab('canonical')">Canonical</button>
        <button class="modal-tab" onclick="switchTab('snapshot')" id="snapshot-tab" style="display: none;">Raw Snapshot</button>
      </div>
      <div id="canonical-tab" class="modal-tab-content active">
        <pre id="canonical-content"></pre>
      </div>
      <div id="snapshot-tab" class="modal-tab-content">
        <pre id="snapshot-content"></pre>
      </div>
    </div>
  </div>

  <script>
    let currentOffset = 0;
    let currentLimit = 50;
    let currentTotal = 0;
    let currentView = 'list';
    let map = null;
    let markers = [];
    let currentCourseData = null;

    function switchView(view) {
      currentView = view;
      document.getElementById('list-view').style.display = view === 'list' ? 'block' : 'none';
      document.getElementById('map-view').style.display = view === 'map' ? 'block' : 'none';
      document.getElementById('list-view-btn').classList.toggle('active', view === 'list');
      document.getElementById('map-view-btn').classList.toggle('active', view === 'map');
      
      if (view === 'map' && !map) {
        initMap();
      }
      if (view === 'map') {
        loadCourses();
      }
    }

    function initMap() {
      map = L.map('map').setView([42.7, -84.5], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    }

    function clearMarkers() {
      markers.forEach(m => map.removeLayer(m));
      markers = [];
    }

    function addMarker(course) {
      if (!course.geoLat || !course.geoLng) return;
      const marker = L.marker([course.geoLat, course.geoLng])
        .addTo(map)
        .bindPopup(\`<b>\${escapeHtml(course.name || 'Unnamed')}</b><br>\${escapeHtml(course.city || '')}, \${escapeHtml(course.state || '')}\`);
      marker.on('click', () => viewCourse(course.id));
      markers.push(marker);
    }

    async function loadCourses() {
      const search = document.getElementById('search').value.trim();
      const state = document.getElementById('state').value.trim().toUpperCase();
      const city = document.getElementById('city').value.trim();

      const params = new URLSearchParams({
        limit: currentLimit,
        offset: currentOffset
      });
      if (search) params.append('search', search);
      if (state) params.append('state', state);
      if (city) params.append('city', city);

      const errorDiv = document.getElementById('error');
      errorDiv.style.display = 'none';

      const listDiv = document.getElementById('course-list');
      if (currentView === 'list') {
        listDiv.innerHTML = '<div class="loading">Loading courses...</div>';
      }

      try {
        const response = await fetch(\`/v1/courses?\${params}\`, {
          credentials: 'include'  // Include Basic Auth credentials automatically
        });
        
        if (response.status === 401) {
          // Reload page to trigger browser's Basic Auth dialog
          window.location.reload();
          return;
        }

        const data = await response.json();

        if (!data.ok) {
          throw new Error('Failed to load courses');
        }

        currentTotal = data.total;
        
        if (currentView === 'list') {
          renderCourses(data.courses);
          updatePagination();
        } else {
          clearMarkers();
          data.courses.forEach(c => addMarker(c));
          if (data.courses.length > 0 && markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        }
      } catch (err) {
        errorDiv.textContent = \`Error: \${err.message}\`;
        errorDiv.style.display = 'block';
        if (currentView === 'list') {
          listDiv.innerHTML = '<div class="loading">Error loading courses</div>';
        }
      }
    }

    function getAuthHeaders() {
      // Fetch with credentials: 'include' makes browser send Basic Auth automatically
      // No manual header needed - browser handles it after initial login
      return { credentials: 'include' };
    }

    function renderCourses(courses) {
      const listDiv = document.getElementById('course-list');
      const countDiv = document.getElementById('results-count');
      const totalDiv = document.getElementById('results-total');

      if (courses.length === 0) {
        listDiv.innerHTML = '<div class="loading">No courses found</div>';
        countDiv.textContent = '0 courses';
        totalDiv.textContent = '';
        return;
      }

      countDiv.textContent = \`\${courses.length} course\${courses.length !== 1 ? 's' : ''}\`;
      totalDiv.textContent = \`of \${currentTotal} total\`;

      listDiv.innerHTML = courses.map(course => \`
        <div class="course-item" onclick="viewCourse('\${course.id}')">
          <div class="course-name">\${escapeHtml(course.name || 'Unnamed Course')}</div>
          <div class="course-details">
            \${course.city ? \`<span class="course-detail">📍 \${escapeHtml(course.city)}\</span>\` : ''}
            \${course.state ? \`<span class="course-detail"><span class="badge badge-state">\${escapeHtml(course.state)}\</span></span>\` : ''}
            \${course.holes ? \`<span class="course-detail"><span class="badge badge-holes">\${course.holes} holes\</span></span>\` : ''}
            \${course.domain ? \`<span class="course-detail">🌐 \${escapeHtml(course.domain)}\</span>\` : ''}
            \${course.phone ? \`<span class="course-detail">📞 \${escapeHtml(course.phone)}\</span>\` : ''}
            \${course.geoLat && course.geoLng ? \`<span class="course-detail">📍 \${course.geoLat.toFixed(4)}, \${course.geoLng.toFixed(4)}\</span>\` : ''}
          </div>
        </div>
      \`).join('');
    }

    async function viewCourse(id) {
      try {
        const response = await fetch(\`/v1/courses/\${id}\`, {
          credentials: 'include'  // Include Basic Auth credentials automatically
        });
        
        if (response.status === 401) {
          // Reload page to trigger browser's Basic Auth dialog
          window.location.reload();
          return;
        }

        const data = await response.json();
        currentCourseData = data;
        
        document.getElementById('modal-title').textContent = data.course.name || 'Course Details';
        document.getElementById('canonical-content').textContent = JSON.stringify(data, null, 2);
        
        // Show snapshot tab if available, otherwise hide it
        if (data.latestSnapshotId) {
          document.getElementById('snapshot-tab').style.display = 'block';
          // Load snapshot data (handles 404 gracefully)
          loadSnapshot(id, data.latestSnapshotId);
        } else {
          // No snapshot available (legacy course or not yet ingested with snapshot support)
          document.getElementById('snapshot-tab').style.display = 'none';
        }
        
        document.getElementById('course-modal').classList.add('active');
        switchTab('canonical');
      } catch (err) {
        alert(\`Error loading course: \${err.message}\`);
      }
    }

    async function loadSnapshot(courseId, snapshotId) {
      try {
        const response = await fetch(\`/v1/courses/\${courseId}/snapshot/\${snapshotId}\`, {
          credentials: 'include'  // Include Basic Auth credentials automatically
        });
        
        if (response.status === 404) {
          document.getElementById('snapshot-content').textContent = 'No snapshot found for this course.';
          return;
        }
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        document.getElementById('snapshot-content').textContent = JSON.stringify(data.rawPayload, null, 2);
      } catch (err) {
        document.getElementById('snapshot-content').textContent = \`Error loading snapshot: \${err.message}\`;
      }
    }

    function switchTab(tab) {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
      
      if (tab === 'canonical') {
        document.querySelector('.modal-tab').classList.add('active');
        document.getElementById('canonical-tab').classList.add('active');
      } else {
        document.querySelectorAll('.modal-tab')[1].classList.add('active');
        document.getElementById('snapshot-tab').classList.add('active');
      }
    }

    function closeModal() {
      document.getElementById('course-modal').classList.remove('active');
    }

    function updatePagination() {
      const paginationDiv = document.getElementById('pagination');
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      const pageInfo = document.getElementById('page-info');

      if (currentTotal <= currentLimit) {
        paginationDiv.style.display = 'none';
        return;
      }

      paginationDiv.style.display = 'flex';
      const currentPage = Math.floor(currentOffset / currentLimit) + 1;
      const totalPages = Math.ceil(currentTotal / currentLimit);
      pageInfo.textContent = \`Page \${currentPage} of \${totalPages}\`;

      prevBtn.disabled = currentOffset === 0;
      nextBtn.disabled = currentOffset + currentLimit >= currentTotal;
    }

    function prevPage() {
      if (currentOffset > 0) {
        currentOffset = Math.max(0, currentOffset - currentLimit);
        loadCourses();
      }
    }

    function nextPage() {
      if (currentOffset + currentLimit < currentTotal) {
        currentOffset += currentLimit;
        loadCourses();
      }
    }

    function clearFilters() {
      document.getElementById('search').value = '';
      document.getElementById('state').value = '';
      document.getElementById('city').value = '';
      currentOffset = 0;
      loadCourses();
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Load on page load
    loadCourses();

    // Allow Enter key to search
    ['search', 'state', 'city'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadCourses();
      });
    });

    // Close modal on outside click
    document.getElementById('course-modal').addEventListener('click', (e) => {
      if (e.target.id === 'course-modal') closeModal();
    });
  </script>
</body>
</html>`;
}

app.get("/", async (req, reply) => {
  if (!requireViewerAuth(req, reply)) return;
  reply.type("text/html");
  return getViewerHTML();
});

app.get("/v1/courses", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const state = req.query.state ? String(req.query.state).toUpperCase() : null;
  const city = req.query.city ? String(req.query.city) : null;
  const search = req.query.search ? String(req.query.search) : null;

  let query = `
    select
      id, name, city, state, holes, domain, phone,
      CASE WHEN geom IS NULL THEN NULL ELSE ST_Y(geom::geometry) END as "geoLat",
      CASE WHEN geom IS NULL THEN NULL ELSE ST_X(geom::geometry) END as "geoLng",
      updated_at
    from courses
    where 1=1
  `;
  const params = [];
  let paramCount = 0;

  if (state) {
    paramCount++;
    query += ` and state = $${paramCount}`;
    params.push(state);
  }

  if (city) {
    paramCount++;
    query += ` and LOWER(city) = LOWER($${paramCount})`;
    params.push(city);
  }

  if (search) {
    paramCount++;
    query += ` and (
      LOWER(name) LIKE LOWER($${paramCount}) OR
      LOWER(city) LIKE LOWER($${paramCount}) OR
      LOWER(state) LIKE LOWER($${paramCount})
    )`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countQuery = query.replace(/select[\s\S]*?from/, "select count(*) as total from");
  const countRes = await pool.query(countQuery, params);
  const total = Number(countRes.rows[0].total);

  // Add ordering and pagination
  query += ` order by updated_at desc, name asc limit $${paramCount + 1} offset $${paramCount + 2}`;
  params.push(limit, offset);

  const res = await pool.query(query, params);

  reply.send({
    ok: true,
    total,
    limit,
    offset,
    count: res.rows.length,
    courses: res.rows
  });
});

app.get("/v1/courses/:id", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const { id } = req.params;

  const courseRes = await pool.query(
    `select
       *,
       CASE WHEN geom IS NULL THEN NULL ELSE ST_Y(geom::geometry) END as "geoLat",
       CASE WHEN geom IS NULL THEN NULL ELSE ST_X(geom::geometry) END as "geoLng"
     from courses
     where id = $1`,
    [id]
  );
  if (courseRes.rowCount === 0) {
    reply.code(404).send({ error: "not_found" });
    return;
  }

  const typesRes = await pool.query(
    "select group_key, type_key from course_types where course_id = $1 order by group_key, type_key",
    [id]
  );

  const snapRes = await pool.query(
    "select snapshot_id from course_snapshots where course_id = $1 order by fetched_at desc limit 1",
    [id]
  );

  reply.send({
    course: courseRes.rows[0],
    courseTypes: typesRes.rows.map(r => ({ groupKey: r.group_key, typeKey: r.type_key })),
    latestSnapshotId: snapRes.rows[0]?.snapshot_id ?? null
  });
});

app.get("/v1/courses/:id/snapshot/:snapshotId", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const { id, snapshotId } = req.params;

  const snapRes = await pool.query(
    "select raw_payload, fetched_at from course_snapshots where course_id = $1 and snapshot_id = $2",
    [id, snapshotId]
  );
  if (snapRes.rowCount === 0) {
    reply.code(404).send({ error: "snapshot_not_found" });
    return;
  }

  reply.send({
    courseId: id,
    snapshotId,
    fetchedAt: snapRes.rows[0].fetched_at,
    rawPayload: snapRes.rows[0].raw_payload
  });
});

app.get("/v1/courses/near", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const miles = req.query.miles ? Number(req.query.miles) : 25;

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(miles)) {
    reply.code(400).send({ error: "invalid_query", expected: "lat,lng,miles" });
    return;
  }

  const radiusMeters = milesToMeters(miles);
  const holeCount = req.query.hole_count ? String(req.query.hole_count) : null;
  const access = req.query.access ? String(req.query.access) : null;
  const tech = req.query.tech ? String(req.query.tech) : null;

  const res = await pool.query(
    `select
       c.id, c.name, c.city, c.state, c.holes, c.domain, c.phone,
       CASE WHEN c.geom IS NULL THEN NULL ELSE ST_Y(c.geom::geometry) END as "geoLat",
       CASE WHEN c.geom IS NULL THEN NULL ELSE ST_X(c.geom::geometry) END as "geoLng",
       ST_Distance(
         c.geom,
         ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography
       ) as distance_meters
     from courses c
     where c.geom is not null
       and ST_DWithin(
         c.geom,
         ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
         $3::float8
       )
       and ($4::text is null or exists (
         select 1 from course_types t
         where t.course_id = c.id and t.group_key = 'hole_count' and t.type_key = $4::text
       ))
       and ($5::text is null or exists (
         select 1 from course_types t
         where t.course_id = c.id and t.group_key = 'access' and t.type_key = $5::text
       ))
       and ($6::text is null or exists (
         select 1 from course_types t
         where t.course_id = c.id and t.group_key = 'tech' and t.type_key = $6::text
       ))
     order by distance_meters asc
     limit 50`,
    [lat, lng, radiusMeters, holeCount, access, tech]
  );

  reply.send({
    ok: true,
    lat,
    lng,
    miles,
    hole_count: holeCount,
    access,
    tech,
    results: res.rows.map(r => ({
      id: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      holes: r.holes,
      domain: r.domain,
      phone: r.phone,
      geoLat: r.geoLat,
      geoLng: r.geoLng,
      distanceMiles: r.distance_meters / 1609.344
    }))
  });
});

app.get("/v1/courses/:id/tee-sets", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const { id } = req.params;

  // Verify course exists
  const courseCheck = await pool.query("SELECT id FROM courses WHERE id = $1", [id]);
  if (courseCheck.rowCount === 0) {
    reply.code(404).send({ error: "course_not_found" });
    return;
  }

  const res = await pool.query(
    `SELECT id, color, name, rating, slope, par, units
     FROM tee_sets
     WHERE course_id = $1
     ORDER BY name NULLS LAST, color NULLS LAST`,
    [id]
  );

  reply.send({
    courseId: id,
    teeSets: res.rows
  });
});

app.get("/v1/courses/:id/holes", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const { id } = req.params;
  const teeSetId = req.query.teeSetId ? String(req.query.teeSetId) : null;

  // Verify course exists
  const courseCheck = await pool.query("SELECT id FROM courses WHERE id = $1", [id]);
  if (courseCheck.rowCount === 0) {
    reply.code(404).send({ error: "course_not_found" });
    return;
  }

  let query = `
    SELECT h.id, h.tee_set_id, h.hole_number, h.par, h.handicap_index, h.distance, h.hazards
    FROM holes h
    WHERE h.course_id = $1
  `;
  const params = [id];

  if (teeSetId) {
    query += ` AND h.tee_set_id = $2`;
    params.push(teeSetId);
  }

  query += ` ORDER BY h.tee_set_id, h.hole_number`;

  const res = await pool.query(query, params);

  reply.send({
    courseId: id,
    teeSetId: teeSetId || null,
    holes: res.rows
  });
});

app.get("/v1/courses/:id/amenities", async (req, reply) => {
  if (!requireApiAuth(req, reply)) return;
  const { id } = req.params;

  // Verify course exists
  const courseCheck = await pool.query("SELECT id FROM courses WHERE id = $1", [id]);
  if (courseCheck.rowCount === 0) {
    reply.code(404).send({ error: "course_not_found" });
    return;
  }

  const res = await pool.query(
    `SELECT a.id, a.name, a.category
     FROM amenities a
     INNER JOIN course_amenities ca ON ca.amenity_id = a.id
     WHERE ca.course_id = $1
     ORDER BY a.category NULLS LAST, a.name`,
    [id]
  );

  reply.send({
    courseId: id,
    amenities: res.rows
  });
});

app.post("/v1/courses/ingest", async (req, reply) => {
    if (!requireAuth(req, reply)) return;
  
    const parsed = PayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({
        error: "invalid_payload",
        details: parsed.error.flatten()
      });
      return;
    }
  
    const payload = parsed.data;
    const c = payload.course;
  
    // Compute payload hash for idempotency (normalize JSON: sort keys recursively, no whitespace)
    // This matches Python's json.dumps(payload, sort_keys=True, separators=(',', ':'))
    function normalizeJSON(obj) {
      if (obj === null || typeof obj !== "object" || obj instanceof Date) {
        return JSON.stringify(obj);
      }
      if (Array.isArray(obj)) {
        return "[" + obj.map(normalizeJSON).join(",") + "]";
      }
      const keys = Object.keys(obj).sort();
      return "{" + keys.map(k => `"${k}":${normalizeJSON(obj[k])}`).join(",") + "}";
    }
    const normalizedPayload = normalizeJSON(payload);
    const payloadHash = crypto.createHash("sha256").update(normalizedPayload).digest("hex");
    
    // Check for existing snapshot with same payload hash (idempotency check)
    const existingSnapshot = await pool.query(
      "SELECT snapshot_id, course_id FROM course_snapshots WHERE payload_hash = $1 LIMIT 1",
      [payloadHash]
    );
    
    if (existingSnapshot.rows.length > 0) {
      // Idempotent: return existing snapshot
      return reply.send({
        ok: true,
        courseId: existingSnapshot.rows[0].course_id,
        snapshotId: existingSnapshot.rows[0].snapshot_id,
        idempotent: true
      });
    }
  
    const snapshotId = crypto.randomUUID();
    const fetchedAt = new Date();
  
    // geo
    const lat = c.geoLat ?? null;
    const lng = c.geoLng ?? null;
  
    const lastVerifiedAt = c.lastVerifiedAt ? new Date(c.lastVerifiedAt) : null;
    const sourceTags = c.sourceTags ?? payload.course?.sourceTags ?? [];
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      // Upsert canonical course
      await client.query(
        `INSERT INTO courses (
          id, name, domain, phone, email, city, state, timezone,
          status, moderation_status, holes, geom,
          address, playability, pricing_meta, media, provenance,
          source_tags, last_verified_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,
          CASE WHEN $12::float8 IS NULL OR $13::float8 IS NULL THEN NULL
               ELSE ST_SetSRID(ST_MakePoint($13::float8, $12::float8), 4326)::geography END,
          $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
          $19::text[], $20, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          domain = EXCLUDED.domain,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          timezone = EXCLUDED.timezone,
          status = EXCLUDED.status,
          moderation_status = EXCLUDED.moderation_status,
          holes = EXCLUDED.holes,
          geom = EXCLUDED.geom,
          address = EXCLUDED.address,
          playability = EXCLUDED.playability,
          pricing_meta = EXCLUDED.pricing_meta,
          media = EXCLUDED.media,
          provenance = EXCLUDED.provenance,
          source_tags = EXCLUDED.source_tags,
          last_verified_at = EXCLUDED.last_verified_at,
          updated_at = now()`
        ,
        [
          c.id,
          c.name,
          c.domain ?? null,
          c.phone ?? null,
          c.email ?? null,
          c.city ?? null,
          c.state ?? null,
          c.timezone ?? null,
          c.status ?? null,
          c.moderationStatus ?? null,
          c.playability?.holes ?? null,
          lat,
          lng,
          c.address ? JSON.stringify(c.address) : null,
          c.playability ? JSON.stringify(c.playability) : null,
          c.pricingMeta ? JSON.stringify(c.pricingMeta) : null,
          c.media ? JSON.stringify(c.media) : null,
          c.provenance ? JSON.stringify(c.provenance) : null,
          sourceTags,
          lastVerifiedAt
        ]
      );
  
      // Insert snapshot (immutable history) with idempotency check
      const snapshotInsertResult = await client.query(
        `INSERT INTO course_snapshots (snapshot_id, course_id, fetched_at, raw_payload, source_tags, provenance, payload_hash)
         VALUES ($1, $2, $3, $4::jsonb, $5::text[], $6::jsonb, $7)
         ON CONFLICT (payload_hash) DO NOTHING
         RETURNING snapshot_id`,
        [
          snapshotId,
          c.id,
          fetchedAt,
          JSON.stringify(payload),
          sourceTags,
          c.provenance ? JSON.stringify(c.provenance) : null,
          payloadHash
        ]
      );
      
      // If conflict occurred (duplicate payload_hash), fetch the existing snapshot
      if (snapshotInsertResult.rows.length === 0) {
        const existingSnapshotResult = await client.query(
          "SELECT snapshot_id FROM course_snapshots WHERE payload_hash = $1 LIMIT 1",
          [payloadHash]
        );
        
        if (existingSnapshotResult.rows.length > 0) {
          // Another request with same payload completed first - return existing
          await client.query("ROLLBACK");
          return reply.send({
            ok: true,
            courseId: c.id,
            snapshotId: existingSnapshotResult.rows[0].snapshot_id,
            idempotent: true
          });
        }
      }
  
      // Replace course types for this course (simple + consistent)
      await client.query("DELETE FROM course_types WHERE course_id = $1", [c.id]);
      const types = payload.courseTypes ?? [];
      for (const t of types) {
        await client.query(
          `INSERT INTO course_types (course_id, group_key, type_key) VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING`,
          [c.id, t.groupKey, t.typeKey]
        );
      }

      // --- Replace-all children (tee sets, holes, amenities) for this course ---
      // Order matters because of FKs.
      await client.query("DELETE FROM holes WHERE course_id = $1", [c.id]);
      await client.query("DELETE FROM tee_sets WHERE course_id = $1", [c.id]);
      await client.query("DELETE FROM course_amenities WHERE course_id = $1", [c.id]);

      // Amenities (dedupe globally by (name, category); stable hashed ID)
      const amenities = payload.amenities ?? [];
      for (const a of amenities) {
        const name = a?.name ?? null;
        if (!name) continue;
        const category = a?.category ?? null;
        const id = amenityId(name, category);

        await client.query(
          `INSERT INTO amenities (id, name, category)
           VALUES ($1,$2,$3)
           ON CONFLICT (name, category) DO UPDATE SET
             name = EXCLUDED.name
           RETURNING id`,
          [id, name, category]
        );

        await client.query(
          `INSERT INTO course_amenities (course_id, amenity_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [c.id, id]
        );
      }

      // Tee sets (deterministic IDs)
      const teeSets = payload.teeSets ?? [];
      const teeSetIdMap = new Map(); // original payload tee id -> deterministic id (if needed)

      for (const t of teeSets) {
        const detId = teeSetId(c.id, t?.color, t?.name);
        if (t?.id) teeSetIdMap.set(t.id, detId);

        await client.query(
          `INSERT INTO tee_sets (id, course_id, color, name, rating, slope, par, units)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             color = EXCLUDED.color,
             name = EXCLUDED.name,
             rating = EXCLUDED.rating,
             slope = EXCLUDED.slope,
             par = EXCLUDED.par,
             units = EXCLUDED.units`,
          [
            detId,
            c.id,
            t?.color ?? null,
            t?.name ?? null,
            t?.rating ?? null,
            t?.slope ?? null,
            t?.par ?? null,
            t?.units ?? null
          ]
        );
      }

      // Holes (deterministic IDs based on deterministic teeSetId + holeNumber)
      const holes = payload.holes ?? [];
      for (const h of holes) {
        const holeNumber = h?.holeNumber;
        if (!Number.isFinite(Number(holeNumber))) continue;

        // If payload references teeSetId, translate it; else try to derive one (fallback).
        const payloadTeeSetId = h?.teeSetId ?? null;
        const resolvedTeeSetId =
          (payloadTeeSetId && teeSetIdMap.get(payloadTeeSetId)) ||
          payloadTeeSetId; // if already deterministic or unknown

        if (!resolvedTeeSetId) continue;

        const detHoleId = holeId(resolvedTeeSetId, holeNumber);

        await client.query(
          `INSERT INTO holes (id, course_id, tee_set_id, hole_number, par, handicap_index, distance, hazards)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             par = EXCLUDED.par,
             handicap_index = EXCLUDED.handicap_index,
             distance = EXCLUDED.distance,
             hazards = EXCLUDED.hazards`,
          [
            detHoleId,
            c.id,
            resolvedTeeSetId,
            Number(holeNumber),
            h?.par ?? null,
            h?.handicapIndex ?? null,
            h?.distance ?? null,
            h?.hazards ? JSON.stringify(h.hazards) : JSON.stringify([])
          ]
        );
      }
  
      await client.query("COMMIT");
  
      return reply.send({
        ok: true,
        courseId: c.id,
        snapshotId,
        idempotent: false  // New snapshot created
      });
    } catch (err) {
      await client.query("ROLLBACK");
      req.log.error({ err }, "ingest failed");
      reply.code(500).send({ error: "ingest_failed" });
    } finally {
      client.release();
    }
  });

app.post("/v1/courses/ingest/batch", async (req, reply) => {
  if (!requireAuth(req, reply)) return;

  const payloads = req.body;
  if (!Array.isArray(payloads)) {
    reply.code(400).send({ error: "invalid_payload", expected: "array of course payloads" });
    return;
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const parsed = PayloadSchema.safeParse(payload);
    
    if (!parsed.success) {
      errors.push({
        index: i,
        error: "invalid_payload",
        details: parsed.error.flatten()
      });
      continue;
    }

    try {
      const c = parsed.data.course;
      
      // Compute payload hash for idempotency (normalize JSON: sort keys recursively, no whitespace)
      function normalizeJSON(obj) {
        if (obj === null || typeof obj !== "object" || obj instanceof Date) {
          return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
          return "[" + obj.map(normalizeJSON).join(",") + "]";
        }
        const keys = Object.keys(obj).sort();
        return "{" + keys.map(k => `"${k}":${normalizeJSON(obj[k])}`).join(",") + "}";
      }
      const normalizedPayload = normalizeJSON(payload);
      const payloadHash = crypto.createHash("sha256").update(normalizedPayload).digest("hex");
      
      // Check for existing snapshot with same payload hash
      const existingSnapshot = await pool.query(
        "SELECT snapshot_id, course_id FROM course_snapshots WHERE payload_hash = $1 LIMIT 1",
        [payloadHash]
      );
      
      let snapshotId;
      let isIdempotent = false;
      
      if (existingSnapshot.rows.length > 0) {
        // Idempotent: use existing snapshot
        snapshotId = existingSnapshot.rows[0].snapshot_id;
        isIdempotent = true;
        // Still update the course record (idempotent upsert)
      } else {
        snapshotId = crypto.randomUUID();
      }
      
      const fetchedAt = new Date();
      const lat = c.geoLat ?? null;
      const lng = c.geoLng ?? null;
      const lastVerifiedAt = c.lastVerifiedAt ? new Date(c.lastVerifiedAt) : null;
      const sourceTags = c.sourceTags ?? parsed.data.course?.sourceTags ?? [];

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Upsert canonical course
        await client.query(
          `INSERT INTO courses (
            id, name, domain, phone, email, city, state, timezone,
            status, moderation_status, holes, geom,
            address, playability, pricing_meta, media, provenance,
            source_tags, last_verified_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,
            $9,$10,$11,
            CASE WHEN $12::float8 IS NULL OR $13::float8 IS NULL THEN NULL
                 ELSE ST_SetSRID(ST_MakePoint($13::float8, $12::float8), 4326)::geography END,
            $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
            $19::text[], $20, now()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            domain = EXCLUDED.domain,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            timezone = EXCLUDED.timezone,
            status = EXCLUDED.status,
            moderation_status = EXCLUDED.moderation_status,
            holes = EXCLUDED.holes,
            geom = EXCLUDED.geom,
            address = EXCLUDED.address,
            playability = EXCLUDED.playability,
            pricing_meta = EXCLUDED.pricing_meta,
            media = EXCLUDED.media,
            provenance = EXCLUDED.provenance,
            source_tags = EXCLUDED.source_tags,
            last_verified_at = EXCLUDED.last_verified_at,
            updated_at = now()`,
          [
            c.id,
            c.name,
            c.domain ?? null,
            c.phone ?? null,
            c.email ?? null,
            c.city ?? null,
            c.state ?? null,
            c.timezone ?? null,
            c.status ?? null,
            c.moderationStatus ?? null,
            c.playability?.holes ?? null,
            lat,
            lng,
            c.address ? JSON.stringify(c.address) : null,
            c.playability ? JSON.stringify(c.playability) : null,
            c.pricingMeta ? JSON.stringify(c.pricingMeta) : null,
            c.media ? JSON.stringify(c.media) : null,
            c.provenance ? JSON.stringify(c.provenance) : null,
            sourceTags,
            lastVerifiedAt
          ]
        );

        // Insert snapshot with idempotency check
        if (!isIdempotent) {
          const snapshotInsertResult = await client.query(
            `INSERT INTO course_snapshots (snapshot_id, course_id, fetched_at, raw_payload, source_tags, provenance, payload_hash)
             VALUES ($1, $2, $3, $4::jsonb, $5::text[], $6::jsonb, $7)
             ON CONFLICT (payload_hash) DO NOTHING
             RETURNING snapshot_id`,
            [
              snapshotId,
              c.id,
              fetchedAt,
              JSON.stringify(payload),
              sourceTags,
              c.provenance ? JSON.stringify(c.provenance) : null,
              payloadHash
            ]
          );
          
          // If conflict occurred, fetch existing snapshot_id
          if (snapshotInsertResult.rows.length === 0) {
            const snapshotResult = await client.query(
              "SELECT snapshot_id FROM course_snapshots WHERE payload_hash = $1 LIMIT 1",
              [payloadHash]
            );
            
            if (snapshotResult.rows.length > 0) {
              snapshotId = snapshotResult.rows[0].snapshot_id;
              isIdempotent = true;
            }
          }
        }

        // Replace course types
        await client.query("DELETE FROM course_types WHERE course_id = $1", [c.id]);
        const types = parsed.data.courseTypes ?? [];
        for (const t of types) {
          await client.query(
            `INSERT INTO course_types (course_id, group_key, type_key) VALUES ($1,$2,$3)
             ON CONFLICT DO NOTHING`,
            [c.id, t.groupKey, t.typeKey]
          );
        }

        // Replace-all children (tee sets, holes, amenities)
        await client.query("DELETE FROM holes WHERE course_id = $1", [c.id]);
        await client.query("DELETE FROM tee_sets WHERE course_id = $1", [c.id]);
        await client.query("DELETE FROM course_amenities WHERE course_id = $1", [c.id]);

        // Amenities
        const amenities = parsed.data.amenities ?? [];
        for (const a of amenities) {
          const name = a?.name ?? null;
          if (!name) continue;
          const category = a?.category ?? null;
          const id = amenityId(name, category);

          await client.query(
            `INSERT INTO amenities (id, name, category)
             VALUES ($1,$2,$3)
             ON CONFLICT (name, category) DO UPDATE SET
               name = EXCLUDED.name
             RETURNING id`,
            [id, name, category]
          );

          await client.query(
            `INSERT INTO course_amenities (course_id, amenity_id)
             VALUES ($1,$2)
             ON CONFLICT DO NOTHING`,
            [c.id, id]
          );
        }

        // Tee sets
        const teeSets = parsed.data.teeSets ?? [];
        const teeSetIdMap = new Map();
        for (const t of teeSets) {
          const detId = teeSetId(c.id, t?.color, t?.name);
          if (t?.id) teeSetIdMap.set(t.id, detId);

          await client.query(
            `INSERT INTO tee_sets (id, course_id, color, name, rating, slope, par, units)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO UPDATE SET
               color = EXCLUDED.color,
               name = EXCLUDED.name,
               rating = EXCLUDED.rating,
               slope = EXCLUDED.slope,
               par = EXCLUDED.par,
               units = EXCLUDED.units`,
            [
              detId,
              c.id,
              t?.color ?? null,
              t?.name ?? null,
              t?.rating ?? null,
              t?.slope ?? null,
              t?.par ?? null,
              t?.units ?? null
            ]
          );
        }

        // Holes
        const holes = parsed.data.holes ?? [];
        for (const h of holes) {
          const holeNumber = h?.holeNumber;
          if (!Number.isFinite(Number(holeNumber))) continue;

          const payloadTeeSetId = h?.teeSetId ?? null;
          const resolvedTeeSetId =
            (payloadTeeSetId && teeSetIdMap.get(payloadTeeSetId)) ||
            payloadTeeSetId;

          if (!resolvedTeeSetId) continue;

          const detHoleId = holeId(resolvedTeeSetId, holeNumber);

          await client.query(
            `INSERT INTO holes (id, course_id, tee_set_id, hole_number, par, handicap_index, distance, hazards)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
             ON CONFLICT (id) DO UPDATE SET
               par = EXCLUDED.par,
               handicap_index = EXCLUDED.handicap_index,
               distance = EXCLUDED.distance,
               hazards = EXCLUDED.hazards`,
            [
              detHoleId,
              c.id,
              resolvedTeeSetId,
              Number(holeNumber),
              h?.par ?? null,
              h?.handicapIndex ?? null,
              h?.distance ?? null,
              h?.hazards ? JSON.stringify(h.hazards) : JSON.stringify([])
            ]
          );
        }

        await client.query("COMMIT");
        results.push({
          index: i,
          courseId: c.id,
          snapshotId,
          ok: true,
          idempotent: isIdempotent || false
        });
      } catch (err) {
        await client.query("ROLLBACK");
        errors.push({
          index: i,
          courseId: c.id,
          error: "ingest_failed",
          message: err.message
        });
      } finally {
        client.release();
      }
    } catch (err) {
      errors.push({
        index: i,
        error: "processing_failed",
        message: err.message
      });
    }
  }

  reply.send({
    ok: true,
    processed: results.length + errors.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
});

  const port = Number(process.env.PORT || 8080);
await ensureSchema(pool, app.log);
await app.listen({ port, host: "0.0.0.0" });