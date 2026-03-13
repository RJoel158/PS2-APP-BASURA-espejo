import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ChangePasswordModal.css";
import { Validator } from "../../common/Validator";
import SuccessModal from "../CommonComp/SuccesModal";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../config/endpoints";

interface ChangePasswordModalProps {
  userId: number;
  role: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ userId, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; repeatPassword?: string }>({});
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const redirectUrl = useMemo(() => {
    const normalizedRole = (role || "").toLowerCase();
    if (normalizedRole === "admin" || normalizedRole === "administrador") return "/adminDashboard";
    if (normalizedRole === "reciclador") return "/recicladorIndex";
    if (normalizedRole === "recolector") return "/recolectorIndex";

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const roleId = Number(user?.roleId);
        if (roleId === 1) return "/adminDashboard";
        if (roleId === 3) return "/recicladorIndex";
        if (roleId === 2) return "/recolectorIndex";
      } catch {
        // Si falla el parseo, usar fallback por defecto.
      }
    }

    return "/recolectorIndex";
  }, [role]);

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);

    // Si ya estamos en la ruta destino, cerrar el modal es suficiente.
    if (location.pathname === redirectUrl) {
      return;
    }

    navigate(redirectUrl, { replace: true });
  };

  const handleConfirm = async () => {

    const passwordError = Validator.validatePassword(password);
    const repeatPasswordError = password !== repeatPassword ? "Las contraseñas no coinciden" : "";

    const validationErrors = { password: passwordError, repeatPassword: repeatPasswordError };
    setErrors(validationErrors);

    if (!Validator.isValid(validationErrors)) return;

    try {
      const res = await api.put(API_ENDPOINTS.USERS.CHANGE_PASSWORD(userId), { 
        password 
      });

      const data = res.data;
      if (!data.success) throw new Error(data.error || "Error al cambiar la contraseña");

      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        u.state = 2; // indica que ya cambió la contraseña
        localStorage.setItem("user", JSON.stringify(u));
      }
      setIsChangePasswordOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Error al cambiar la contraseña:", err);
      setErrorModalMessage("No se pudo cambiar la contraseña: " + err.message);
      setShowErrorModal(true);
    }
  };

  return (
    <>
      {isChangePasswordOpen && (
        <div className="password-modal-overlay d-flex justify-content-center align-items-center">
          <div className="password-modal-box text-center shadow">
            <h2 className="mb-2">¡Bienvenid@!</h2>
            <h4 className="mb-4">Como último paso, personaliza tu contraseña.</h4>

            <div className="text-start mb-3">
              <label className="form-label">Establece una contraseña:</label>
              <input
                type="password"
                placeholder="***********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-control custom-input ${errors.password ? "is-invalid" : ""}`}
              />
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>

            <div className="text-start mb-4">
              <label className="form-label">Confirma la contraseña:</label>
              <input
                type="password"
                placeholder="***********"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className={`form-control custom-input ${errors.repeatPassword ? "is-invalid" : ""}`}
              />
              {errors.repeatPassword && <div className="invalid-feedback">{errors.repeatPassword}</div>}
            </div>

            <div className="d-flex justify-content-center">
              <button className="btn custom-btn" onClick={handleConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuccessModalOpen && (
        <SuccessModal
          title="¡Contraseña actualizada!"
          message="Tu contraseña ha sido cambiada exitosamente."
          redirectUrl={redirectUrl}
          onClose={handleSuccessClose}
        />
      )}

      {showErrorModal && (
        <SuccessModal
          title="❌ Error"
          message={errorModalMessage}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </>
  );
};

export default ChangePasswordModal;
