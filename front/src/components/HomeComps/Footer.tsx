import GreenBitLogo from '../../assets/GreenBit.svg';
import './Footer.css';

export default function Footer(){
  return (
    <footer className="footer-greenbit">
      <div className="footer-content">
        <div className="footer-logo">
          <img src={GreenBitLogo} alt="GreenBit" />
        </div>
        <div className="footer-text">© {new Date().getFullYear()} GreenBit-Reciclaje inteligente</div>
      </div>
    </footer>
  );
}
