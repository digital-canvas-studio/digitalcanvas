import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './PostDetail.css';
import AuthContext from './context/AuthContext';
import api from './api';

function SpaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchSpace = async () => {
      try {
        const response = await api.get(`/api/spaces/${id}`);
        setSpace(response.data);
      } catch (error) {
        console.error("Error fetching space details:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpace();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('정말로 이 공간 정보를 삭제하시겠습니까?')) {
      try {
        await api.delete(`/api/spaces/${id}`);
        alert('공간 정보가 삭제되었습니다.');
        navigate('/space');
      } catch (error) {
        console.error('Error deleting space:', error);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error fetching data.</div>;
  if (!space) return <div className="page-container">No data found.</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{space.title}</h1>
        {token && (
          <div className="button-group">
            <Link to={`/space/${id}/edit`} className="btn">수정하기</Link>
            <button onClick={handleDelete} className="btn btn-danger">삭제하기</button>
          </div>
        )}
      </div>
      <div className="post-content" dangerouslySetInnerHTML={{ __html: space.content }} />
    </div>
  );
}

export default SpaceDetail; 