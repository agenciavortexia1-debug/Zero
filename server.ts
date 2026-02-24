import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { supabase } from "./src/lib/supabase.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/packs", async (req, res) => {
    try {
      const { data: packs, error } = await supabase
        .from('packs')
        .select('*, units(count)')
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Supabase count aggregation might return an array or object depending on query
      // We'll simplify and just get the counts separately if needed, or use a join
      // Actually, a better way to get counts in Supabase is to use select('*, units(count)')
      // but it requires specific configuration. Let's do it simply:
      
      const { data: packsWithUnits, error: packsError } = await supabase
        .from('packs')
        .select(`
          *,
          unit_count:units(count)
        `)
        .order('start_time', { ascending: false });

      if (packsError) throw packsError;

      const formattedPacks = packsWithUnits.map(p => ({
        ...p,
        unit_count: p.unit_count?.[0]?.count || 0
      }));

      res.json(formattedPacks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar carteiras" });
    }
  });

  app.post("/api/packs", async (req, res) => {
    const { price } = req.body;
    if (!price || isNaN(price)) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    try {
      // Finish active pack
      const { data: activePack } = await supabase
        .from('packs')
        .select('id')
        .eq('status', 'active')
        .single();

      if (activePack) {
        await supabase
          .from('packs')
          .update({ status: 'finished', end_time: new Date().toISOString() })
          .eq('id', activePack.id);
      }

      const { data, error } = await supabase
        .from('packs')
        .insert([{ price, status: 'active' }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar carteira" });
    }
  });

  app.post("/api/units", async (req, res) => {
    const { pack_id, reason } = req.body;
    if (!pack_id) return res.status(400).json({ error: "Pack ID obrigatório" });
    
    try {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .insert([{ pack_id, reason: reason || "" }])
        .select()
        .single();

      if (unitError) throw unitError;

      // Check count
      const { count, error: countError } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('pack_id', pack_id);

      if (countError) throw countError;

      if (count && count >= 20) {
        await supabase
          .from('packs')
          .update({ status: 'finished', end_time: new Date().toISOString() })
          .eq('id', pack_id);
      }
      
      res.json({ id: unit.id, current_count: count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao registrar consumo" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const { start, end } = req.query;

    try {
      let packsQuery = supabase.from('packs').select('price, start_time');
      let unitsQuery = supabase.from('units').select('timestamp');

      if (start && end) {
        packsQuery = packsQuery.gte('start_time', start).lte('start_time', end);
        unitsQuery = unitsQuery.gte('timestamp', start).lte('timestamp', end);
      }

      const { data: packsData, error: packsError } = await packsQuery;
      const { data: unitsData, error: unitsError } = await unitsQuery;

      if (packsError || unitsError) throw packsError || unitsError;

      const totalSpent = packsData.reduce((sum, p) => sum + p.price, 0);
      const totalPacks = packsData.length;
      const totalUnits = unitsData.length;

      const firstDate = start ? new Date(start as string) : (packsData.length > 0 ? new Date(Math.min(...packsData.map(p => new Date(p.start_time).getTime()))) : new Date());
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
      const timelineMap = new Map();
      unitsData.forEach(u => {
        const d = new Date(u.timestamp).toISOString().split('T')[0];
        timelineMap.set(d, (timelineMap.get(d) || 0) + 1);
      });

      const timeline = Array.from(timelineMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
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

