import React from "react";
import "./UserInfo.css";
import logoText from "../../assets/logoText.svg";

const HeaderUserInfo: React.FC = () => {
  return (
    <header className="header d-flex align-items-center justify-content-between">
      <div className="header-logo-container">
        <img src={logoText} alt="Logo GreenBit" className="logo-img" />
      </div>

      <h1 className="header-title text-center flex-grow-1 fw-bold">
        Información de usuario
      </h1>

      <div className="header-spacer"></div>
    </header>
  );
};

export default HeaderUserInfo;
