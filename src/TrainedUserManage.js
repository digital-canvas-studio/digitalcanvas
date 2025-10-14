import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import api from './api';
import './TrainedUserManage.css';

function TrainedUserManage({ onClose }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [trainedUsers, setTrainedUsers] = useState([]);
  const [equipmentType, setEquipmentType] = useState('3d-printer');
  const [specificEquipment, setSpecificEquipment] = useState('3d-printer-01'); // 등록할 구체적 장비
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
      const response = await api.get(`/api/trained-users/${equipmentType}`);
      setTrainedUsers(response.data);
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
      // 등록할 때는 구체적인 장비 번호 사용
      const equipmentToRegister = equipmentType === '3d-printer' ? specificEquipment : equipmentType;
      
      const response = await api.post('/api/trained-users', {
        name: newName.trim(),
        equipmentType: equipmentToRegister
      });

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
      await api.delete(`/api/trained-users/${id}`);
      alert('삭제되었습니다.');
      fetchTrainedUsers();
    } catch (error) {
      alert(error.response?.data?.error || error.message || '삭제에 실패했습니다.');
    }
  };

  const getEquipmentLabel = (type) => {
    if (type === '3d-printer') return '3D프린터';
    if (type === 'laser-engraver') return '레이저각인기';
    if (type === '3d-printer-01') return '3D프린터01';
    if (type === '3d-printer-02') return '3D프린터02';
    return type;
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
                  value="3d-printer"
                  checked={equipmentType === '3d-printer'}
                  onChange={(e) => setEquipmentType(e.target.value)}
                />
                3D프린터 (모든 3D프린터)
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
            
            {/* 3D프린터인 경우 구체적인 장비 선택 */}
            {equipmentType === '3d-printer' && (
              <div className="specific-equipment-selector">
                <label>등록할 장비:</label>
                <select 
                  value={specificEquipment}
                  onChange={(e) => setSpecificEquipment(e.target.value)}
                  className="equipment-dropdown"
                >
                  <option value="3d-printer-01">3D프린터01</option>
                  <option value="3d-printer-02">3D프린터02</option>
                </select>
              </div>
            )}
            
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
                      {equipmentType === '3d-printer' && <th>장비</th>}
                      <th>등록일시</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainedUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        {equipmentType === '3d-printer' && (
                          <td>{getEquipmentLabel(user.equipmentType)}</td>
                        )}
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

