import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import api from './api';
import './Statistics.css';

function Statistics() {
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statistics, setStatistics] = useState({});
  const [showSpaceDetail, setShowSpaceDetail] = useState(false);
  const [spaceDetailStats, setSpaceDetailStats] = useState({});

  useEffect(() => {
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchSchedules();
  }, [selectedMonth]);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/api/schedules');
      const data = response.data;
      setSchedules(data);
      calculateStatistics(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const calculateStatistics = (data) => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // 해당 월의 예약만 필터링
    const monthSchedules = data.filter(schedule => {
      const scheduleDate = new Date(schedule.start);
      return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === month;
    });

    // 주차별, 카테고리별 통계
    const stats = {
      week1: { space: 0, equipment: 0, printer3d: 0, laser: 0 },
      week2: { space: 0, equipment: 0, printer3d: 0, laser: 0 },
      week3: { space: 0, equipment: 0, printer3d: 0, laser: 0 },
      week4: { space: 0, equipment: 0, printer3d: 0, laser: 0 },
      week5: { space: 0, equipment: 0, printer3d: 0, laser: 0 }
    };

    monthSchedules.forEach(schedule => {
      const scheduleDate = new Date(schedule.start);
      const weekNumber = getWeekOfMonth(scheduleDate);
      const weekKey = `week${weekNumber}`;

      if (!stats[weekKey]) return;

      // notes에서 상세 정보 파싱
      let details = {};
      try {
        details = JSON.parse(schedule.notes || '{}');
      } catch (e) {
        details = {};
      }

      // 공간대여 카운트
      if (details.spaceTypes && details.spaceTypes.length > 0) {
        stats[weekKey].space += details.spaceTypes.length;
      } else if (schedule.spaces && schedule.spaces.length > 0) {
        // 기존 데이터 형식 - 실제 공간 항목만 필터링
        const validSpaceNames = ['이메리얼룸01', '이메리얼룸02', '창작방앗간', '공존'];
        const actualSpaces = schedule.spaces.filter(s => {
          // 휴관 제외
          if (s === '휴관' || s === 'closed') return false;
          // 메이커스페이스 항목 제외
          if (s.includes('3D프린터') || s.includes('3d프린터') || 
              s.includes('레이저각인기') || s.includes('레이저') ||
              s.includes('printer') || s.includes('laser') || s.includes('engraver')) {
            return false;
          }
          // 장비 항목 제외
          if (s.includes('카메라') || s.includes('캠코더') || s.includes('조명') || 
              s.includes('레코더') || s.includes('마이크') || s.includes('칠판') || 
              s.includes('노트북')) {
            return false;
          }
          return true;
        });
        stats[weekKey].space += actualSpaces.length;
      }

      // 장비대여 카운트 (3D프린터, 레이저각인기 제외)
      if (details.equipmentTypes && details.equipmentTypes.length > 0) {
        stats[weekKey].equipment += details.equipmentTypes.length;
      } else if (schedule.equipment && schedule.equipment.length > 0) {
        const normalEquipment = schedule.equipment.filter(e => 
          !e.includes('3D프린터') && !e.includes('레이저각인기')
        );
        stats[weekKey].equipment += normalEquipment.length;
      }

      // 3D프린터 카운트 (3d-printer로 시작하거나 3D프린터가 포함된 모든 항목)
      if (details.makerSpaceTypes && details.makerSpaceTypes.length > 0) {
        const printer3dCount = details.makerSpaceTypes.filter(type => 
          type.includes('3d-printer') || type.includes('printer')
        ).length;
        stats[weekKey].printer3d += printer3dCount;
      } else if (schedule.equipment) {
        const printer3dCount = schedule.equipment.filter(e => 
          e.includes('3D프린터') || e.includes('3d프린터')
        ).length;
        stats[weekKey].printer3d += printer3dCount;
      } else if (schedule.spaces) {
        const printer3dCount = schedule.spaces.filter(s => 
          s.includes('3D프린터') || s.includes('3d프린터')
        ).length;
        stats[weekKey].printer3d += printer3dCount;
      }

      // 레이저각인기 카운트 (레이저각인기가 포함된 모든 항목)
      if (details.makerSpaceTypes && details.makerSpaceTypes.length > 0) {
        const laserCount = details.makerSpaceTypes.filter(type => 
          type.includes('laser') || type.includes('engraver')
        ).length;
        stats[weekKey].laser += laserCount;
      } else if (schedule.equipment) {
        const laserCount = schedule.equipment.filter(e => 
          e.includes('레이저각인기') || e.includes('레이저')
        ).length;
        stats[weekKey].laser += laserCount;
      } else if (schedule.spaces) {
        const laserCount = schedule.spaces.filter(s => 
          s.includes('레이저각인기') || s.includes('레이저')
        ).length;
        stats[weekKey].laser += laserCount;
      }
    });

    setStatistics(stats);
  };

  // 날짜가 속한 주차 계산 (1~5주)
  const getWeekOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstDay.getDay(); // 0: 일요일, 1: 월요일, ...
    const day = date.getDate();
    
    // 첫 주는 1일이 속한 주
    const weekNumber = Math.ceil((day + firstDayOfWeek) / 7);
    return Math.min(weekNumber, 5); // 최대 5주
  };

  // 총 예약 건수 계산
  const getTotalCounts = () => {
    const total = { space: 0, equipment: 0, printer3d: 0, laser: 0, all: 0 };
    Object.values(statistics).forEach(week => {
      total.space += week.space;
      total.equipment += week.equipment;
      total.printer3d += week.printer3d;
      total.laser += week.laser;
    });
    total.all = total.space + total.equipment + total.printer3d + total.laser;
    return total;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // 공간 value를 label로 변환하는 맵핑
  const getSpaceLabel = (value) => {
    const spaceMap = {
      'emeral-room-01': '이메리얼룸01',
      'emeral-room-02': '이메리얼룸02',
      'creative-workshop': '창작방앗간',
      'coexistence': '공존',
      'closed': '휴관'
    };
    return spaceMap[value] || value;
  };

  // 공간별 상세 통계 계산
  const calculateSpaceDetails = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const monthSchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start);
      return scheduleDate.getFullYear() === year && scheduleDate.getMonth() === month;
    });

    const spaceStats = {};
    
    // 공간 항목 목록 (메이커스페이스 제외)
    const validSpaceNames = ['이메리얼룸01', '이메리얼룸02', '창작방앗간', '공존'];

    monthSchedules.forEach(schedule => {
      const scheduleDate = new Date(schedule.start);
      const weekNumber = getWeekOfMonth(scheduleDate);
      const weekKey = `week${weekNumber}`;

      let details = {};
      try {
        details = JSON.parse(schedule.notes || '{}');
      } catch (e) {
        details = {};
      }

      // 공간 목록 추출 (메이커스페이스 제외)
      let spaces = [];
      if (details.spaceTypes && details.spaceTypes.length > 0) {
        // 새 형식: spaceTypes만 사용
        spaces = details.spaceTypes.map(type => getSpaceLabel(type));
      } else if (schedule.spaces && schedule.spaces.length > 0) {
        // 기존 형식: 공간 항목만 필터링 (메이커스페이스, 장비 제외)
        spaces = schedule.spaces.filter(s => {
          // 휴관 제외
          if (s === '휴관' || s === 'closed') return false;
          // 메이커스페이스 항목 제외
          if (s.includes('3D프린터') || s.includes('3d프린터') || 
              s.includes('레이저각인기') || s.includes('레이저') ||
              s.includes('printer') || s.includes('laser') || s.includes('engraver')) {
            return false;
          }
          // 장비 항목 제외
          if (s.includes('카메라') || s.includes('캠코더') || s.includes('조명') || 
              s.includes('레코더') || s.includes('마이크') || s.includes('칠판') || 
              s.includes('노트북')) {
            return false;
          }
          return true;
        });
      }

      // 각 공간별 카운트 (한글 이름으로 변환)
      spaces.forEach(spaceName => {
        const displayName = getSpaceLabel(spaceName);
        // 유효한 공간 이름인지 확인
        if (validSpaceNames.includes(displayName)) {
          if (!spaceStats[displayName]) {
            spaceStats[displayName] = {
              week1: 0, week2: 0, week3: 0, week4: 0, week5: 0
            };
          }
          spaceStats[displayName][weekKey]++;
        }
      });
    });

    setSpaceDetailStats(spaceStats);
    setShowSpaceDetail(true);
  };

  const total = getTotalCounts();

  return (
    <div className="page-container statistics-container">
      <div className="page-header">
        <h1>예약 실적</h1>
      </div>

      {/* 월 선택 */}
      <div className="month-selector">
        <button onClick={handlePrevMonth} className="month-btn">◀ 이전 달</button>
        <h2>{selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월</h2>
        <button onClick={handleNextMonth} className="month-btn">다음 달 ▶</button>
        <button onClick={handleCurrentMonth} className="current-month-btn">이번 달</button>
      </div>

      {/* 통계 테이블 */}
      <div className="statistics-table-container">
        <table className="statistics-table">
          <thead>
            <tr>
              <th>주차</th>
              <th>공간대여</th>
              <th>장비대여</th>
              <th>3D프린터</th>
              <th>레이저각인기</th>
              <th>주간 합계</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(week => {
              const weekKey = `week${week}`;
              const weekData = statistics[weekKey] || { space: 0, equipment: 0, printer3d: 0, laser: 0 };
              const weekTotal = weekData.space + weekData.equipment + weekData.printer3d + weekData.laser;
              
              return (
                <tr key={week}>
                  <td className="week-cell">{week}주차</td>
                  <td className="clickable-cell" onClick={calculateSpaceDetails}>{weekData.space}</td>
                  <td>{weekData.equipment}</td>
                  <td>{weekData.printer3d}</td>
                  <td>{weekData.laser}</td>
                  <td className="total-cell">{weekTotal}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td>총 예약 건수</td>
              <td className="clickable-cell" onClick={calculateSpaceDetails}>{total.space}</td>
              <td>{total.equipment}</td>
              <td>{total.printer3d}</td>
              <td>{total.laser}</td>
              <td className="grand-total">{total.all}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 공간별 상세 통계 모달 */}
      {showSpaceDetail && (
        <div className="modal-overlay" onClick={() => setShowSpaceDetail(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>공간별 예약 실적</h2>
              <button className="close-btn" onClick={() => setShowSpaceDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>공간명</th>
                    <th>1주차</th>
                    <th>2주차</th>
                    <th>3주차</th>
                    <th>4주차</th>
                    <th>5주차</th>
                    <th>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(spaceDetailStats).sort().map(spaceName => {
                    const spaceData = spaceDetailStats[spaceName];
                    const spaceTotal = spaceData.week1 + spaceData.week2 + spaceData.week3 + spaceData.week4 + spaceData.week5;
                    
                    return (
                      <tr key={spaceName}>
                        <td className="space-name-cell">{spaceName}</td>
                        <td>{spaceData.week1}</td>
                        <td>{spaceData.week2}</td>
                        <td>{spaceData.week3}</td>
                        <td>{spaceData.week4}</td>
                        <td>{spaceData.week5}</td>
                        <td className="total-cell">{spaceTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Statistics;

