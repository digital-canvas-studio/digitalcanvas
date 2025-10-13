import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './PostDetail.css';
import api from './api';

function ProgramDetail() {
  const [program, setProgram] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const response = await api.get(`/api/programs/${id}`);
        setProgram(response.data);
      } catch (error) {
        console.error("Error fetching program:", error);
        alert('프로그램 정보를 불러오는데 실패했습니다.');
        navigate('/program');
      }
    };
    fetchProgram();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (window.confirm('정말로 이 프로그램을 삭제하시겠습니까?')) {
      try {
        await api.delete(`/api/programs/${id}`);
        alert('프로그램이 삭제되었습니다.');
        navigate('/program');
      } catch (error) {
        alert('삭제에 실패했습니다.');
        console.error("Error deleting program:", error);
      }
    }
  };

  if (!program) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container post-detail-container">
      <h1 className="post-title">{program.title}</h1>
      <div 
        className="post-content"
        dangerouslySetInnerHTML={{ __html: program.content }}
      />
      <div className="post-actions">
        <Link to="/program" className="btn">목록으로</Link>
        <Link to={`/program/${id}/edit`} className="btn btn-secondary">수정</Link>
        <button onClick={handleDelete} className="btn btn-danger">삭제</button>
      </div>
    </div>
  );
}

export default ProgramDetail; 