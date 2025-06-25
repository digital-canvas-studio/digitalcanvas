import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './PostDetail.css';

function ProgramDetail() {
  const [program, setProgram] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const response = await fetch(`/api/programs/${id}`);
        if (!response.ok) throw new Error('Program not found');
        const data = await response.json();
        setProgram(data);
      } catch (error) {
        console.error("Error fetching program:", error);
        navigate('/program');
      }
    };
    fetchProgram();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (window.confirm('정말로 이 프로그램을 삭제하시겠습니까?')) {
      try {
        await fetch(`/api/programs/${id}`, { method: 'DELETE' });
    alert('프로그램이 삭제되었습니다.');
    navigate('/program');
      } catch (error) {
        alert('삭제에 실패했습니다.');
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