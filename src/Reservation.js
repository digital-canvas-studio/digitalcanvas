import React, { useState, useEffect, useContext } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './Reservation.css';
import AuthContext from './context/AuthContext';
import api from './api';
import SpaceReservationForm from './SpaceReservationForm';
import TrainedUserManage from './TrainedUserManage';
import ReservationOptionManage from './ReservationOptionManage';

const renderEventContent = (eventInfo) => {
  const { view, event } = eventInfo;
  // 월(Month) 보기일 경우
  if (view.type === 'dayGridMonth') {
    return (
      <div className="fc-event-month-view">
        <span className="fc-event-dot" style={{ backgroundColor: event.backgroundColor }}></span>
        <div className="fc-event-title-month">{event.title}</div>
      </div>
    );
  }
  // 주(Week) 또는 일(Day) 보기일 경우
  return (
    <div className="fc-event-timegrid-view">
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{event.title}</div>
    </div>
  );
};

// 30분 단위 시간 옵션을 생성하는 헬퍼 함수 (관리자용: 9시~17시)
const generateTimeOptions = () => {
  const options = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 17 && m > 0) continue; // 17:00 까지만 포함
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};

// 새로운 예약을 생성하는 폼 컴포넌트 (관리자용)
const ReservationForm = ({ onAddEvent }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    contact: '',
    reservationDate: '',
    startTime: '',
    endTime: '',
    spaceTypes: [],
    equipmentTypes: [],
    makerSpaceTypes: []
  });

  // 동적으로 로드되는 옵션
  const [spaceOptions, setSpaceOptions] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [makerSpaceOptions, setMakerSpaceOptions] = useState([]);

  // 기본 옵션
  const defaultSpaceOptions = [
    { value: 'emeral-room-01', label: '이메리얼룸01' },
    { value: 'emeral-room-02', label: '이메리얼룸02' },
    { value: 'creative-workshop', label: '창작방앗간' },
    { value: 'coexistence', label: '공존' },
    { value: 'closed', label: '휴관' }
  ];

  const defaultEquipmentOptions = [
    { value: 'nikon-dslr', label: '니콘 DSLR 카메라' },
    { value: 'sony-camcorder', label: '소니 캠코더' },
    { value: '360-camera', label: '360 카메라(교내연구소만 가능)' },
    { value: 'led-light', label: 'LED 조명' },
    { value: 'zoom-recorder', label: '줌 사운드 레코더' },
    { value: 'microphone', label: '현장답사용 마이크리시버' },
    { value: 'electronic-board', label: '전자칠판' },
    { value: 'laptop', label: '노트북' }
  ];

  // 2025년 1월 1일부터 3D프린터02 추가
  const currentDate = new Date();
  const january2025 = new Date(2025, 0, 1); // 2025년 1월 1일
  const isAfterJanuary2025 = currentDate >= january2025;
  
  const defaultMakerSpaceOptions = [
    { value: '3d-printer-01', label: '3D프린터01' },
    { value: 'laser-engraver', label: '레이저각인기' },
    ...(isAfterJanuary2025 ? [{ value: '3d-printer-02', label: '3D프린터02' }] : [])
  ];

  // 옵션 로드
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [spaceRes, equipRes, makerRes] = await Promise.all([
          api.get('/api/reservation-options?category=space'),
          api.get('/api/reservation-options?category=equipment'),
          api.get('/api/reservation-options?category=makerspace')
        ]);

        const spaceData = spaceRes.data;
        const equipData = equipRes.data;
        const makerData = makerRes.data;

        const mergeOptions = (dbOptions, defaultOptions) => {
          const merged = [...defaultOptions];
          dbOptions.forEach(dbOpt => {
            if (!merged.find(opt => opt.value === dbOpt.value)) {
              merged.push(dbOpt);
            }
          });
          return merged;
        };

        // 모든 항목 이름순 정렬
        const spaceOptionsSorted = mergeOptions(spaceData, defaultSpaceOptions)
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        const equipmentOptionsSorted = mergeOptions(equipData, defaultEquipmentOptions)
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        const makerSpaceOptionsSorted = mergeOptions(makerData, defaultMakerSpaceOptions)
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        setSpaceOptions(spaceOptionsSorted);
        setEquipmentOptions(equipmentOptionsSorted);
        setMakerSpaceOptions(makerSpaceOptionsSorted);
      } catch (error) {
        console.error('Error fetching options:', error);
        setSpaceOptions(defaultSpaceOptions);
        setEquipmentOptions(defaultEquipmentOptions);
        setMakerSpaceOptions(defaultMakerSpaceOptions);
      }
    };

    fetchOptions();
  }, []);

  const timeOptions = generateTimeOptions();

  const getSelectedLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name, value) => {
    setFormData(prev => {
      const currentArray = prev[name] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [name]: newArray
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 관리자는 제한 없이 등록 가능 (필수 필드만 체크)
    if (!formData.reservationDate || !formData.startTime || !formData.endTime) {
      alert('날짜와 시간을 모두 입력해주세요.');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    if (formData.spaceTypes.length === 0 && formData.equipmentTypes.length === 0 && formData.makerSpaceTypes.length === 0) {
      alert('공간, 장비 또는 메이커스페이스를 최소 하나는 선택해주세요.');
      return;
    }

    try {
      // 선택된 항목들의 라벨 가져오기
      const allSelectedTypes = [
        ...formData.spaceTypes.map(type => getSelectedLabel(spaceOptions, type)),
        ...formData.equipmentTypes.map(type => getSelectedLabel(equipmentOptions, type)),
        ...formData.makerSpaceTypes.map(type => getSelectedLabel(makerSpaceOptions, type))
      ].filter(Boolean);

      // 제목 생성
      const titlePrefix = formData.name ? `${formData.name} - ` : '관리자 등록 - ';
      const title = titlePrefix + allSelectedTypes.join(', ');

      const reservationData = {
        title,
        start: new Date(`${formData.reservationDate}T${formData.startTime}:00`).toISOString(),
        end: new Date(`${formData.reservationDate}T${formData.endTime}:00`).toISOString(),
        type: 'space',
        spaces: allSelectedTypes,
        equipment: [],
        notes: JSON.stringify({
          name: formData.name || '관리자',
          department: formData.department || '',
          contact: formData.contact || '',
          spaceTypes: formData.spaceTypes,
          equipmentTypes: formData.equipmentTypes,
          makerSpaceTypes: formData.makerSpaceTypes,
          isAdminCreated: true
        })
      };

      const response = await api.post('/api/schedules', reservationData);
      
      onAddEvent();

      // 폼 초기화
      setFormData({
        name: '',
        department: '',
        contact: '',
        reservationDate: '',
        startTime: '',
        endTime: '',
        spaceTypes: [],
        equipmentTypes: [],
        makerSpaceTypes: []
      });
      
      alert('예약이 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error('Error creating reservation:', error);
      const errorMessage = error.response?.data?.error || '예약 생성에 실패했습니다.';
      alert(errorMessage);
    }
  };

  return (
    <div className="reservation-form-container">
      <h2>새 예약 등록 (관리자)</h2>
      <form onSubmit={handleSubmit} className="reservation-form">
        {/* 선택 정보 */}
        <div className="form-section">
          <label className="section-label">이름 (선택)</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
            placeholder="예약자 이름 또는 '수리중' 입력 (선택사항)"
          />
          <small style={{color: '#666', fontSize: '0.85em', marginTop: '0.25rem', display: 'block'}}>
            💡 수리중 예약을 등록하려면 이름에 '수리중'을 입력하고 해당 장비를 선택하세요.
          </small>
        </div>

        <div className="form-section">
          <label className="section-label">학과 및 소속 (선택)</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className="form-input"
            placeholder="학과 및 소속 (선택사항)"
          />
        </div>

        <div className="form-section">
          <label className="section-label">연락처 (선택)</label>
          <input
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleInputChange}
            className="form-input"
            placeholder="연락처 (선택사항)"
          />
        </div>

        {/* 날짜 및 시간 */}
        <div className="form-section">
          <label className="section-label">예약날짜 *</label>
          <input
            type="date"
            name="reservationDate"
            value={formData.reservationDate}
            onChange={handleInputChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-section" style={{flex: 1}}>
            <label className="section-label">시작시간 *</label>
            <select
              name="startTime"
              value={formData.startTime}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="">선택하세요</option>
              {timeOptions.map(time => (
                <option key={`start-${time}`} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="form-section" style={{flex: 1}}>
            <label className="section-label">종료시간 *</label>
            <select
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="form-input"
              required
            >
              <option value="">선택하세요</option>
              {timeOptions.map(time => (
                <option key={`end-${time}`} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 공간 대여 */}
        <div className="form-section">
          <label className="section-label">공간대여</label>
          <div className="checkbox-group">
            {spaceOptions.map(option => (
              <div key={option.value} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`admin-space-${option.value}`}
                  checked={formData.spaceTypes.includes(option.value)}
                  onChange={() => handleCheckboxChange('spaceTypes', option.value)}
                />
                <label htmlFor={`admin-space-${option.value}`}>{option.label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* 장비 대여 */}
        <div className="form-section">
          <label className="section-label">장비대여</label>
          <div className="checkbox-group">
            {equipmentOptions.map(option => (
              <div key={option.value} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`admin-equipment-${option.value}`}
                  checked={formData.equipmentTypes.includes(option.value)}
                  onChange={() => handleCheckboxChange('equipmentTypes', option.value)}
                />
                <label htmlFor={`admin-equipment-${option.value}`}>{option.label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* 메이커스페이스 */}
        <div className="form-section">
          <label className="section-label">메이커스페이스</label>
          <div className="checkbox-group">
            {makerSpaceOptions.map(option => (
              <div key={option.value} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`admin-maker-${option.value}`}
                  checked={formData.makerSpaceTypes.includes(option.value)}
                  onChange={() => handleCheckboxChange('makerSpaceTypes', option.value)}
                />
                <label htmlFor={`admin-maker-${option.value}`}>{option.label}</label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn submit-btn">등록하기</button>
      </form>
    </div>
  );
};

function Reservation() {
  const [events, setEvents] = useState([]);
  const { token } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showTrainedUserManage, setShowTrainedUserManage] = useState(false);
  const [showOptionManage, setShowOptionManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState([]);

  // 화면 너비에 따라 초기 뷰를 결정하는 함수
  const getInitialView = () => {
    return window.innerWidth <= 768 ? 'timeGridFourDay' : 'timeGridWeek';
  };

  // 색상 풀 정의 (새 항목용) - 명확하게 구분되는 색상들
  const colorPool = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', // 밝고 구분되는 색상들
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#D5A6BD', '#AED6F1', '#A3E4D7',
    '#FADBD8', '#D5DBDB', '#FCF3CF', '#D6EAF8', '#D1F2EB',
    '#FAD7A0', '#E8DAEF', '#D5F4E6', '#FEF9E7', '#EBF5FB'
  ];

  // 항목별 색상 매핑 함수 (기존 항목 + 동적 색상 배정)
  const getItemColor = (itemName) => {
    const colorMap = {
      // 공간 대여 - 파란색 계열
      '이메리얼룸01': '#45B7D1', // 밝은 파랑
      '이메리얼룸02': '#3498DB', // 중간 파랑
      '창작방앗간': '#2ECC71', // 초록
      '공존': '#F39C12', // 주황
      '휴관': '#95A5A6', // 회색
      
      // 장비 대여 - 초록색 계열
      '니콘 DSLR 카메라': '#4ECDC4', // 청록
      '소니 캠코더': '#27AE60', // 진한 초록
      '360 카메라(교내연구소만 가능)': '#96CEB4', // 연한 청록
      'LED 조명': '#F7DC6F', // 노랑
      '줌 사운드 레코더': '#E67E22', // 주황
      '현장답사용 마이크리시버': '#D35400', // 진한 주황
      '전자칠판': '#34495E', // 남색
      '노트북': '#7F8C8D', // 회색
      
      // 메이커스페이스 - 구분되는 색상
      '3D프린터01': '#9B59B6', // 보라
      '3D프린터02': '#8E44AD', // 진한 보라
      '레이저각인기': '#E74C3C', // 빨강
    };
    
    // 기존 항목이면 고정 색상 반환
    if (colorMap[itemName]) {
      return colorMap[itemName];
    }
    
    // 새 항목이면 해시 기반으로 일관된 색상 배정
    let hash = 0;
    for (let i = 0; i < itemName.length; i++) {
      hash = itemName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colorPool.length;
    return colorPool[colorIndex];
  };

  // 여러 항목이 있을 때 색상 결정 함수
  const getEventColor = (reservationDetails) => {
    if (!reservationDetails || reservationDetails.length === 0) {
      return '#95a5a6'; // 기본 회색
    }
    
    // 첫 번째 항목의 색상을 사용 (우선순위: 메이커스페이스 > 장비 > 공간)
    const makerSpaceItems = reservationDetails.filter(item => 
      ['3D프린터01', '3D프린터02', '레이저각인기'].includes(item)
    );
    const equipmentItems = reservationDetails.filter(item => 
      ['니콘 DSLR 카메라', '소니 캠코더', '360 카메라(교내연구소만 가능)', 
       'LED 조명', '줌 사운드 레코더', '현장답사용 마이크리시버', 
       '전자칠판', '노트북'].includes(item)
    );
    const spaceItems = reservationDetails.filter(item => 
      ['이메리얼룸01', '이메리얼룸02', '창작방앗간', '공존', '휴관'].includes(item)
    );
    
    if (makerSpaceItems.length > 0) {
      return getItemColor(makerSpaceItems[0]);
    } else if (equipmentItems.length > 0) {
      return getItemColor(equipmentItems[0]);
    } else if (spaceItems.length > 0) {
      return getItemColor(spaceItems[0]);
    }
    
    return getItemColor(reservationDetails[0]);
  };

  const formatEvent = (reservation) => {
    // notes에서 사용자 정보 파싱
    let userInfo = {};
    try {
      userInfo = JSON.parse(reservation.notes || '{}');
    } catch (e) {
      userInfo = {};
    }

    // 예약 날짜가 지났는지 확인
    const reservationDate = new Date(reservation.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = reservationDate < today;

    // 핸드폰번호 마지막 4자리 추출
    let phoneDisplay = '';
    if (userInfo.contact) {
      const phone = userInfo.contact.replace(/\D/g, ''); // 숫자만 추출
      phoneDisplay = phone.length >= 4 ? phone.slice(-4) : phone;
    }

    // 시간 포맷 (HH:MM)
    const startDate = new Date(reservation.start);
    const endDate = new Date(reservation.end);
    const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

    // 예약 내역 (공간, 장비, 메이커스페이스)
    let reservationDetails = [];
    if (reservation.spaces && reservation.spaces.length > 0) {
      reservationDetails = reservationDetails.concat(reservation.spaces);
    }
    if (reservation.equipment && reservation.equipment.length > 0) {
      reservationDetails = reservationDetails.concat(reservation.equipment);
    }
    const detailsText = reservationDetails.join(', ');

    // 제목 생성: 시간 + 내역 + 연락처
    // 수리중 예약인지 확인
    const isMaintenance = reservation.title && reservation.title.includes('수리중');
    
    let title = '';
    if (isMaintenance) {
      // 수리중 예약은 명확하게 표시
      title = `🔧 수리중 - ${startTime}-${endTime} ${detailsText}`;
    } else if (isPastDate && userInfo.name) {
      // 지난 날짜는 이름 마스킹
      const maskedName = userInfo.name.length > 2 
        ? userInfo.name.charAt(0) + '*'.repeat(userInfo.name.length - 2) + userInfo.name.charAt(userInfo.name.length - 1)
        : '*'.repeat(userInfo.name.length);
      title = `${startTime}-${endTime} ${detailsText}`;
      if (phoneDisplay) {
        title += ` (****${phoneDisplay})`;
      }
    } else {
      title = `${startTime}-${endTime} ${detailsText}`;
      if (phoneDisplay) {
        title += ` (****${phoneDisplay})`;
      }
    }

    // 예약 항목들로부터 색상 결정
    // 수리중 예약은 회색으로 표시
    const eventColor = isMaintenance ? '#808080' : getEventColor(reservationDetails);

    return {
      id: reservation._id,
      title: title,
      start: new Date(reservation.start),
      end: new Date(reservation.end),
      allDay: false,
      backgroundColor: eventColor,
      borderColor: eventColor,
      extendedProps: {
        type: reservation.type,
        spaces: reservation.spaces,
        equipment: reservation.equipment,
        notes: reservation.notes,
        status: reservation.status,
        userInfo: userInfo,
        phoneDisplay: phoneDisplay,
        isPastDate: isPastDate
      }
    };
  };

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        // 성능 최적화: 과거 3개월 ~ 미래 3개월 데이터만 조회
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        const response = await api.get('/api/schedules', {
          params: {
            start: threeMonthsAgo.toISOString(),
            end: threeMonthsLater.toISOString()
          }
        });
        const formattedEvents = response.data.map(formatEvent);
        setEvents(formattedEvents);

        // 최근 예약 10건 저장 (생성일 기준 내림차순)
        const sortedByCreated = [...response.data].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.start);
          const dateB = new Date(b.createdAt || b.start);
          return dateB - dateA;
        });
        setRecentReservations(sortedByCreated.slice(0, 10));
      } catch (error) {
        console.error("Error fetching reservations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReservations();
  }, []);
  
  const handleAddEvent = async () => {
    // 새로운 예약이 추가되었을 때 데이터를 다시 가져옴
    try {
      // 최근 3개월 데이터만 조회 (비용 절감)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3); // 미래 3개월까지
      
      const response = await api.get('/api/schedules', {
        params: {
          start: threeMonthsAgo.toISOString(),
          end: futureDate.toISOString()
        }
      });
      const formattedEvents = response.data.map(formatEvent);
      setEvents(formattedEvents);
      
      // 최근 예약 10건도 업데이트
      const sortedByCreated = [...response.data].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.start);
        const dateB = new Date(b.createdAt || b.start);
        return dateB - dateA;
      });
      setRecentReservations(sortedByCreated.slice(0, 10));
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const handleEventClick = async (clickInfo) => {
    // 모든 사용자에게 상세 정보 모달을 띄움
    setSelectedEvent(clickInfo.event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteReservation = async () => {
    if (!window.confirm('이 예약을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`/api/schedules/${selectedEvent.id}`);
      alert('예약이 삭제되었습니다.');
      
      // 예약 목록 새로고침
      handleAddEvent();
      closeModal();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleReservationClick = () => {
    setShowReservationForm(true);
  };

  const closeReservationForm = () => {
    setShowReservationForm(false);
  };

  const handleTrainedUserManageClick = () => {
    setShowTrainedUserManage(true);
  };

  const closeTrainedUserManage = () => {
    setShowTrainedUserManage(false);
  };

  const handleOptionManageClick = () => {
    setShowOptionManage(true);
  };

  const closeOptionManage = () => {
    setShowOptionManage(false);
  };

  return (
    <div className="page-container reservation-container">
      <div className="page-header">
        <h1>공간예약신청 일정</h1>
        <div className="header-buttons">
          <button onClick={handleReservationClick} className="btn">공간&장비신청</button>
          {token && (
            <>
              <button onClick={handleTrainedUserManageClick} className="btn btn-secondary">교육이수자 명단</button>
              <button onClick={handleOptionManageClick} className="btn btn-secondary">항목 관리</button>
            </>
          )}
        </div>
      </div>

      {/* 로딩 중 메시지 */}
      {isLoading && (
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <span>예약 내역을 불러오는 중입니다...</span>
        </div>
      )}

      {/* 색상 범례 */}
      <div className="color-legend">
        <h3>예약 항목별 색상 안내</h3>
        <div className="legend-sections">
          <div className="legend-section">
            <h4>공간 대여</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#45B7D1'}}></span>
                <span>이메리얼룸01</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#3498DB'}}></span>
                <span>이메리얼룸02</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#2ECC71'}}></span>
                <span>창작방앗간</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#F39C12'}}></span>
                <span>공존</span>
              </div>
            </div>
          </div>
          
          <div className="legend-section">
            <h4>장비 대여</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#4ECDC4'}}></span>
                <span>니콘 DSLR 카메라</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#27AE60'}}></span>
                <span>소니 캠코더</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#96CEB4'}}></span>
                <span>360 카메라</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#F7DC6F'}}></span>
                <span>LED 조명</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#D35400'}}></span>
                <span>줌 사운드 레코더</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#E67E22'}}></span>
                <span>현장답사용 마이크리시버</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#34495E'}}></span>
                <span>전자칠판</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#7F8C8D'}}></span>
                <span>노트북</span>
              </div>
            </div>
          </div>
          
          <div className="legend-section">
            <h4>메이커스페이스</h4>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#9b59b6'}}></span>
                <span>3D프린터01</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{backgroundColor: '#E74C3C'}}></span>
                <span>레이저각인기</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={getInitialView()}
        views={{
          timeGridWeek: {
            buttonText: '주',
          },
          dayGridMonth: {
            buttonText: '월',
          },
          timeGridFourDay: {
            type: 'timeGrid',
            duration: { days: 4 },
            buttonText: '4일',
          },
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridFourDay,timeGridDay',
        }}
        events={events}
        locale="ko" // 한글 설정
        buttonText={{
          today: '오늘',
          month: '월',
          week: '주',
          day: '일',
        }}
        allDaySlot={false}
        slotMinTime="09:00:00"
        slotMaxTime="18:00:00"
        height="auto"
        displayEventTime={false}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
      />
      
      {token && recentReservations.length > 0 && (
        <div className="recent-reservations-container">
          <h2>최근 예약 10건</h2>
          <div className="recent-reservations-list">
            {recentReservations.map((reservation, index) => {
              let userInfo = {};
              try {
                userInfo = JSON.parse(reservation.notes || '{}');
              } catch (e) {
                userInfo = {};
              }
              
              const startDate = new Date(reservation.start);
              const endDate = new Date(reservation.end);
              const createdAt = reservation.createdAt ? new Date(reservation.createdAt) : null;
              
              // 기본 옵션 정의 (label로 카테고리 판단용)
              const spaceLabels = ['이메리얼룸01', '이메리얼룸02', '창작방앗간', '공존', '휴관'];
              const equipmentLabels = ['니콘 DSLR 카메라', '소니 캠코더', '360 카메라(교내연구소만 가능)', 'LED 조명', '줌 사운드 레코더', '현장답사용 마이크리시버', '전자칠판', '노트북'];
              const makerSpaceLabels = ['3D프린터01', '3D프린터02', '레이저각인기'];
              
              // reservation.spaces를 카테고리별로 분류
              const spaces = reservation.spaces ? reservation.spaces.filter(item => spaceLabels.includes(item)) : [];
              const equipment = reservation.spaces ? reservation.spaces.filter(item => equipmentLabels.includes(item)) : [];
              const makerSpaces = reservation.spaces ? reservation.spaces.filter(item => makerSpaceLabels.includes(item)) : [];
              
              return (
                <div key={reservation._id} className="recent-reservation-item">
                  <div className="recent-item-number">{index + 1}</div>
                  <div className="recent-item-content">
                    <div className="recent-item-header">
                      <span className="recent-item-date">
                        {startDate.toLocaleDateString('ko-KR')} {startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {createdAt && (
                        <span className="recent-item-created">
                          신청: {createdAt.toLocaleDateString('ko-KR')} {createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="recent-item-info">
                      <strong>{userInfo.name || '이름 없음'}</strong> | {userInfo.department || '소속 없음'}
                    </div>
                    <div className="recent-item-details">
                      {spaces.length > 0 && (
                        <span className="recent-item-tag">공간: {spaces.join(', ')}</span>
                      )}
                      {equipment.length > 0 && (
                        <span className="recent-item-tag">장비: {equipment.join(', ')}</span>
                      )}
                      {makerSpaces.length > 0 && (
                        <span className="recent-item-tag">메이커스페이스: {makerSpaces.join(', ')}</span>
                      )}
                    </div>
                    {userInfo.contact && (
                      <div className="recent-item-contact">연락처: {userInfo.contact}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {token && <ReservationForm onAddEvent={handleAddEvent} />}

      {isModalOpen && selectedEvent && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>예약 상세 정보</h3>
            <p><strong>날짜:</strong> {selectedEvent.start.toLocaleDateString('ko-KR')}</p>
            <p><strong>시간대:</strong> {selectedEvent.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - {selectedEvent.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>예약내용:</strong> {selectedEvent.title}</p>
            {token && selectedEvent.extendedProps.userInfo.name && (
              <p><strong>신청자:</strong> {selectedEvent.extendedProps.userInfo.name}</p>
            )}
            {token && selectedEvent.extendedProps.userInfo.department && (
              <p><strong>학과:</strong> {selectedEvent.extendedProps.userInfo.department}</p>
            )}
            {token && selectedEvent.extendedProps.userInfo.contact && (
              <p><strong>연락처:</strong> {selectedEvent.extendedProps.userInfo.contact}</p>
            )}
            <div className="modal-buttons">
              <button onClick={closeModal} className="btn-close-modal">닫기</button>
              {token && (
                <button onClick={handleDeleteReservation} className="btn-delete-modal">삭제</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showReservationForm && (
        <SpaceReservationForm 
          onClose={closeReservationForm} 
          onReservationAdded={handleAddEvent}
        />
      )}

      {showTrainedUserManage && (
        <TrainedUserManage onClose={closeTrainedUserManage} />
      )}

      {showOptionManage && (
        <ReservationOptionManage onClose={closeOptionManage} />
      )}

    </div>
  );
}

export default Reservation; 