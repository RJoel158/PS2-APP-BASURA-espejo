// Eliminar periodo (solo actualiza estado)
const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    await RankingPeriod.markDeleted(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// Editar periodo
const updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.body;
    await RankingPeriod.update(id, { fecha_inicio, fecha_fin });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// Crear nuevo periodo
const createPeriod = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.body;
    // Validar que no haya periodo activo
    const [activos] = await db.query("SELECT id FROM ranking_periods WHERE estado = 'activo'");
    if (activos.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un periodo activo. Debe cerrarlo o eliminarlo antes de crear uno nuevo.' });
    }
    // Validar fecha de inicio
    if (new Date(fecha_inicio) < new Date()) {
      return res.status(400).json({ success: false, error: 'No se puede crear un periodo con fecha de inicio en el pasado.' });
    }
    await RankingPeriod.create({ fecha_inicio, fecha_fin, estado: 'activo' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
import RankingPeriod from '../Models/rankingPeriodModel.js';
import RankingHistory from '../Models/rankingHistoryModel.js';
import RankingTops from '../Models/rankingTopsModel.js';
import * as AppConfigModel from '../Models/appConfigModel.js';
import db from '../config/DBConnect.js';

const parseRankingDecreasePercent = (rawValue, fallback = 10) => {
  let normalized = rawValue;
  if (typeof rawValue === 'string') {
    try {
      normalized = JSON.parse(rawValue);
    } catch {
      normalized = rawValue;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
};

const RankingController = {
  // Obtener periodo activo o último cerrado
  getActiveOrLastPeriod: async (req, res) => {
    try {
      // Buscar periodo activo
      const [activos] = await db.query("SELECT * FROM ranking_periods WHERE estado = 'activo' ORDER BY fecha_inicio DESC LIMIT 1");
      if (activos.length > 0) {
        return res.json(activos[0]);
      }
      // Si no hay activo, buscar el último cerrado
      const [cerrados] = await db.query("SELECT * FROM ranking_periods WHERE estado = 'cerrado' ORDER BY fecha_fin DESC LIMIT 1");
      if (cerrados.length > 0) {
        return res.json(cerrados[0]);
      }
      // Si no hay periodos
      return res.status(404).json({ error: 'No hay periodos registrados.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  // Ranking en tiempo real por periodo
  getLiveRankingByPeriod: async (req, res) => {
    const { periodo_id } = req.params;
    try {
      // Top 10 recicladores por score agregado (tabla score)
      const [recicladores] = await db.query(`
        SELECT
          u.id AS user_id,
          u.email,
          'reciclador' AS rol,
          COALESCE(SUM(s.score), 0) AS puntaje_final
        FROM users u
        LEFT JOIN score s
          ON s.ratedToUserId = u.id
         AND s.state = 1
        WHERE u.roleId = 3
          AND u.state != 0
        GROUP BY u.id, u.email
        HAVING COALESCE(SUM(s.score), 0) > 0
        ORDER BY puntaje_final DESC, u.id ASC
        LIMIT 10
      `);
      // Top 10 recolectores por score agregado (tabla score)
      const [recolectores] = await db.query(`
        SELECT
          u.id AS user_id,
          u.email,
          'recolector' AS rol,
          COALESCE(SUM(s.score), 0) AS puntaje_final
        FROM users u
        LEFT JOIN score s
          ON s.ratedToUserId = u.id
         AND s.state = 1
        WHERE u.roleId = 2
          AND u.state != 0
        GROUP BY u.id, u.email
        HAVING COALESCE(SUM(s.score), 0) > 0
        ORDER BY puntaje_final DESC, u.id ASC
        LIMIT 10
      `);
      res.json({ success: true, recicladores, recolectores });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // Listar todos los periodos (compatibilidad frontend)
  getPeriods: async (req, res) => {
    try {
      const [periods] = await db.query("SELECT * FROM ranking_periods ORDER BY fecha_inicio DESC");
      res.json({ success: true, periods });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Solo periodos cerrados con fecha de cierre
  getClosedPeriods: async (req, res) => {
    try {
      const [periods] = await db.query("SELECT id, fecha_fin, estado FROM ranking_periods WHERE estado = 'cerrado' ORDER BY fecha_fin DESC");
      res.json({ success: true, periods });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Obtener top 10 recicladores y recolectores de ranking_tops por periodo
  getTopsByPeriod: async (req, res) => {
    const { periodo_id } = req.params;
    try {
      // Consulta el top real del periodo desde ranking_tops
      const [tops] = await db.query(`
        SELECT t.*, u.email
        FROM ranking_tops t
        INNER JOIN users u ON t.user_id = u.id
        WHERE t.periodo_id = ?
        ORDER BY t.rol, t.posicion ASC
      `, [periodo_id]);
      res.json({ success: true, tops });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Listar ranking histórico por periodo
  getHistory: async (req, res) => {
    const { periodo_id } = req.params;
    try {
      const [rows] = await RankingHistory.getByPeriod(periodo_id);
      res.json({ success: true, history: rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // Cerrar periodo y registrar ranking
  closePeriod: async (req, res) => {
    let conn;
    try {
      const { periodo_id } = req.body;
      
      // Validar que periodo_id existe
      if (!periodo_id || isNaN(parseInt(periodo_id))) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID del período es requerido y debe ser un número válido' 
        });
      }

      console.log('[RANKING] Cerrando periodo:', periodo_id);

      conn = await db.getConnection();
      await conn.beginTransaction();

    
     
      const [recicladores] = await conn.query(
        `SELECT
           u.id AS user_id,
           'reciclador' AS rol,
           COALESCE(SUM(s.score), 0) AS puntaje_final
         FROM users u
         LEFT JOIN score s
           ON s.ratedToUserId = u.id
          AND s.state = 1
         WHERE u.roleId = 3
           AND u.state != 0
         GROUP BY u.id
         HAVING COALESCE(SUM(s.score), 0) > 0
         ORDER BY puntaje_final DESC, u.id ASC
         LIMIT 5`
      );

      const [recolectores] = await conn.query(
        `SELECT
           u.id AS user_id,
           'recolector' AS rol,
           COALESCE(SUM(s.score), 0) AS puntaje_final
         FROM users u
         LEFT JOIN score s
           ON s.ratedToUserId = u.id
          AND s.state = 1
         WHERE u.roleId = 2
           AND u.state != 0
         GROUP BY u.id
         HAVING COALESCE(SUM(s.score), 0) > 0
         ORDER BY puntaje_final DESC, u.id ASC
         LIMIT 5`
      );
      console.log('[RANKING] Recicladores:', recicladores);
      console.log('[RANKING] Recolectores:', recolectores);

      // Unir y asignar posición
      const topsPorRol = [
        ...recicladores.map((r, i) => ({
          periodo_id,
          rol: r.rol,
          user_id: r.user_id,
          puntaje_final: r.puntaje_final,
          posicion: i+1,
          fecha_cierre: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })),
        ...recolectores.map((r, i) => ({
          periodo_id,
          rol: r.rol,
          user_id: r.user_id,
          puntaje_final: r.puntaje_final,
          posicion: i+1,
          fecha_cierre: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }))
      ];
      console.log('[RANKING] Tops por rol:', topsPorRol);

      if (topsPorRol.length > 0) {
        const topsValues = topsPorRol.map((t) => [
          t.periodo_id,
          t.rol,
          t.user_id,
          t.puntaje_final,
          t.posicion,
          t.fecha_cierre
        ]);
        await conn.query(
          'INSERT INTO ranking_tops (periodo_id, rol, user_id, puntaje_final, posicion, fecha_cierre) VALUES ?',
          [topsValues]
        );
        console.log('[RANKING] Tops guardados en ranking_tops');

    
        const rankingWithPos = topsPorRol.map(({fecha_cierre, ...rest}) => rest);
        const historyValues = rankingWithPos.map((h) => [
          h.periodo_id,
          h.rol,
          h.user_id,
          h.puntaje_final,
          h.posicion
        ]);
        await conn.query(
          'INSERT INTO ranking_history (periodo_id, rol, user_id, puntaje_final, posicion) VALUES ?',
          [historyValues]
        );
        console.log('[RANKING] Ranking guardado en historial');

        // --- DECAY CONFIGURABLE ---
        const rankingDecreaseConfig = await AppConfigModel.getByKey('ranking_decrease');
        const baseDecreasePercent = parseRankingDecreasePercent(rankingDecreaseConfig?.config_value, 10);
        const top5DecreasePercent = baseDecreasePercent + 5;
        const top5Decay = top5DecreasePercent / 100;
        const restDecay = baseDecreasePercent / 100;

        // Aplica decay extra al top 5 de cada rol (sobre score acumulado real)
        for (let i = 0; i < recicladores.length && i < 5; i++) {
          const userId = recicladores[i].user_id;
          await conn.query(
            'UPDATE score SET score = score - ROUND(score * ?) WHERE ratedToUserId = ? AND state = 1',
            [top5Decay, userId]
          );
        }
        for (let i = 0; i < recolectores.length && i < 5; i++) {
          const userId = recolectores[i].user_id;
          await conn.query(
            'UPDATE score SET score = score - ROUND(score * ?) WHERE ratedToUserId = ? AND state = 1',
            [top5Decay, userId]
          );
        }

        // Decay base para todos los demás usuarios de esos roles
        const top5UserIds = [...recicladores.slice(0, 5), ...recolectores.slice(0, 5)].map((r) => r.user_id);

        if (top5UserIds.length > 0) {
          const placeholders = top5UserIds.map(() => '?').join(', ');
          await conn.query(
            `UPDATE score s
             INNER JOIN users u ON s.ratedToUserId = u.id
             SET s.score = s.score - ROUND(s.score * ?)
             WHERE s.state = 1
               AND u.state != 0
               AND u.roleId IN (2, 3)
               AND u.id NOT IN (${placeholders})`,
            [restDecay, ...top5UserIds]
          );
        } else {
          await conn.query(
            `UPDATE score s
             INNER JOIN users u ON s.ratedToUserId = u.id
             SET s.score = s.score - ROUND(s.score * ?)
             WHERE s.state = 1
               AND u.state != 0
               AND u.roleId IN (2, 3)` ,
            [restDecay]
          );
        }

        await conn.query(
          "UPDATE ranking_periods SET estado = 'cerrado', fecha_fin = NOW() WHERE id = ?",
          [periodo_id]
        );
        console.log('[RANKING] Periodo cerrado en BD');

        await conn.commit();
        res.json({ success: true, ranking: topsPorRol });
      } else {
        await conn.query(
          "UPDATE ranking_periods SET estado = 'cerrado', fecha_fin = NOW() WHERE id = ?",
          [periodo_id]
        );
        await conn.commit();
        res.json({ success: false, message: 'No hay puntajes para guardar en el ranking de este periodo.' });
      }
    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error('[RANKING] Error en rollback:', rollbackErr);
        }
      }
      console.error('[RANKING] Error al cerrar periodo:', err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (conn) conn.release();
    }
  },
};

export default {
  ...RankingController,
  createPeriod,
  updatePeriod,
  deletePeriod,
};
