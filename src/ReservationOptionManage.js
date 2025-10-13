import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import './ReservationOptionManage.css';

function ReservationOptionManage({ onClose }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [options, setOptions] = useState([]);
  const [category, setCategory] = useState('space');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    fetchOptions();
  }, [user, navigate, category]);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/reservation-options?category=${category}`);
      const data = await response.json();
      // 이름순으로 정렬
      const sortedData = data.sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
      setOptions(sortedData);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const generateValue = (label) => {
    // 한글을 영문으로 자동 변환 (간단한 로직)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `${category}-${timestamp}-${random}`;
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      alert('항목명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const value = generateValue(newLabel);
      
      const response = await fetch('http://localhost:3001/api/reservation-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          value: value,
          label: newLabel.trim(),
          category
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '추가에 실패했습니다.');
      }

      alert('항목이 추가되었습니다.');
      setNewLabel('');
      fetchOptions();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (option) => {
    if (option.isDefault) {
      alert('기본 항목은 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm('삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/reservation-options/${option._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }

      alert('항목이 삭제되었습니다.');
      fetchOptions();
    } catch (error) {
      alert(error.message);
    }
  };

  const getCategoryLabel = (cat) => {
    switch(cat) {
      case 'space': return '공간대여';
      case 'equipment': return '장비대여';
      case 'makerspace': return '메이커스페이스';
      default: return cat;
    }
  };

  return (
    <div className="option-manage-overlay" onClick={onClose}>
      <div className="option-manage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>예약 항목 관리</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 카테고리 선택 */}
          <div className="category-selector">
            <label>카테고리:</label>
            <div className="radio-buttons">
              <label>
                <input
                  type="radio"
                  value="space"
                  checked={category === 'space'}
                  onChange={(e) => setCategory(e.target.value)}
                />
                공간대여
              </label>
              <label>
                <input
                  type="radio"
                  value="equipment"
                  checked={category === 'equipment'}
                  onChange={(e) => setCategory(e.target.value)}
                />
                장비대여
              </label>
              <label>
                <input
                  type="radio"
                  value="makerspace"
                  checked={category === 'makerspace'}
                  onChange={(e) => setCategory(e.target.value)}
                />
                메이커스페이스
              </label>
            </div>
          </div>

          {/* 추가 폼 */}
          <div className="add-form">
            <h3>{getCategoryLabel(category)} 항목 추가</h3>
            <div className="input-row">
              <input
                type="text"
                placeholder="항목명을 입력하세요 (예: 이메리얼룸03)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                style={{ flex: 2 }}
              />
              <button 
                onClick={handleAdd} 
                disabled={loading}
                className="add-btn"
              >
                {loading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>

          {/* 항목 목록 */}
          <div className="options-list">
            <h3>{getCategoryLabel(category)} 목록 ({options.length}개)</h3>
            {options.length === 0 ? (
              <p className="empty-message">등록된 항목이 없습니다.</p>
            ) : (
              <div className="options-table">
                <table>
                  <thead>
                    <tr>
                      <th>항목명</th>
                      <th>등록일시</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option, index) => (
                      <tr key={option._id || option.value}>
                        <td>
                          {option.label}
                          {option.isDefault && <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}>(기본)</span>}
                        </td>
                        <td>{option.createdAt ? new Date(option.createdAt).toLocaleString('ko-KR') : '-'}</td>
                        <td>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(option)}
                            disabled={option.isDefault}
                            style={option.isDefault ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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

export default ReservationOptionManage;

