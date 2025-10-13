import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import './PopupManage.css';

function PopupManage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    fetchPopups();
  }, [user, navigate]);

  const fetchPopups = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/popups');
      if (!response.ok) throw new Error('팝업 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setPopups(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/popups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('삭제에 실패했습니다.');
      
      alert('삭제되었습니다.');
      fetchPopups();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/popups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) throw new Error('상태 변경에 실패했습니다.');
      
      fetchPopups();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="popup-manage-container">로딩 중...</div>;
  if (error) return <div className="popup-manage-container">오류: {error}</div>;

  return (
    <div className="popup-manage-container">
      <div className="popup-manage-header">
        <h1>팝업 관리</h1>
        <button className="btn-new" onClick={() => navigate('/popup/new')}>
          새 팝업 만들기
        </button>
      </div>

      <div className="popup-list">
        {popups.length === 0 ? (
          <div className="no-popups">등록된 팝업이 없습니다.</div>
        ) : (
          <table className="popup-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>메시지</th>
                <th>이미지</th>
                <th>활성화</th>
                <th>시작일</th>
                <th>종료일</th>
                <th>작성자</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {popups.map(popup => (
                <tr key={popup._id}>
                  <td>{popup.title}</td>
                  <td className="message-cell">{popup.message}</td>
                  <td>
                    {popup.imageUrl && (
                      <img src={popup.imageUrl} alt="팝업 이미지" className="popup-thumbnail" />
                    )}
                  </td>
                  <td>
                    <button
                      className={`btn-toggle ${popup.isActive ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(popup._id, popup.isActive)}
                    >
                      {popup.isActive ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td>{popup.startDate ? new Date(popup.startDate).toLocaleDateString() : '-'}</td>
                  <td>{popup.endDate ? new Date(popup.endDate).toLocaleDateString() : '-'}</td>
                  <td>{popup.createdBy?.name || popup.createdBy?.username || '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => navigate(`/popup/edit/${popup._id}`)}>
                      수정
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(popup._id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PopupManage;

