import React, { useState } from "react";
import "../Auth/Register.css";
import inicioImage from "../assets/inicio.png";
import logo from "../assets/logo.png";
import cardBg from "../assets/SideBarImg.png";
import { Validator } from "../common/Validator";
import SuccessModal from "../components/CommonComp/SuccesModal";
import api from "../services/api";
import { API_ENDPOINTS } from "../config/endpoints";
import CountryPhoneSelector from "../components/Auth/CountryPhoneSelector";

// ─── Tipos ───
type Role = "reciclador" | "recolector";
type AccountType = "persona" | "institucion";

type FormData = {
  nombres: string;
  apellidos: string;
  companyName: string;
  nit: string;
  email: string;
  phone: string;
};

const emptyForm: FormData = {
  nombres: "",
  apellidos: "",
  companyName: "",
  nit: "",
  email: "",
  phone: "+591 ",
};

// ─── Config por combinación ───
const COMBO_CONFIG: Record<string, {
  endpoint: string;
  buildPayload: (form: FormData) => Record<string, unknown>;
  successTitle: string;
  successMessage: string;
}> = {
  "reciclador-persona": {
    endpoint: API_ENDPOINTS.USERS.REGISTER,
    buildPayload: (f) => ({
      nombres: Validator.normalizeName(f.nombres),
      apellidos: Validator.normalizeName(f.apellidos),
      email: f.email.trim().toLowerCase(),
      phone: f.phone,
      role_id: 3,
    }),
    successTitle: "¡Ya estás registrado!",
    successMessage: "Revisa tu correo electrónico. Enviaremos tus credenciales.",
  },
  "recolector-persona": {
    endpoint: API_ENDPOINTS.USERS.REGISTER_COLLECTOR,
    buildPayload: (f) => ({
      nombres: Validator.normalizeName(f.nombres),
      apellidos: Validator.normalizeName(f.apellidos),
      email: f.email.trim().toLowerCase(),
      phone: f.phone,
      role_id: 2,
    }),
    successTitle: "¡Solicitud de cuenta enviada!",
    successMessage: "Tu solicitud para ser recolector ha sido enviada exitosamente. Nos pondremos en contacto contigo pronto.",
  },
  "recolector-institucion": {
    endpoint: API_ENDPOINTS.USERS.REGISTER_INSTITUTION,
    buildPayload: (f) => ({
      companyName: Validator.normalizeName(f.companyName),
      nit: f.nit.trim().toUpperCase(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone,
      role_id: 2,
    }),
    successTitle: "¡Solicitud enviada!",
    successMessage: "Se le enviará el correo con sus credenciales una vez su cuenta haya sido aprobada.",
  },
};

const Register: React.FC = () => {
  const [role, setRole] = useState<Role>("reciclador");
  const [accountType, setAccountType] = useState<AccountType>("persona");
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ title: "", message: "" });

  // Mostrar institución solo para recolector
  const showAccountType = role === "recolector";
  const isInstitution = role === "recolector" && accountType === "institucion";
  const configKey = isInstitution ? "recolector-institucion" : `${role}-persona`;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const onRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    setRole(newRole);
    if (newRole === "reciclador") setAccountType("persona");
    setForm({ ...emptyForm });
    setErrors({});
    setMensaje("");
  };

  const onAccountTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAccountType(e.target.value as AccountType);
    setForm({ ...emptyForm });
    setErrors({});
    setMensaje("");
  };

  const checkEmailExists = async (email: string) => {
    if (!email || Validator.validateEmail(email)) return;
    setCheckingEmail(true);
    try {
      const res = await api.get(API_ENDPOINTS.USERS.CHECK_EMAIL(email.trim().toLowerCase()));
      if (res.data.success && res.data.exists) {
        setErrors((prev) => ({ ...prev, email: "Este correo electrónico ya está registrado" }));
      }
    } catch (err) {
      console.error("Error al verificar email:", err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const onEmailBlur = () => {
    if (form.email && !Validator.validateEmail(form.email)) checkEmailExists(form.email);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar según tipo de cuenta
    const validationErrors: Partial<Record<keyof FormData, string>> = {};

    if (isInstitution) {
      validationErrors.companyName = Validator.validateCompanyName?.(form.companyName) || "";
      validationErrors.nit = Validator.validateNIT?.(form.nit) || "";
    } else {
      validationErrors.nombres = Validator.validatenames?.(form.nombres) || "";
      validationErrors.apellidos = Validator.validatenames?.(form.apellidos) || "";
    }
    validationErrors.email = Validator.validateEmail(form.email) || "";
    validationErrors.phone = Validator.validatePhone(form.phone) || "";

    setErrors(validationErrors);
    if (!Validator.isValid(validationErrors)) {
      setMensaje("❌ Por favor corrige los errores en el formulario");
      return;
    }

    setLoading(true);
    try {
      const emailCheck = await api.get(API_ENDPOINTS.USERS.CHECK_EMAIL(form.email.trim().toLowerCase()));
      if (emailCheck.data.exists) {
        setErrors((prev) => ({ ...prev, email: "Este correo electrónico ya está registrado" }));
        setMensaje("❌ El correo electrónico ya está registrado");
        setLoading(false);
        return;
      }
    } catch {
      setMensaje("❌ No se pudo verificar el correo electrónico");
      setLoading(false);
      return;
    }

    setMensaje("");
    const config = COMBO_CONFIG[configKey];

    try {
      const res = await api.post(config.endpoint, config.buildPayload(form));
      if (res.data.success) {
        setMensaje("✅ Registro exitoso.");
        setForm({ ...emptyForm });
        setErrors({});
        setSuccessConfig({ title: config.successTitle, message: config.successMessage });
        setShowSuccessModal(true);
      } else {
        setMensaje("❌ " + (res.data.error || "Error desconocido"));
      }
    } catch {
      setMensaje("❌ No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page d-flex align-items-stretch">
      <div
        className="register-left p-4"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.15)), url(${cardBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          color: "#fff",
        }}
      >
        <div className="auth-card shadow-lg p-4 rounded-4" id="registerPage">
          <div className="text-center mb-4">
            <h1 className="auth-title mb-2">Crea tu cuenta</h1>
            <img src={logo} alt="Logo GreenBit" className="register-logo" />
          </div>

          <form onSubmit={onSubmit} className="auth-form">
            {/* ── Rol ── */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: "#333", fontSize: ".9rem" }}>Rol</label>
              <select
                className="form-select form-select-lg"
                value={role}
                onChange={onRoleChange}
              >
                <option value="reciclador">Reciclador</option>
                <option value="recolector">Recolector</option>
              </select>
            </div>

            {/* ── Tipo de cuenta (solo recolector) ── */}
            {showAccountType && (
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "#333", fontSize: ".9rem" }}>Tipo de cuenta</label>
                <select
                  className="form-select form-select-lg"
                  value={accountType}
                  onChange={onAccountTypeChange}
                >
                  <option value="persona">Persona</option>
                  <option value="institucion">Institución</option>
                </select>
              </div>
            )}

            {/* ── Campos dinámicos ── */}
            {isInstitution ? (
              <>
                <div className="mb-3">
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={onChange}
                    type="text"
                    className={`form-control form-control-lg ${errors.companyName ? "is-invalid" : ""}`}
                    placeholder="Razón Social"
                  />
                  {errors.companyName && <div className="invalid-feedback">{errors.companyName}</div>}
                </div>
                <div className="mb-3">
                  <input
                    name="nit"
                    value={form.nit}
                    onChange={onChange}
                    type="text"
                    className={`form-control form-control-lg ${errors.nit ? "is-invalid" : ""}`}
                    placeholder="NIT"
                  />
                  {errors.nit && <div className="invalid-feedback">{errors.nit}</div>}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <input
                    name="nombres"
                    value={form.nombres}
                    onChange={onChange}
                    type="text"
                    className={`form-control form-control-lg ${errors.nombres ? "is-invalid" : ""}`}
                    placeholder="Nombres"
                  />
                  {errors.nombres && <div className="invalid-feedback">{errors.nombres}</div>}
                </div>
                <div className="mb-3">
                  <input
                    name="apellidos"
                    value={form.apellidos}
                    onChange={onChange}
                    type="text"
                    className={`form-control form-control-lg ${errors.apellidos ? "is-invalid" : ""}`}
                    placeholder="Apellidos"
                  />
                  {errors.apellidos && <div className="invalid-feedback">{errors.apellidos}</div>}
                </div>
              </>
            )}

            {/* ── Email ── */}
            <div className="mb-3">
              <input
                name="email"
                value={form.email}
                onChange={onChange}
                onBlur={onEmailBlur}
                type="email"
                className={`form-control form-control-lg ${errors.email ? "is-invalid" : ""}`}
                placeholder="Correo electrónico"
              />
              {checkingEmail && <small className="text-muted">Verificando correo...</small>}
              {errors.email && <div className="invalid-feedback" style={{ display: "block" }}>{errors.email}</div>}
            </div>

            {/* ── Teléfono ── */}
            <div className="mb-3">
              <CountryPhoneSelector
                phone={form.phone}
                onPhoneChange={(newPhone) => setForm((f) => ({ ...f, phone: newPhone }))}
                error={errors.phone}
              />
            </div>

            <button type="submit" className="btn btn-success btn-lg w-100" disabled={loading}>
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </form>

          {mensaje && (
            <div className={`alert mt-3 ${mensaje.includes("✅") ? "alert-success" : "alert-danger"}`} role="alert">
              {mensaje}
            </div>
          )}

          <div className="text-center mt-3 mb-3">
            <p style={{ fontSize: "0.95rem", color: "#666", marginBottom: "8px" }}>
              ¿Ya tienes una cuenta?
            </p>
            <a href="/login" className="btn btn-outline-success w-100" style={{ borderWidth: "2px", borderRadius: "12px", padding: "0.7rem", fontWeight: "600", fontSize: "0.95rem" }}>
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>

      <div
        className="register-right d-none d-lg-block flex-grow-1"
        style={{ backgroundImage: `url(${inicioImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />

      {showSuccessModal && (
        <SuccessModal
          title={successConfig.title}
          message={successConfig.message}
          redirectUrl="/login"
        />
      )}
    </div>
  );
};

export default Register;
