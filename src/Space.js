import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Space.css';
import api from './api';

function Space() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await api.get('/api/spaces');
        setSpaces(response.data);
      } catch (err) {
        console.error("Error fetching spaces:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container">Error fetching data.</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>공간 소개</h1>
      </div>
      <div className="space-list-container">
        {spaces.map(space => (
          <Link to={`/space/${space._id}`} key={space._id} className="space-item">
            <img src={space.thumbnailUrl} alt={space.title} className="space-item-image" />
            <div className="space-item-title">{space.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Space; 