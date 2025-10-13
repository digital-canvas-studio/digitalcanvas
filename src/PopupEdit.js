import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import './PopupEdit.css';

function PopupEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    isActive: true,
    startDate: '',
    endDate: ''
  });

  const fetchPopup = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/popups/${id}`);
      if (!response.ok) throw new Error('팝업을 불러오는데 실패했습니다.');
      const data = await response.json();
      
      setFormData({
        title: data.title || '',
        message: data.message || '',
        imageUrl: data.imageUrl || '',
        isActive: data.isActive !== undefined ? data.isActive : true,
        startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      alert(err.message);
      navigate('/popup/manage');
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (id) {
      fetchPopup();
    }
  }, [id, user, navigate, fetchPopup]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      alert('제목과 메시지는 필수입니다.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = id 
        ? `http://localhost:3001/api/popups/${id}` 
        : 'http://localhost:3001/api/popups';
      
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '저장에 실패했습니다.');
      }

      alert(id ? '수정되었습니다.' : '생성되었습니다.');
      navigate('/popup/manage');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-edit-container">
      <div className="popup-edit-header">
        <h1>{id ? '팝업 수정' : '새 팝업 만들기'}</h1>
        <button className="btn-back" onClick={() => navigate('/popup/manage')}>
          목록으로
        </button>
      </div>

      <form onSubmit={handleSubmit} className="popup-form">
        <div className="form-group">
          <label htmlFor="title">제목 *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="팝업 제목을 입력하세요"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">메시지 *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="팝업 메시지를 입력하세요"
            rows="5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">이미지 URL</label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
          {formData.imageUrl && (
            <div className="image-preview">
              <img src={formData.imageUrl} alt="미리보기" />
            </div>
          )}
        </div>

        <div className="form-group-row">
          <div className="form-group">
            <label htmlFor="startDate">시작일</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">종료일</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group-checkbox">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            <span>활성화</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? '처리 중...' : (id ? '수정하기' : '생성하기')}
          </button>
          <button type="button" className="btn-cancel" onClick={() => navigate('/popup/manage')}>
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default PopupEdit;

