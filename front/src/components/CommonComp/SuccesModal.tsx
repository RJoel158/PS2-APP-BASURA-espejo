import React from "react";
import { useNavigate } from "react-router-dom";
import "./SuccessModal.css"
import emailLogo from "../../assets/icons/email-logo.svg";

interface SuccessModalProps {
  title: string;
  message: string;
  redirectUrl?: string; // Ahora opcional
  onClose?: () => void; // Callback opcional para cerrar sin redireccionar
}

const SuccessModal: React.FC<SuccessModalProps> = ({ title, message, redirectUrl, onClose }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClose) {
      onClose(); // Si hay callback, usarlo
    } else if (redirectUrl) {
      navigate(redirectUrl); // Si no, usar redirect
    }
  };

  return (
    <div className="success-modal-overlay d-flex justify-content-center align-items-center">
      <div className="success-modal-box p-4 text-center">
        <img src={emailLogo} alt="Email" className="success-modal-icon mb-3" />
        <h2 className="mb-2">{title}</h2>
        <h3 className="mb-3">{message}</h3>
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="success-modal-button"
            onClick={handleClick}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

