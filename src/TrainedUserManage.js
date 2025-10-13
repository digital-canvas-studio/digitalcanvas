import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import './TrainedUserManage.css';

function TrainedUserManage({ onClose }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [trainedUsers, setTrainedUsers] = useState([]);
  const [equipmentType, setEquipmentType] = useState('3d-printer-01');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    fetchTrainedUsers();
  }, [user, navigate, equipmentType]);

  const fetchTrainedUsers = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/trained-users/${equipmentType}`);
      const data = await response.json();
      setTrainedUsers(data);
    } catch (error) {
      console.error('Error fetching trained users:', error);
    }
  };

  const handleRegister = async () => {
    if (!newName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/trained-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName.trim(),
          equipmentType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '등록에 실패했습니다.');
      }

      alert('등록되었습니다.');
      setNewName('');
      fetchTrainedUsers();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/trained-users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }

      alert('삭제되었습니다.');
      fetchTrainedUsers();
    } catch (error) {
      alert(error.message);
    }
  };

  const getEquipmentLabel = (type) => {
    return type === '3d-printer-01' ? '3D프린터01' : '레이저각인기';
  };

  return (
    <div className="trained-user-overlay" onClick={onClose}>
      <div className="trained-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>교육 이수자 명단 관리</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 장비 선택 */}
          <div className="equipment-selector">
            <label>장비 선택:</label>
            <div className="radio-buttons">
              <label>
                <input
                  type="radio"
                  value="3d-printer-01"
                  checked={equipmentType === '3d-printer-01'}
                  onChange={(e) => setEquipmentType(e.target.value)}
                />
                3D프린터01
              </label>
              <label>
                <input
                  type="radio"
                  value="laser-engraver"
                  checked={equipmentType === 'laser-engraver'}
                  onChange={(e) => setEquipmentType(e.target.value)}
                />
                레이저각인기
              </label>
            </div>
          </div>

          {/* 등록 폼 */}
          <div className="register-form">
            <h3>{getEquipmentLabel(equipmentType)} 이수자 등록</h3>
            <div className="input-group">
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              />
              <button 
                onClick={handleRegister} 
                disabled={loading}
                className="register-btn"
              >
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>

          {/* 이수자 목록 */}
          <div className="trained-users-list">
            <h3>{getEquipmentLabel(equipmentType)} 이수자 목록 ({trainedUsers.length}명)</h3>
            {trainedUsers.length === 0 ? (
              <p className="empty-message">등록된 이수자가 없습니다.</p>
            ) : (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>등록일시</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainedUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{new Date(user.registeredAt).toLocaleString('ko-KR')}</td>
                        <td>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(user._id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainedUserManage;

