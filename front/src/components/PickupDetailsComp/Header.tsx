import React from 'react';
import logoText from '../../assets/logoText.svg';
import './PickupDetails.css';

const Header: React.FC = () => {
  return (
    <header className="pickupdetail-header">
      <div className="pickupdetail-logo-container">
        <img src={logoText} alt="Logo GreenBit" className="pickupdetail-logo-img" />
      </div>

      <h1 className="pickupdetail-header-title">
        Detalles del Recojo
      </h1>

      <div className="pickupdetail-spacer"></div>
    </header>
  );
};

export default Header;