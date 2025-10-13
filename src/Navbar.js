import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import AuthContext from './context/AuthContext';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { token, logout } = useContext(AuthContext);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  }

  return (
    <nav className="navbar">
      <div className="navbar-title">
        <Link to="/" onClick={closeMenu}>
          <img src="//nodetree.cafe24.com/%B5%F0%C1%F6%C5%D0%B5%B5%C8%AD%BC%AD/logo/logo2.png" alt="logo" className="navbar-logo" />
          디지털도화서
        </Link>
      </div>
      
      <button className="navbar-toggle" onClick={handleMenuToggle}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>

      <ul className={isMenuOpen ? "navbar-menu active" : "navbar-menu"}>
        <li><Link to="/" onClick={closeMenu}>홈</Link></li>
        <li><Link to="/space" onClick={closeMenu}>공간소개</Link></li>
        <li><Link to="/notice" onClick={closeMenu}>공지사항</Link></li>
        <li><Link to="/program" onClick={closeMenu}>프로그램</Link></li>
        <li><Link to="/reservation" onClick={closeMenu}>예약/신청</Link></li>
        <li><Link to="/location" onClick={closeMenu}>위치</Link></li>
        {token && <li><Link to="/popup/manage" onClick={closeMenu}>팝업관리</Link></li>}
        {isMenuOpen && (
          <li className="navbar-login-mobile">
            {token ? (
              <button onClick={handleLogout} className="navbar-login-btn">로그아웃</button>
            ) : (
              <Link to="/login" onClick={closeMenu} className="navbar-login-btn">로그인</Link>
            )}
          </li>
        )}
      </ul>
      <div className="navbar-login-desktop">
        {token ? (
          <button onClick={handleLogout} className="navbar-login-btn">로그아웃</button>
        ) : (
          <Link to="/login" className="navbar-login-btn">로그인</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 