import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tracker.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    price REAL NOT NULL,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pack_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY(pack_id) REFERENCES packs(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/packs", (req, res) => {
    const packs = db.prepare("SELECT * FROM packs ORDER BY start_time DESC").all();
    // For each pack, get unit count
    const packsWithUnits = packs.map(p => {
      const units = db.prepare("SELECT COUNT(*) as count FROM units WHERE pack_id = ?").get(p.id);
      return { ...p, unit_count: units.count };
    });
    res.json(packsWithUnits);
  });

  app.post("/api/packs", (req, res) => {
    const { price } = req.body;
    if (!price || isNaN(price)) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    const activePack = db.prepare("SELECT id FROM packs WHERE status = 'active'").get();
    if (activePack) {
      db.prepare("UPDATE packs SET status = 'finished', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(activePack.id);
    }

    const result = db.prepare("INSERT INTO packs (price, status) VALUES (?, 'active')").run(price);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/units", (req, res) => {
    const { pack_id, reason } = req.body;
    if (!pack_id) return res.status(400).json({ error: "Pack ID obrigatório" });
    
    const result = db.prepare("INSERT INTO units (pack_id, reason) VALUES (?, ?)").run(pack_id, reason || "");
    
    // Check if pack is finished (20 units)
    const count = db.prepare("SELECT COUNT(*) as count FROM units WHERE pack_id = ?").get(pack_id).count;
    if (count >= 20) {
      db.prepare("UPDATE packs SET status = 'finished', end_time = CURRENT_TIMESTAMP WHERE id = ?").run(pack_id);
    }
    
    res.json({ id: result.lastInsertRowid, current_count: count });
  });

  app.get("/api/stats", (req, res) => {
    const { start, end } = req.query;
    let dateFilter = "";
    let params: any[] = [];

    if (start && end) {
      dateFilter = " WHERE timestamp BETWEEN ? AND ?";
      params = [start, end];
    }

    const totalSpentQuery = start && end 
      ? "SELECT SUM(price) as total FROM packs WHERE start_time BETWEEN ? AND ?" 
      : "SELECT SUM(price) as total FROM packs";
    const totalSpent = db.prepare(totalSpentQuery).get(params).total || 0;

    const totalPacksQuery = start && end 
      ? "SELECT COUNT(*) as count FROM packs WHERE start_time BETWEEN ? AND ?" 
      : "SELECT COUNT(*) as count FROM packs";
    const totalPacks = db.prepare(totalPacksQuery).get(params).count || 0;

    const totalUnitsQuery = start && end 
      ? "SELECT COUNT(*) as count FROM units WHERE timestamp BETWEEN ? AND ?" 
      : "SELECT COUNT(*) as count FROM units";
    const totalUnits = db.prepare(totalUnitsQuery).get(params).count || 0;
    
    const firstPackQuery = start && end
      ? "SELECT MIN(start_time) as first FROM packs WHERE start_time BETWEEN ? AND ?"
      : "SELECT MIN(start_time) as first FROM packs";
    const firstPack = db.prepare(firstPackQuery).get(params);
    
    const firstDate = start ? new Date(start as string) : (firstPack.first ? new Date(firstPack.first) : new Date());
    const lastDate = end ? new Date(end as string) : new Date();
    
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const diffWeeks = Math.max(1, diffDays / 7);
    const diffMonths = Math.max(1, diffDays / 30);

    const avgPacksPerDay = (totalPacks / diffDays).toFixed(2);
    const avgSpentPerDay = (totalSpent / diffDays).toFixed(2);
    
    const avgPacksPerWeek = (totalPacks / diffWeeks).toFixed(2);
    const avgSpentPerWeek = (totalSpent / diffWeeks).toFixed(2);
    
    const avgPacksPerMonth = (totalPacks / diffMonths).toFixed(2);
    const avgSpentPerMonth = (totalSpent / diffMonths).toFixed(2);

    // Timeline data
    let timelineQuery = "";
    if (start && end) {
      timelineQuery = `
        SELECT date(timestamp) as date, COUNT(*) as count 
        FROM units 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY date(timestamp)
        ORDER BY date ASC
      `;
    } else {
      timelineQuery = `
        SELECT date(timestamp) as date, COUNT(*) as count 
        FROM units 
        WHERE timestamp > date('now', '-7 days')
        GROUP BY date(timestamp)
        ORDER BY date ASC
      `;
    }
    const timeline = db.prepare(timelineQuery).all(params);

    res.json({
      totalSpent,
      totalPacks,
      totalUnits,
      avgPacksPerDay,
      avgSpentPerDay,
      avgPacksPerWeek,
      avgSpentPerWeek,
      avgPacksPerMonth,
      avgSpentPerMonth,
      periodDays: diffDays,
      timeline
    });
  });

  app.post("/api/ai-analysis", async (req, res) => {
    try {
      const packs = db.prepare("SELECT * FROM packs ORDER BY start_time DESC LIMIT 50").all();
      const { getHealthAnalysis } = await import("./src/services/aiService.ts");
      const analysis = await getHealthAnalysis(packs);
      res.json({ analysis });
    } catch (e) {
      res.status(500).json({ error: "Erro na análise" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const { getChatResponse } = await import("./src/services/aiService.ts");
      const response = await getChatResponse(message, history || []);
      res.json({ response });
    } catch (e) {
      res.status(500).json({ error: "Erro no chat" });
    }
  });

  app.post("/api/trigger-analysis", async (req, res) => {
    try {
      const units = db.prepare("SELECT reason FROM units WHERE reason IS NOT NULL AND reason != '' LIMIT 100").all();
      const { getTriggerAnalysis } = await import("./src/services/aiService.ts");
      const analysis = await getTriggerAnalysis(units);
      res.json(analysis);
    } catch (e) {
      res.status(500).json({ error: "Erro na análise de gatilhos" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
