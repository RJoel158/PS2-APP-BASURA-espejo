// Controllers/userController.js
import bcrypt from "bcrypt";
import crypto from "crypto";
import * as UserModel from "../Models/userModel.js";
import * as ScoreModel from "../Models/scoreModel.js";
import * as NotificationModel from "../Models/notificationModel.js";
import { sendCredentialsEmail, sendRejectionEmail } from "../Services/emailService.js";
import { Validator } from "../shared/Validator.js";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../shared/auth.js";
import { isBlacklisted, logSuspiciousActivity } from '../Services/securityLogService.js';
import { getOrSetCached } from '../shared/responseCache.js';

const LOGIN_USER_CACHE_TTL_MS = Number(process.env.LOGIN_USER_CACHE_TTL_MS || 15000);
const LOGIN_BCRYPT_CACHE_TTL_MS = Number(process.env.LOGIN_BCRYPT_CACHE_TTL_MS || 15000);
const LOGIN_CACHE_MAX_ENTRIES = Number(process.env.LOGIN_CACHE_MAX_ENTRIES || 500);

const loginUserCache = new Map();
const loginPasswordCache = new Map();

const prewarmUserReadCaches = (userId) => {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) return;

  void getOrSetCached(
    `score:user:${numericUserId}:total`,
    async () => ScoreModel.getUserTotalScore(numericUserId),
    Number(process.env.CACHE_TTL_SCORE_MS || 20000)
  ).catch(() => {});

  void getOrSetCached(
    `notifications:user:${numericUserId}:list:20:0:0`,
    async () => NotificationModel.getUserNotifications(numericUserId, 20, 0, false),
    Number(process.env.CACHE_TTL_NOTIFICATIONS_MS || 15000)
  ).catch(() => {});

  void getOrSetCached(
    `notifications:user:${numericUserId}:unread-count`,
    async () => NotificationModel.getUnreadCount(numericUserId),
    Number(process.env.CACHE_TTL_NOTIFICATIONS_MS || 15000)
  ).catch(() => {});
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getCacheValue = (cache, key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

const setCacheValue = (cache, key, value, ttlMs) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || 1000)
  });

  if (cache.size > LOGIN_CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
};

const getUserForLoginCached = async (email) => {
  const normalized = normalizeEmail(email);
  const cacheKey = `user:${normalized}`;
  const hit = getCacheValue(loginUserCache, cacheKey);
  if (hit !== null) return hit;

  const user = await UserModel.loginUser(normalized);
  setCacheValue(loginUserCache, cacheKey, user || null, LOGIN_USER_CACHE_TTL_MS);
  return user;
};

const comparePasswordCached = async ({ password, storedPassword, userId }) => {
  const passDigest = crypto.createHash('sha256').update(String(password)).digest('hex');
  const cacheKey = `bcrypt:${userId}:${storedPassword}:${passDigest}`;
  const hit = getCacheValue(loginPasswordCache, cacheKey);
  if (hit !== null) return Boolean(hit);

  const isValid = await bcrypt.compare(password, storedPassword);
  setCacheValue(loginPasswordCache, cacheKey, isValid, LOGIN_BCRYPT_CACHE_TTL_MS);
  return isValid;
};

/** GET /users */
export const getUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllWithPersona();
    res.json({ success: true, users });
  } catch (err) {
    console.error("[ERROR] getUsers controller:", { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener usuarios" });
  }
};

/** GET /users/withPerson */
export const getUsersPerson = async (req, res) => {
  try {
    const users = await UserModel.getAllUsersWithPerson();
    res.json({ success: true, users });
  } catch (err) {
    console.error("[ERROR] getUsers controller:", { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener usuarios" });
  }
};

/** GET /users/collectors/pending */
export const getCollectorsPendingWithPerson = async (req, res) => {
  try {
    const collectors = await UserModel.getCollectorsPendingWithPerson();
    res.json({ success: true, collectors });
  } catch (err) {
    console.error("[ERROR] getCollectorsPendingWithPerson controller:", { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener solicitudes de recolectores pendientes" });
  }
};



/** GET /users/:id */
export const getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await UserModel.getByIdWithPersona(id);
    if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("[ERROR] getUserById controller:", { params: req.params, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener usuario" });
  }
};

/** GET /users/check-email/:email - Verificar si un email ya existe */
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.params;
    console.log("[INFO] checkEmailExists controller called with email:", email);

    if (!email) {
      console.warn("[WARN] checkEmailExists - missing email");
      return res.status(400).json({ success: false, error: "Email es requerido" });
    }

    // Validar formato de email
    const emailError = Validator.validateEmail(email);
    if (emailError) {
      console.warn("[WARN] checkEmailExists - invalid email format", { email });
      return res.status(400).json({ success: false, error: emailError });
    }

    console.log("[INFO] checkEmailExists - calling model...");
    const exists = await UserModel.checkEmailExists(email);
    console.log("[INFO] checkEmailExists - model returned:", exists);
    
    console.log("[INFO] checkEmailExists - sending response", { email, exists });
    res.json({ success: true, exists });
  } catch (err) {
    console.error("[ERROR] checkEmailExists controller:", { params: req.params, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al verificar email" });
  }
};

/** POST /login */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const requestIp = req.ip || req.socket?.remoteAddress || null;

    // Validar con Validator
    const errors = Validator.validateLoginCredentials({ email, password });
    
    if (!Validator.isValid(errors)) {
      console.warn("[WARN] loginUser - validation error", { errors, email });
      return res.status(400).json({ success: false, error: Object.values(errors).find(e => e !== "") || "Validación fallida" });
    }

    const user = await getUserForLoginCached(normalizedEmail);
    if (!user) {
      const blockedByIp = await isBlacklisted({ ip: requestIp });
      if (blockedByIp) {
        await logSuspiciousActivity({
          userId: null,
          ip: requestIp,
          eventType: 'blacklisted_ip_login_attempt',
          details: { email },
          severity: 'high'
        });
        return res.status(403).json({ success: false, error: 'Acceso bloqueado por seguridad' });
      }

      console.warn("[WARN] loginUser - user not found", { email });
      return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos" });
    }

    const blockedBySubject = await isBlacklisted({ userId: user.id, ip: requestIp });
    if (blockedBySubject) {
      await logSuspiciousActivity({
        userId: user.id,
        ip: requestIp,
        eventType: 'blacklisted_user_login_attempt',
        details: { email },
        severity: 'high'
      });
      return res.status(403).json({ success: false, error: 'Usuario bloqueado por seguridad' });
    }

    // Soporta hashes bcrypt y usuarios legacy con contraseña en texto plano.
    const storedPassword = user.password;
    if (!storedPassword || typeof storedPassword !== "string") {
      console.warn("[WARN] loginUser - invalid stored password", { email, userId: user.id });
      return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos" });
    }

    const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedPassword);
    let validPass = false;

    if (isBcryptHash) {
      console.log("[INFO] Comparing password with bcrypt hash");
      validPass = await comparePasswordCached({ password, storedPassword, userId: user.id });
    } else {
      console.warn("[WARN] loginUser - legacy/plain password detected", { email, userId: user.id });
      validPass = password === storedPassword;
    }

    if (!validPass) {
      console.warn("[WARN] loginUser - invalid password for", { email });
        return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos" });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      state: user.state
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Soporte de transicion: cookies seguras + token en payload para clientes legacy.
    setAuthCookies(res, accessToken, refreshToken);

    // Precalienta lecturas que el frontend suele pedir inmediatamente tras login.
    prewarmUserReadCaches(user.id);

    console.log("[INFO] Login successful for", { email });
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        state: user.state,
        token: accessToken,
      },
    });
  } catch (err) {
    console.error("[ERROR] loginUser controller:", { body: { ...req.body, password: "[REDACTED]" }, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al iniciar sesión" });
  }
};

/** POST /users -> crea user + person reciclador con contraseña temporal */
export const createUser = async (req, res) => {
  try {
    console.log("[INFO] POST /users body:", { ...req.body, password: undefined });
    const { nombres, apellidos, email, phone, role_id } = req.body;

    // Validar campos con Validator
    const errors = Validator.validateUserPerson({ nombres, apellidos, email, phone });
    
    if (!Validator.isValid(errors)) {
      console.warn("[WARN] createUser - validation error", { errors, body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "Validación fallida",
        details: errors 
      });
    }

    // Usa el role_id recibido o por defecto 3 (reciclador)
    const roleId = role_id !== undefined ? Number(role_id) : 3;

    try {
      const result = await UserModel.createWithPersona(
        Validator.normalizeName(nombres),
        Validator.normalizeName(apellidos),
        email.toLowerCase().trim(),
        phone.trim(),
        roleId
      );

      console.log("[INFO] createUser - result from model:", { 
        userId: result.userId, 
        hasPassword: !!result.password 
      });

      res.status(201).json({
        success: true,
        id: result.userId,
        personId: result.personId,
      });

      if (result.password) {
        console.log("[INFO] Sending credentials email with generated password");
        await sendCredentialsEmail(email, nombres, apellidos, email, result.password);
      } else {
        console.warn("[WARN] No password generated by model, cannot send email");
      }

    } catch (err) {
      console.error("[ERROR] createUser model error:", {
        body: req.body,
        message: err.message,
        code: err.code || null,
        stack: err.stack,
      });
      if (err.code === "ER_ROLE_NOT_FOUND" || err.code === "ER_NO_ROLES") {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (err && err.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
          success: false,
          error: "Violación de FK al crear usuario (verifica role/foreign keys)",
          detail: err.sqlMessage || err.message,
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("[ERROR] createUser controller unexpected:", { body: req.body, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al registrar usuario", detail: err.message });
  }
};


/** POST /users/collector -> crea user con state = 3 + persona de recolector con state = 0 */
export const createCollectorUser = async (req, res) => {
  try {
    const { nombres, apellidos, email, phone } = req.body;

    // Validar campos con Validator
    const errors = Validator.validateUserPerson({ nombres, apellidos, email, phone });
    
    if (!Validator.isValid(errors)) {
      console.warn("[WARN] createCollectorUser - validation error", { errors, body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "Validación fallida",
        details: errors 
      });
    }

    // role_id fijo para recolector
    const roleId = 2; // rol 2 = recolector
    const state = 3; // pendiente de aprobación

    const result = await UserModel.createCollectorWithPersona(
      Validator.normalizeName(nombres),
      Validator.normalizeName(apellidos),
      email.toLowerCase().trim(),
      phone.trim(),
      roleId,
      state
    );

    res.status(201).json({
      success: true,
      message: "Registro de recolector creado con estado pendiente. Espera aprobación del administrador.",
      id: result.userId,
      personId: result.personId,
    });

  } catch (err) {
    console.error("[ERROR] createCollectorUser:", {
      body: req.body,
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      success: false,
      error: "Error al registrar usuario recolector",
      detail: err.message,
    });
  }
};



/** PUT /users/:id */
export const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombres, apellidos, username, email, phone, role_id, state } = req.body;
    const roleIdParsed = role_id !== undefined ? Number(role_id) : undefined;

    const updated = await UserModel.updateWithPersona(
      id,
      nombres,
      apellidos,
      username,
      email,
      phone,
      roleIdParsed,
      state
    );

    if (!updated) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] updateUser controller:", { params: req.params, body: req.body, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al actualizar usuario" });
  }
};

/** PUT /users/:id/role - Actualizar solo el rol del usuario */
export const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { roleId } = req.body;

    // Validar que se envió el roleId
    if (!roleId) {
      console.warn("[WARN] updateUserRole - missing roleId", { userId });
      return res.status(400).json({ success: false, error: "El roleId es requerido" });
    }

    // Validar que roleId sea un número válido
    const roleIdParsed = Number(roleId);
    if (isNaN(roleIdParsed) || roleIdParsed < 1) {
      console.warn("[WARN] updateUserRole - invalid roleId", { userId, roleId });
      return res.status(400).json({ success: false, error: "El roleId debe ser un número válido" });
    }

    // Actualizar el rol
    const updated = await UserModel.updateUserRole(userId, roleIdParsed);

    if (!updated) {
      console.warn("[WARN] updateUserRole - user not found", { userId });
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    console.log("[INFO] updateUserRole - success", { userId, roleId: roleIdParsed });
    res.json({ success: true, message: "Rol actualizado correctamente" });
  } catch (err) {
    console.error("[ERROR] updateUserRole controller:", { 
      params: req.params, 
      body: req.body, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ success: false, error: "Error al actualizar el rol del usuario" });
  }
};

/** DELETE /users/:id */
export const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await UserModel.softDeleteWithPersona(id);
    if (!deleted) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] deleteUser controller:", { params: req.params, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al eliminar usuario" });
  }
};

/** PUT /users/changePassword/:userId */
export const changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, error: "La contraseña es requerida" });

    const user = await UserModel.getById(userId);
    if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const updated = await UserModel.updatePasswordAndState(userId, hashedPassword);
    if (!updated) return res.status(500).json({ success: false, error: "No se pudo actualizar la contraseña" });

    res.json({ success: true, message: "Contraseña cambiada correctamente" });
  } catch (err) {
    console.error("[ERROR] changePassword controller:", { params: req.params, message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al cambiar la contraseña" });
  }
};


//Insitution User Model

/** POST /users/institution -> crea user + institution (pendiente, CON contraseña temporal) */
export const createUserWithInstitution = async (req, res) => {
  try {
    const { companyName, nit, email, phone, role_id } = req.body;
    
    // Validar campos con Validator
    const errors = Validator.validateUserInstitution({ companyName, nit, email, phone });
    
    if (!Validator.isValid(errors)) {
      console.warn("[WARN] createUserWithInstitution - validation error", { errors, body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "Validación fallida",
        details: errors 
      });
    }

    const roleIdParsed = role_id !== undefined ? Number(role_id) : 2; // default: recolector

    // El modelo genera y guarda una contraseña temporal para cumplir con NOT NULL
    const result = await UserModel.createWithInstitution(
      Validator.capitalizeWords(companyName),
      nit.trim().toUpperCase(),
      email.toLowerCase().trim(),
      phone.trim(),
      roleIdParsed,
      3 // state pendiente
    );

    console.log("[INFO] createUserWithInstitution - user created with temp password (email will be sent on approval)", { userId: result.userId });

    // NO enviar correo aquí - se enviará cuando el admin apruebe

    res.status(201).json({
      success: true,
      id: result.userId,
      institutionId: result.institutionId,
      state: 3, // pendiente
      message: "Institución registrada. Espera la aprobación del administrador para recibir tus credenciales."
    });

  } catch (err) {
    console.error("[ERROR] createUserWithInstitution:", { body: req.body, message: err.message });
    res.status(500).json({ success: false, error: "Error al registrar usuario con institución" });
  }
};

/** POST /users/institution-admin -> crea user + institution aprobado por admin con contraseña */
export const createUserWithInstitutionByAdmin = async (req, res) => {
  try {
    const { companyName, nit, email, phone, role_id } = req.body;
    
    // Validar campos con Validator
    const errors = Validator.validateUserInstitution({ companyName, nit, email, phone });
    
    if (!Validator.isValid(errors)) {
      console.warn("[WARN] createUserWithInstitutionByAdmin - validation error", { errors, body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "Validación fallida",
        details: errors 
      });
    }

    const roleIdParsed = role_id !== undefined ? Number(role_id) : 2; // default: recolector

    // Crear con estado 1 (aprobado directamente por admin)
    const result = await UserModel.createWithInstitution(
      Validator.capitalizeWords(companyName),
      nit.trim().toUpperCase(),
      email.toLowerCase().trim(),
      phone.trim(),
      roleIdParsed,
      1 // state aprobado
    );

    console.log("[INFO] createUserWithInstitutionByAdmin - institution created and approved", { userId: result.userId });

    // Enviar correo con credenciales
    try {
      await sendCredentialsEmail(email, companyName, '', email, result.tempPassword);
      console.log("[INFO] createUserWithInstitutionByAdmin - credentials email sent", { email });
    } catch (emailErr) {
      console.error("[ERROR] createUserWithInstitutionByAdmin - failed to send email:", emailErr.message);
    }

    res.status(201).json({
      success: true,
      id: result.userId,
      institutionId: result.institutionId,
      message: "Institución creada y aprobada. Se envió correo con credenciales."
    });

  } catch (err) {
    console.error("[ERROR] createUserWithInstitutionByAdmin:", { body: req.body, message: err.message });
    res.status(500).json({ success: false, error: "Error al crear institución" });
  }
};

/** PUT /users/institution/:id */
export const updateUserWithInstitution = async (req, res) => {
  try {
    const id = req.params.id;
    const { companyName, nit, username, email, phone, role_id, state } = req.body;

    const updated = await UserModel.updateWithInstitution(
      id,
      companyName,
      nit,
      username,
      email,
      phone,
      role_id,
      state
    );

    if (!updated) return res.status(404).json({ success: false, error: "Usuario/Institución no encontrado" });
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] updateUserWithInstitution:", { message: err.message });
    res.status(500).json({ success: false, error: "Error al actualizar usuario con institución" });
  }
};

/** DELETE /users/institution/:id */
export const deleteUserWithInstitution = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await UserModel.softDeleteWithInstitution(id);
    if (!deleted) return res.status(404).json({ success: false, error: "Usuario/Institución no encontrado" });
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] deleteUserWithInstitution:", { message: err.message });
    res.status(500).json({ success: false, error: "Error al eliminar usuario con institución" });
  }
};


/** GET /users/withInstitution */
export const getUsersWithInstitution = async (req, res) => {
  try {
    const users = await UserModel.getAllWithInstitution();
    console.log("[INFO] getUsersWithInstitution - SUCCESS", { count: users.length, users });
    res.json({ success: true, users });
  } catch (err) {
    console.error("[ERROR] getUsersWithInstitution:", { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener usuarios con institución" });
  }
};

/** GET /users/collectors/pending/institution */
export const getCollectorsPendingWithInstitution = async (req, res) => {
  try {
    const collectors = await UserModel.getCollectorsPendingWithInstitution();
    res.json({ success: true, collectors });
  } catch (err) {
    console.error("[ERROR] getCollectorsPendingWithInstitution controller:", { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: "Error al obtener solicitudes de recolectores institucionales pendientes" });
  }
};

/** GET /users/withInstitution/:id */
export const getUserWithInstitutionById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await UserModel.getInstitutionById(id);
    if (!user) return res.status(404).json({ success: false, error: "Usuario/Institución no encontrado" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("[ERROR] getUserWithInstitutionById:", { id, message: err.message });
    res.status(500).json({ success: false, error: "Error al obtener usuario con institución" });
  }
};

/** POST /users/registerCollector */
export const registerCollector = async (req, res) => {
  try {
    // Registro de institución
    if (req.body.companyName && req.body.nit) {
      if (!req.body.companyName || !req.body.nit || !req.body.email || !req.body.phone) {
        return res.status(400).json({
          success: false,
          error: "Campos requeridos: companyName, nit, email, phone",
        });
      }
      // Crear usuario
      const user = await UserModel.create({
        email: req.body.email,
        phone: req.body.phone,
        role_id: 3,
        state: 0,
      });
      // Crear institución
      const institution = await InstitutionModel.create({
        companyName: req.body.companyName,
        nit: req.body.nit,
        userId: user.id,
        state: 0,
      });
      return res.status(201).json({ success: true, userId: user.id, institutionId: institution.id });
    }

    // Registro de persona
    if (req.body.nombres && req.body.apellidos) {
      if (!req.body.nombres || !req.body.apellidos || !req.body.email || !req.body.phone) {
        return res.status(400).json({
          success: false,
          error: "Campos requeridos: nombres, apellidos, email, phone",
        });
      }
      const user = await UserModel.create({
        nombres: req.body.nombres,
        apellidos: req.body.apellidos,
        email: req.body.email,
        phone: req.body.phone,
        role_id: 2,
        state: 0,
      });
      
      return res.status(201).json({ success: true, userId: user.id });
    }

    // Si no es ninguno de los dos
    return res.status(400).json({
      success: false,
      error: "Datos insuficientes para registrar persona o institución",
    });
  } catch (err) {
    console.error("[ERROR] registerCollector:", err);
    return res.status(500).json({ success: false, error: "Error en el registro" });
  }
};

/** POST /users/forgotPassword */
//Recuperacion de contraseña
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      console.warn("[WARN] forgotPassword - missing email", { body: req.body });
      return res.status(400).json({ 
        success: false, 
        error: "El correo electrónico es requerido" 
      });
    }

    // Validar formato de email
    if (typeof email !== "string" || !email.includes("@")) {
      console.warn("[WARN] forgotPassword - invalid email", { email });
      return res.status(400).json({ 
        success: false, 
        error: "Email inválido" 
      });
    }

    // Buscar usuario por email
    const user = await UserModel.loginUser(email);
    
    if (!user) {
      console.warn("[WARN] forgotPassword - user not found", { email });
      
      return res.status(200).json({ 
        success: true, 
        message: "Si el correo existe, recibirás instrucciones para recuperar tu contraseña" 
      });
    }

  
    // Generar nueva contraseña temporal usando el ID del usuario
    const result = await UserModel.resetPasswordWithTemp(user.id);

    console.log("[INFO] forgotPassword - password reset successful", { 
      email, 
      userId: user.id 
    });

    // Enviar email con la contraseña temporal
    try {
     
      const userDetails = await UserModel.getByIdWithPersona(user.id);
      
      await sendCredentialsEmail(
        email,
        userDetails?.firstname || "Usuario",
        userDetails?.lastname || "",
        email,
        result.tempPassword,
        1 // emailType = 1 => mensaje de restablecimiento
      );
      console.log("[INFO] forgotPassword - email sent successfully to", { email });
    } catch (emailErr) {
      console.error("[ERROR] forgotPassword - failed to send email:", {
        email,
        message: emailErr.message
      });
     
    }
   // Respuesta exitosa
    res.json({ 
      success: true, 
      message: "Se ha enviado una contraseña temporal a tu correo electrónico" 
    });

  } catch (err) {
    console.error("[ERROR] forgotPassword controller:", { 
      body: req.body, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ 
      success: false, 
      error: "Error al procesar la solicitud de recuperación" 
    });
  }
};

/** POST /users/reject/:id - Rechazar usuario persona con envío de email */
export const rejectUser = async (req, res) => {
  const startTime = Date.now();
  try {
    const id = req.params.id;
    console.log("[INFO] rejectUser - start", { userId: id, timestamp: new Date().toISOString() });
    
    // Rechazar usuario y obtener datos
    const modelStartTime = Date.now();
    const userData = await UserModel.rejectUserWithPersona(id);
    console.log(`[TIMING] rejectUserWithPersona tomó: ${Date.now() - modelStartTime}ms`);
    
    if (!userData) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    // Enviar email de rechazo si tiene datos completos - NO BLOQUEANTE
    if (userData.firstname && userData.lastname && userData.email) {
      try {
        const emailStartTime = Date.now();
        sendRejectionEmail(
          userData.email, 
          userData.firstname, 
          userData.lastname, 
          'persona'
        ).then(() => {
          console.log(`[TIMING] Email de rechazo enviado en: ${Date.now() - emailStartTime}ms`);
          console.log(`✅ Email de rechazo enviado a ${userData.email}`);
        }).catch(emailError => {
          console.error("⚠️ No se pudo enviar el email de rechazo:", emailError.message);
        });
      } catch (emailError) {
        console.error("⚠️ Error al iniciar envío de email de rechazo:", emailError.message);
        // Continuar aunque falle el email
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] rejectUser - tiempo total: ${totalTime}ms`);
    
    res.json({ 
      success: true, 
      message: "Usuario rechazado exitosamente" 
    });
  } catch (err) {
    console.error("[ERROR] rejectUser controller:", { 
      params: req.params, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ 
      success: false, 
      error: "Error al rechazar usuario" 
    });
  }
};

/** POST /users/institution/reject/:id - Rechazar usuario institución con envío de email */
export const rejectInstitution = async (req, res) => {
  const startTime = Date.now();
  try {
    const id = req.params.id;
    console.log("[INFO] rejectInstitution - start", { userId: id, timestamp: new Date().toISOString() });
    
    // Rechazar institución y obtener datos
    const modelStartTime = Date.now();
    const userData = await UserModel.rejectUserWithInstitution(id);
    console.log(`[TIMING] rejectUserWithInstitution tomó: ${Date.now() - modelStartTime}ms`);
    
    if (!userData) {
      return res.status(404).json({ success: false, error: "Institución no encontrada" });
    }
    
    // Enviar email de rechazo si tiene datos completos - NO BLOQUEANTE
    if (userData.companyName && userData.email) {
      try {
        const emailStartTime = Date.now();
        sendRejectionEmail(
          userData.email, 
          userData.companyName, 
          '', 
          'institucion'
        ).then(() => {
          console.log(`[TIMING] Email de rechazo enviado en: ${Date.now() - emailStartTime}ms`);
          console.log(`✅ Email de rechazo enviado a ${userData.email}`);
        }).catch(emailError => {
          console.error("⚠️ No se pudo enviar el email de rechazo:", emailError.message);
        });
      } catch (emailError) {
        console.error("⚠️ Error al iniciar envío de email de rechazo:", emailError.message);
        // Continuar aunque falle el email
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] rejectInstitution - tiempo total: ${totalTime}ms`);
    
    res.json({ 
      success: true, 
      message: "Institución rechazada exitosamente" 
    });
  } catch (err) {
    console.error("[ERROR] rejectInstitution controller:", { 
      params: req.params, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ 
      success: false, 
      error: "Error al rechazar institución" 
    });
  }
};

/** POST /users/approve/:id - Aprobar usuario persona con generación de contraseña y envío de email */
export const approveUser = async (req, res) => {
  const startTime = Date.now();
  try {
    const id = req.params.id;
    console.log("[INFO] approveUser - start", { userId: id, timestamp: new Date().toISOString() });
    
    // Aprobar usuario, generar contraseña y obtener datos
    const modelStartTime = Date.now();
    const userData = await UserModel.approveUserWithPersona(id);
    console.log(`[TIMING] approveUserWithPersona tomó: ${Date.now() - modelStartTime}ms`);
    
    if (!userData) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    // Enviar email con credenciales si tiene datos completos - NO BLOQUEANTE
    if (userData.firstname && userData.lastname && userData.email && userData.tempPassword) {
      try {
        const emailStartTime = Date.now();
        sendCredentialsEmail(
          userData.email,          
          userData.firstname,      
          userData.lastname,       
          userData.email,          
          userData.tempPassword    
        ).then(() => {
          console.log(`[TIMING] Email enviado exitosamente en: ${Date.now() - emailStartTime}ms`);
          console.log(`✅ Email de credenciales enviado a ${userData.email}`);
        }).catch(emailError => {
          console.error("⚠️ No se pudo enviar el email de credenciales:", emailError.message);
        });
      } catch (emailError) {
        console.error("⚠️ Error al iniciar envío de email:", emailError.message);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] approveUser - tiempo total: ${totalTime}ms`);
    
    res.json({ 
      success: true, 
      message: "Usuario aprobado exitosamente y credenciales enviadas" 
    });
  } catch (err) {
    console.error("[ERROR] approveUser controller:", { 
      params: req.params, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ 
      success: false, 
      error: "Error al aprobar usuario" 
    });
  }
};

/** POST /users/institution/approve/:id - Aprobar usuario institución y enviar credenciales */
export const approveInstitution = async (req, res) => {
  const startTime = Date.now();
  try {
    const id = req.params.id;
    console.log("[INFO] approveInstitution - start", { userId: id, timestamp: new Date().toISOString() });
    console.log("[DEBUG] approveInstitution - función llamada desde:", new Error().stack);
    
    // Aprobar institución y generar NUEVA contraseña temporal
    const modelStartTime = Date.now();
    const userData = await UserModel.approveUserWithInstitution(id);
    console.log(`[TIMING] approveUserWithInstitution tomó: ${Date.now() - modelStartTime}ms`);
    
    console.log("[DEBUG] approveInstitution - userData recibido:", {
      email: userData?.email,
      companyName: userData?.companyName,
      hasTempPassword: !!userData?.tempPassword,
      tempPasswordLength: userData?.tempPassword?.length
    });
    
    if (!userData) {
      return res.status(404).json({ success: false, error: "Institución no encontrada" });
    }
    
    // Enviar email con las credenciales (AHORA sí se envía)
    if (userData.companyName && userData.email && userData.tempPassword) {
      try {
        console.log("[INFO] approveInstitution - enviando email de credenciales a:", userData.email);
        const emailStartTime = Date.now();
        
        // Enviar email de forma NO bloqueante (no esperar a que termine)
        sendCredentialsEmail(
          userData.email,           // to: email destino
          userData.companyName,     // nombre (companyName para instituciones)
          '',                       // apellidos (vacío para instituciones)
          userData.email,           // username: el email es el usuario
          userData.tempPassword     // password: contraseña temporal NUEVA
        ).then(() => {
          console.log(`[TIMING] Email enviado exitosamente en: ${Date.now() - emailStartTime}ms`);
          console.log(`✅ Email de credenciales enviado a ${userData.email}`);
        }).catch(emailError => {
          console.error("⚠️ No se pudo enviar el email de credenciales:", emailError.message);
        });
        
        // Responder inmediatamente sin esperar el email (mejora UX)
        console.log(`[TIMING] Respuesta enviada al cliente en: ${Date.now() - startTime}ms (antes de esperar email)`);
        
      } catch (emailError) {
        console.error("⚠️ Error al iniciar envío de email:", emailError.message);
        // Continuar aunque falle el email
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] approveInstitution - tiempo total: ${totalTime}ms`);
    
    res.json({ 
      success: true, 
      message: "Institución aprobada exitosamente y credenciales enviadas por correo" 
    });
  } catch (err) {
    console.error("[ERROR] approveInstitution controller:", { 
      params: req.params, 
      message: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ 
      success: false, 
      error: "Error al aprobar institución" 
    });
  }
};

/** POST /users/refresh-token */
export const refreshToken = async (req, res) => {
  try {
    const refreshTokenCookie = getRefreshTokenFromRequest(req);

    if (!refreshTokenCookie) {
      return res.status(401).json({ success: false, error: 'Refresh token no encontrado' });
    }

    const payload = verifyRefreshToken(refreshTokenCookie);
    const tokenPayload = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      roleId: payload.roleId,
      state: payload.state
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.json({
      success: true,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId,
        state: payload.state,
        token: newAccessToken
      }
    });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, error: 'Refresh token inválido o expirado' });
  }
};

/** POST /users/logout */
export const logoutUser = async (req, res) => {
  clearAuthCookies(res);
  return res.json({ success: true, message: 'Sesión cerrada' });
};