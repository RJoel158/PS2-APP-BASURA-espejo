import React from "react";
import "./UserInfo.css";
import logoText from "../../assets/logoText.svg";

const HeaderUserInfo: React.FC = () => {
  return (
    <header className="user-info-header">
      <div className="user-info-header-logo">
        <img src={logoText} alt="Logo GreenBit" className="user-info-header-logo-img" />
      </div>

      <h1 className="user-info-header-title">
        Información de usuario
      </h1>

      <div className="user-info-header-spacer"></div>
    </header>
  );
};

export default HeaderUserInfo;
