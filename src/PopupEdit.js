import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import api from './api';
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
    imageUrls: [],
    isActive: true,
    startDate: '',
    endDate: ''
  });
  const [newImageUrl, setNewImageUrl] = useState('');

  const fetchPopup = useCallback(async () => {
    try {
      const response = await api.get(`/api/popups/${id}`);
      const data = response.data;
      
      setFormData({
        title: data.title || '',
        message: data.message || '',
        imageUrl: data.imageUrl || '',
        imageUrls: data.imageUrls || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      alert(err.message || '팝업을 불러오는데 실패했습니다.');
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

  const handleAddImage = (e) => {
    if (e) e.preventDefault();
    
    if (!newImageUrl.trim()) {
      alert('이미지 URL을 입력해주세요.');
      return;
    }

    console.log('Adding image:', newImageUrl);
    console.log('Current imageUrls:', formData.imageUrls);

    setFormData(prev => {
      const updated = {
        ...prev,
        imageUrls: [...(prev.imageUrls || []), newImageUrl.trim()]
      };
      console.log('Updated formData:', updated);
      return updated;
    });
    setNewImageUrl('');
    alert('이미지가 추가되었습니다.');
  };

  const handleRemoveImage = (e, index) => {
    if (e) e.preventDefault();
    
    setFormData(prev => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index)
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
      console.log('Saving formData:', formData);
      console.log('ImageUrls to save:', formData.imageUrls);
      
      if (id) {
        const response = await api.put(`/api/popups/${id}`, formData);
        console.log('Save response:', response.data);
      } else {
        const response = await api.post('/api/popups', formData);
        console.log('Save response:', response.data);
      }

      alert(id ? '수정되었습니다.' : '생성되었습니다.');
      navigate('/popup/manage');
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || err.message || '저장에 실패했습니다.');
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
          <label htmlFor="imageUrl">이미지 URL (단일 이미지 - 하위호환)</label>
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

        <div className="form-group">
          <label>이미지 목록 (여러 이미지)</label>
          <div className="image-urls-container">
            <div className="add-image-row">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage(e);
                  }
                }}
              />
              <button type="button" onClick={handleAddImage} className="btn-add-image">
                추가
              </button>
            </div>

            {(formData.imageUrls && formData.imageUrls.length > 0) ? (
              <div className="image-list">
                <p style={{ color: '#666', fontSize: '13px', margin: '10px 0' }}>
                  추가된 이미지: {formData.imageUrls.length}개
                </p>
                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="image-item">
                    <div className="image-preview-small">
                      <img 
                        src={url} 
                        alt={`이미지 ${index + 1}`} 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=Error'; }}
                      />
                    </div>
                    <div className="image-url-text">{url}</div>
                    <button 
                      type="button" 
                      onClick={(e) => handleRemoveImage(e, index)}
                      className="btn-remove-image"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '13px', margin: '10px 0', fontStyle: 'italic' }}>
                추가된 이미지가 없습니다.
              </p>
            )}
          </div>
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

