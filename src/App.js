import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './Navbar';
import Home from './Home';
import Space from './Space';
import SpaceNew from './SpaceNew';
import SpaceDetail from './SpaceDetail';
import SpaceEdit from './SpaceEdit';
import Notice from './Notice';
import NoticeNew from './NoticeNew';
import NoticeDetail from './NoticeDetail';
import NoticeEdit from './NoticeEdit';
import Program from './Program';
import ProgramNew from './ProgramNew';
import ProgramDetail from './ProgramDetail';
import ProgramEdit from './ProgramEdit';
import Reservation from './Reservation';
import Location from './Location';
import HomeEdit from './HomeEdit';
import Login from './Login';
import Register from './Register';
import PopupManage from './PopupManage';
import PopupEdit from './PopupEdit';

function App() {
  return (
      <div className="App">
        <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/edit-home" element={<HomeEdit />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/space" element={<Space />} />
          <Route path="/space/new" element={<SpaceNew />} />
          <Route path="/space/:id" element={<SpaceDetail />} />
          <Route path="/space/:id/edit" element={<SpaceEdit />} />
          <Route path="/notice" element={<Notice />} />
          <Route path="/notice/new" element={<NoticeNew />} />
          <Route path="/notice/:id" element={<NoticeDetail />} />
          <Route path="/notice/:id/edit" element={<NoticeEdit />} />
          <Route path="/program" element={<Program />} />
          <Route path="/program/new" element={<ProgramNew />} />
          <Route path="/program/:id" element={<ProgramDetail />} />
          <Route path="/program/:id/edit" element={<ProgramEdit />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/location" element={<Location />} />
          <Route path="/popup/manage" element={<PopupManage />} />
          <Route path="/popup/new" element={<PopupEdit />} />
          <Route path="/popup/edit/:id" element={<PopupEdit />} />
        </Routes>
      </main>
      </div>
  );
}

export default App;
