import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import './Notice.css';
import AuthContext from './context/AuthContext';
import api from './api';

function Notice() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await api.get('/api/notices');
        setNotices(response.data);
      } catch (error) {
        console.error("공지사항 목록을 불러오는 중 오류 발생:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error fetching notices.</div>;

  return (
    <div className="page-container">
      <div className="page-header">
      <h1>공지사항</h1>
        {token && (
          <Link to="/notice/new" className="btn">글 등록</Link>
        )}
      </div>
      <div className="notice-list">
        {notices.length > 0 ? (
          notices.map(notice => (
            <div key={notice._id} className="notice-item">
              <Link to={`/notice/${notice._id}`} className="notice-item-link">
                <span className="notice-date">
                  {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                </span>
                <span className="notice-title">{notice.title}</span>
              </Link>
            </div>
          ))
        ) : (
          !loading && <p>등록된 공지사항이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default Notice; 