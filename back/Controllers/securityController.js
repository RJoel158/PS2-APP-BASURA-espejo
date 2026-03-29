import {
  addBlacklistEntry,
  deactivateBlacklistEntry,
  getAuditLog,
  getBlacklistEntries,
  listConfigValues,
  getConfigValue,
  getSuspiciousActivity,
  logAuditAction,
  upsertConfigValue
} from '../Services/securityLogService.js';

const parseLimit = (value, fallback = 50, max = 200) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const parseOffset = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
};

export const getAppConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const config = await getConfigValue(key);
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al obtener configuración' });
  }
};

export const listAppConfig = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 300);
    const offset = parseOffset(req.query.offset);
    const rows = await listConfigValues({ limit, offset });

    return res.json({
      success: true,
      data: rows,
      meta: { limit, offset, total: rows.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al listar configuración' });
  }
};

export const upsertAppConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Campo value requerido' });
    }

    await upsertConfigValue({ key, value, updatedBy: req.user?.id || null });
    await logAuditAction({
      actorId: req.user?.id || null,
      action: 'app_config_update',
      targetTable: 'app_config',
      targetId: null,
      details: { key }
    });

    return res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

export const listSuspiciousActivity = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 200);
    const offset = parseOffset(req.query.offset);
    const rows = await getSuspiciousActivity({ limit, offset });

    return res.json({
      success: true,
      data: rows,
      meta: { limit, offset, total: rows.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al obtener actividad sospechosa' });
  }
};

export const addBlacklist = async (req, res) => {
  try {
    const { subjectType, subjectValue, isPermanent = false, expiresAt = null, reason = null } = req.body;

    if (!['ip', 'user'].includes(subjectType) || !subjectValue) {
      return res.status(400).json({
        success: false,
        error: 'subjectType debe ser ip o user, y subjectValue es requerido'
      });
    }

    await addBlacklistEntry({
      subjectType,
      subjectValue: String(subjectValue),
      isPermanent,
      expiresAt,
      reason,
      createdBy: req.user?.id || null
    });

    await logAuditAction({
      actorId: req.user?.id || null,
      action: 'security_blacklist_upsert',
      targetTable: 'security_blacklist',
      targetId: null,
      details: { subjectType, subjectValue }
    });

    return res.json({ success: true, message: 'Blacklist actualizada' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al actualizar blacklist' });
  }
};

export const listBlacklist = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 300);
    const offset = parseOffset(req.query.offset);
    const rows = await getBlacklistEntries({ limit, offset });

    return res.json({
      success: true,
      data: rows,
      meta: { limit, offset, total: rows.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al obtener blacklist' });
  }
};

export const deactivateBlacklist = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    await deactivateBlacklistEntry({ id });
    await logAuditAction({
      actorId: req.user?.id || null,
      action: 'security_blacklist_deactivate',
      targetTable: 'security_blacklist',
      targetId: id,
      details: null
    });

    return res.json({ success: true, message: 'Registro de blacklist desactivado' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al desactivar blacklist' });
  }
};

export const listAudit = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 300);
    const offset = parseOffset(req.query.offset);
    const rows = await getAuditLog({ limit, offset });

    return res.json({
      success: true,
      data: rows,
      meta: { limit, offset, total: rows.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al obtener auditoría' });
  }
};
