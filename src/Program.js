import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import './Space.css'; // 공간소개 페이지와 동일한 갤러리 스타일 사용
import AuthContext from './context/AuthContext';
import api from './api';

function Program() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await api.get('/api/programs');
        setPrograms(response.data);
      } catch (error) {
        console.error("Error fetching programs:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error fetching data.</div>;

  return (
    <div className="page-container">
      <div className="page-header">
      <h1>프로그램</h1>
        {token && (
          <Link to="/program/new" className="btn">프로그램 등록</Link>
        )}
      </div>
      {programs.length > 0 ? (
        <div className="space-list-container">
        {programs.map(program => (
            <Link to={`/program/${program._id}`} key={program._id} className="space-item">
              <img src={program.thumbnailUrl} alt={program.title} className="space-item-image" />
              <div className="space-item-title">{program.title}</div>
            </Link>
        ))}
      </div>
      ) : (
        !loading && <p>현재 등록된 프로그램이 없습니다.</p>
      )}
    </div>
  );
}

export default Program; 