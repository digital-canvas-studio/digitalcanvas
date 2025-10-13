import React, { useState, useEffect, useContext } from 'react';
import './SpaceReservationForm.css';
import AuthContext from './context/AuthContext';

function SpaceReservationForm({ onClose, onReservationAdded }) {
  const { user } = useContext(AuthContext);
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 동적으로 로드되는 옵션
  const [spaceOptions, setSpaceOptions] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [makerSpaceOptions, setMakerSpaceOptions] = useState([]);

  // 기본 옵션 (DB에 없을 경우 대비)
  const defaultSpaceOptions = [
    { value: 'emeral-room-01', label: '이메리얼룸01' },
    { value: 'emeral-room-02', label: '이메리얼룸02' },
    { value: 'creative-workshop', label: '창작방앗간' },
    { value: 'coexistence', label: '공존' }
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

  const defaultMakerSpaceOptions = [
    { value: '3d-printer-01', label: '3D프린터01' },
    { value: 'laser-engraver', label: '레이저각인기' }
  ];

  // 옵션 로드
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [spaceRes, equipRes, makerRes] = await Promise.all([
          fetch('http://localhost:3001/api/reservation-options?category=space'),
          fetch('http://localhost:3001/api/reservation-options?category=equipment'),
          fetch('http://localhost:3001/api/reservation-options?category=makerspace')
        ]);

        const spaceData = await spaceRes.json();
        const equipData = await equipRes.json();
        const makerData = await makerRes.json();

        // DB 데이터와 기본 데이터 합치기 (중복 제거)
        const mergeOptions = (dbOptions, defaultOptions) => {
          const merged = [...defaultOptions];
          dbOptions.forEach(dbOpt => {
            if (!merged.find(opt => opt.value === dbOpt.value)) {
              merged.push(dbOpt);
            }
          });
          return merged;
        };

        // 공간대여에서는 휴관 제외하고 이름순 정렬
        const spaceOptionsFiltered = mergeOptions(spaceData, defaultSpaceOptions)
          .filter(opt => opt.value !== 'closed')
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        // 장비와 메이커스페이스도 이름순 정렬
        const equipmentOptionsSorted = mergeOptions(equipData, defaultEquipmentOptions)
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        const makerSpaceOptionsSorted = mergeOptions(makerData, defaultMakerSpaceOptions)
          .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
        
        setSpaceOptions(spaceOptionsFiltered);
        setEquipmentOptions(equipmentOptionsSorted);
        setMakerSpaceOptions(makerSpaceOptionsSorted);
      } catch (error) {
        console.error('Error fetching options:', error);
        // 에러 시 기본 옵션 사용 (휴관 제외)
        setSpaceOptions(defaultSpaceOptions.filter(opt => opt.value !== 'closed'));
        setEquipmentOptions(defaultEquipmentOptions);
        setMakerSpaceOptions(defaultMakerSpaceOptions);
      }
    };

    fetchOptions();
  }, []);

  // 시간 옵션 생성 (30분 단위, 오전 10시부터 시작)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 10; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) continue; // 18:00까지만
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = hour < 12 ? `오전 ${hour}:${minute.toString().padStart(2, '0')}` : 
                           hour === 12 ? `오후 12:${minute.toString().padStart(2, '0')}` : 
                           `오후 ${hour - 12}:${minute.toString().padStart(2, '0')}`;
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();


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
    
    // 필수 필드 검증
    if (!formData.name) {
      alert('이름을 입력해주세요.');
      return;
    }
    
    if (!formData.department) {
      alert('학과 및 소속을 입력해주세요.');
      return;
    }
    
    if (!formData.contact) {
      alert('연락처를 입력해주세요.');
      return;
    }
    
    if (!formData.reservationDate) {
      alert('예약날짜를 선택해주세요.');
      return;
    }
    
    if (!formData.startTime) {
      alert('시작시간을 선택해주세요.');
      return;
    }
    
    if (!formData.endTime) {
      alert('종료시간을 선택해주세요.');
      return;
    }

    if (formData.spaceTypes.length === 0 && formData.equipmentTypes.length === 0 && formData.makerSpaceTypes.length === 0) {
      alert('공간대여, 장비대여, 메이커스페이스 중 하나는 선택해주세요.');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      alert('종료시간은 시작시간보다 늦어야 합니다.');
      return;
    }

    // 주말(토요일, 일요일) 확인
    const requestDate = new Date(formData.reservationDate);
    const dayOfWeek = requestDate.getDay(); // 0: 일요일, 6: 토요일
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      alert('디지털도화서는 주말과 공휴일에는 운영하지 않습니다.');
      return;
    }

    // 공휴일 체크 (간단한 버전 - 필요시 확장 가능)
    const holidays = [
      '2025-01-01', // 신정
      '2025-03-01', // 삼일절
      '2025-05-05', // 어린이날
      '2025-06-06', // 현충일
      '2025-08-15', // 광복절
      '2025-10-03', // 개천절
      '2025-10-09', // 한글날
      '2025-12-25', // 크리스마스
      // 필요시 추가
    ];
    
    const requestDateStr = formData.reservationDate;
    if (holidays.includes(requestDateStr)) {
      alert('디지털도화서는 주말과 공휴일에는 운영하지 않습니다.');
      return;
    }

    // 예약 날짜가 5일 이내인지 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDifference = Math.ceil((requestDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 5) {
      alert('5일이내 기간에 신청가능합니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 기존 예약 확인
      const checkResponse = await fetch('http://localhost:3001/api/schedules');
      const existingReservations = await checkResponse.json();

      // 휴관일 체크
      const requestDate = new Date(formData.reservationDate);
      const isClosedDay = existingReservations.some(reservation => {
        const reservationDate = new Date(reservation.start);
        
        // 같은 날짜인지 확인
        if (reservationDate.toDateString() !== requestDate.toDateString()) {
          return false;
        }

        // 휴관인지 확인
        let isClosed = false;
        try {
          const notes = JSON.parse(reservation.notes || '{}');
          if (notes.spaceTypes && notes.spaceTypes.includes('closed')) {
            isClosed = true;
          }
        } catch (e) {
          // 기존 형식 확인
          if (reservation.spaces && reservation.spaces.includes('휴관')) {
            isClosed = true;
          }
          if (reservation.title && reservation.title.includes('휴관')) {
            isClosed = true;
          }
        }

        return isClosed;
      });

      if (isClosedDay) {
        alert('디지털도화서 휴관일입니다.');
        setIsSubmitting(false);
        return;
      }

      // 신청하려는 시간과 예약 내용
      const requestStart = new Date(`${formData.reservationDate}T${formData.startTime}:00`);
      const requestEnd = new Date(`${formData.reservationDate}T${formData.endTime}:00`);
      const requestedItems = [
        ...formData.spaceTypes,
        ...formData.equipmentTypes,
        ...formData.makerSpaceTypes
      ];

      // 중복 체크
      const hasConflict = existingReservations.some(reservation => {
        const reservationStart = new Date(reservation.start);
        const reservationEnd = new Date(reservation.end);

        // 같은 날짜인지 확인
        if (reservationStart.toDateString() !== requestStart.toDateString()) {
          return false;
        }

        // 시간이 겹치는지 확인
        const timeOverlap = (
          (requestStart >= reservationStart && requestStart < reservationEnd) ||
          (requestEnd > reservationStart && requestEnd <= reservationEnd) ||
          (requestStart <= reservationStart && requestEnd >= reservationEnd)
        );

        if (!timeOverlap) {
          return false;
        }

        // notes에서 예약 내용 파싱
        let reservedItems = [];
        try {
          const notes = JSON.parse(reservation.notes || '{}');
          if (notes.spaceTypes) reservedItems = reservedItems.concat(notes.spaceTypes);
          if (notes.equipmentTypes) reservedItems = reservedItems.concat(notes.equipmentTypes);
          if (notes.makerSpaceTypes) reservedItems = reservedItems.concat(notes.makerSpaceTypes);
        } catch (e) {
          // 기존 형식의 예약 (spaces, equipment 필드 사용)
          if (reservation.spaces) {
            // spaces 배열의 각 항목을 value로 변환해야 함
            reservation.spaces.forEach(spaceName => {
              const matchingSpace = spaceOptions.find(opt => opt.label === spaceName);
              if (matchingSpace) reservedItems.push(matchingSpace.value);
            });
          }
          if (reservation.equipment) {
            reservation.equipment.forEach(equipName => {
              const matchingEquip = equipmentOptions.find(opt => opt.label === equipName);
              if (matchingEquip) reservedItems.push(matchingEquip.value);
              const matchingMaker = makerSpaceOptions.find(opt => opt.label === equipName);
              if (matchingMaker) reservedItems.push(matchingMaker.value);
              
              // 3D프린터 통합 처리
              if (equipName.includes('3D프린터') || equipName.includes('3d프린터')) {
                reservedItems.push('3d-printer-01'); // 모든 3D프린터 항목을 대표값으로 추가
              }
              // 레이저각인기 통합 처리
              if (equipName.includes('레이저각인기') || equipName.includes('레이저')) {
                reservedItems.push('laser-engraver'); // 모든 레이저각인기 항목을 대표값으로 추가
              }
            });
          }
        }

        // 예약 내용이 겹치는지 확인 (3D프린터 및 레이저각인기는 통합 체크)
        const itemOverlap = requestedItems.some(item => {
          // 3D프린터 계열 체크
          if (item.includes('3d-printer') || item.includes('printer')) {
            return reservedItems.some(reserved => 
              reserved.includes('3d-printer') || reserved.includes('printer')
            );
          }
          // 레이저각인기 계열 체크
          if (item.includes('laser') || item.includes('engraver')) {
            return reservedItems.some(reserved => 
              reserved.includes('laser') || reserved.includes('engraver')
            );
          }
          // 일반 항목 체크
          return reservedItems.includes(item);
        });

        return itemOverlap;
      });

      if (hasConflict) {
        alert('중복신청되었습니다. 다시 선택하세요.');
        setIsSubmitting(false);
        return;
      }

      // 메이커스페이스 교육 이수 여부 확인
      if (formData.makerSpaceTypes.length > 0) {
        for (const makerSpaceType of formData.makerSpaceTypes) {
          const checkResponse = await fetch('http://localhost:3001/api/trained-users/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: formData.name,
              equipmentType: makerSpaceType
            })
          });

          const result = await checkResponse.json();
          if (!result.isTrained) {
            const makerSpaceLabel = getSelectedLabel(makerSpaceOptions, makerSpaceType);
            alert(`장비교육을 이수해야합니다. (${makerSpaceLabel})`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 메이커스페이스 일주일 2회 제한 확인 (3D프린터, 레이저각인기 통합)
      if (formData.makerSpaceTypes.length > 0) {
        // 신청하려는 날짜의 일주일 범위 계산 (해당 주의 월요일 ~ 일요일)
        const requestDateObj = new Date(formData.reservationDate);
        const dayOfWeek = requestDateObj.getDay(); // 0 (일요일) ~ 6 (토요일)
        
        // 해당 주의 월요일 계산
        const weekStart = new Date(requestDateObj);
        weekStart.setDate(requestDateObj.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        weekStart.setHours(0, 0, 0, 0);
        
        // 해당 주의 일요일 계산
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // 3D프린터와 레이저각인기를 구분하여 체크
        const has3dPrinter = formData.makerSpaceTypes.some(type => 
          type.includes('3d-printer') || type.includes('printer')
        );
        const hasLaser = formData.makerSpaceTypes.some(type => 
          type.includes('laser') || type.includes('engraver')
        );

        // 3D프린터 계열 2회 제한 확인
        if (has3dPrinter) {
          // 이번 주에 3D프린터 신청 횟수 계산 (각 항목을 개별 카운트)
          let printer3dCount = 0;
          
          existingReservations.forEach(reservation => {
            const reservationDate = new Date(reservation.start);
            
            // 같은 주인지 확인
            if (reservationDate < weekStart || reservationDate > weekEnd) {
              return;
            }

            // 3D프린터 계열 개수 카운트
            let count = 0;
            try {
              const notes = JSON.parse(reservation.notes || '{}');
              if (notes.makerSpaceTypes && notes.makerSpaceTypes.length > 0) {
                count = notes.makerSpaceTypes.filter(type => 
                  type.includes('3d-printer') || type.includes('printer')
                ).length;
              }
            } catch (e) {
              // 기존 형식 확인
              if (reservation.equipment) {
                count = reservation.equipment.filter(item => 
                  item.includes('3D프린터') || item.includes('3d프린터')
                ).length;
              }
              if (reservation.spaces) {
                count += reservation.spaces.filter(item => 
                  item.includes('3D프린터') || item.includes('3d프린터')
                ).length;
              }
            }

            printer3dCount += count;
          });

          // 현재 신청하려는 3D프린터 개수 추가
          const currentPrinter3dCount = formData.makerSpaceTypes.filter(type => 
            type.includes('3d-printer') || type.includes('printer')
          ).length;

          if (printer3dCount + currentPrinter3dCount > 2) {
            alert('3D프린터는 일주일에 2회이상 신청불가합니다.');
            setIsSubmitting(false);
            return;
          }
        }

        // 레이저각인기 계열 2회 제한 확인
        if (hasLaser) {
          // 이번 주에 레이저각인기 신청 횟수 계산 (각 항목을 개별 카운트)
          let laserCount = 0;
          
          existingReservations.forEach(reservation => {
            const reservationDate = new Date(reservation.start);
            
            // 같은 주인지 확인
            if (reservationDate < weekStart || reservationDate > weekEnd) {
              return;
            }

            // 레이저각인기 계열 개수 카운트
            let count = 0;
            try {
              const notes = JSON.parse(reservation.notes || '{}');
              if (notes.makerSpaceTypes && notes.makerSpaceTypes.length > 0) {
                count = notes.makerSpaceTypes.filter(type => 
                  type.includes('laser') || type.includes('engraver')
                ).length;
              }
            } catch (e) {
              // 기존 형식 확인
              if (reservation.equipment) {
                count = reservation.equipment.filter(item => 
                  item.includes('레이저각인기') || item.includes('레이저')
                ).length;
              }
              if (reservation.spaces) {
                count += reservation.spaces.filter(item => 
                  item.includes('레이저각인기') || item.includes('레이저')
                ).length;
              }
            }

            laserCount += count;
          });

          // 현재 신청하려는 레이저각인기 개수 추가
          const currentLaserCount = formData.makerSpaceTypes.filter(type => 
            type.includes('laser') || type.includes('engraver')
          ).length;

          if (laserCount + currentLaserCount > 2) {
            alert('레이저각인기는 일주일에 2회이상 신청불가합니다.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 예약 데이터 생성
      const allSelectedTypes = [
        ...formData.spaceTypes.map(type => getSelectedLabel(spaceOptions, type)),
        ...formData.equipmentTypes.map(type => getSelectedLabel(equipmentOptions, type)),
        ...formData.makerSpaceTypes.map(type => getSelectedLabel(makerSpaceOptions, type))
      ].filter(Boolean);

      const reservationData = {
        title: `공간예약신청 - ${formData.name}`,
        start: new Date(`${formData.reservationDate}T${formData.startTime}:00`).toISOString(),
        end: new Date(`${formData.reservationDate}T${formData.endTime}:00`).toISOString(),
        type: 'space',
        spaces: allSelectedTypes,
        equipment: [],
        notes: JSON.stringify({
          name: formData.name,
          department: formData.department,
          contact: formData.contact,
          spaceTypes: formData.spaceTypes,
          equipmentTypes: formData.equipmentTypes,
          makerSpaceTypes: formData.makerSpaceTypes
        })
      };

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 토큰이 있으면 추가 (선택사항)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:3001/api/schedules', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(reservationData)
      });

      if (!response.ok) {
        throw new Error('예약 신청에 실패했습니다.');
      }

      alert('공간예약신청이 완료되었습니다.');
      
      // 예약 현황 업데이트
      if (onReservationAdded) {
        onReservationAdded();
      }
      
      onClose();
    } catch (error) {
      console.error('Reservation error:', error);
      alert(error.message || '예약 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  return (
    <div className="space-reservation-form-overlay">
      <div className="space-reservation-form-container">
        <div className="form-header">
          <h2>공간예약신청</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-reservation-form">
          {/* 1. 이름 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 1. 이름
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              placeholder=""
              required
            />
          </div>

          {/* 2. 학과 및 소속 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 2. 학과 및 소속
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="form-input"
              placeholder=""
              required
            />
          </div>

          {/* 3. 연락처 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 3. 연락처
            </label>
            <div className="info-notice">
              예약상세정보에 핸드폰번호 마지막4자리가 표시됩니다.
            </div>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="form-input"
              placeholder=""
              required
            />
          </div>

          {/* 4. 예약날짜 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 4. 예약날짜
            </label>
            <div className="time-info">
              3D프린터는 1회당 4시간/레이저각인기 1회당 2시간(1인당 주 2회로 제한됩니다.)
            </div>
            <div className="date-input-wrapper">
              <input
                type="date"
                name="reservationDate"
                value={formData.reservationDate}
                onChange={handleInputChange}
                className="form-input date-input-field"
                required
              />
            </div>
          </div>

          {/* 5. 시작시간 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 5. 시작시간
            </label>
            <div className="time-select-wrapper">
              <select
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="form-select time-select"
                required
              >
                <option value="">시간 선택</option>
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 6. 종료시간 */}
          <div className="form-section">
            <label className="section-label">
              <span className="required">*</span> 6. 종료시간
            </label>
            <div className="time-select-wrapper">
              <select
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="form-select time-select"
                required
              >
                <option value="">시간 선택</option>
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. 공간대여 */}
          <div className="form-section">
            <label className="section-label">7. 공간대여</label>
            <div className="checkbox-group">
              {spaceOptions.map(option => (
                <div key={option.value} className="checkbox-item">
                  <input
                    type="checkbox"
                    name="spaceTypes"
                    id={`space-${option.value}`}
                    value={option.value}
                    checked={formData.spaceTypes.includes(option.value)}
                    onChange={() => handleCheckboxChange('spaceTypes', option.value)}
                  />
                  <label htmlFor={`space-${option.value}`}>{option.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* 8. 장비대여 */}
          <div className="form-section">
            <label className="section-label">8. 장비대여</label>
            <div className="checkbox-group">
              {equipmentOptions.map(option => (
                <div key={option.value} className="checkbox-item">
                  <input
                    type="checkbox"
                    name="equipmentTypes"
                    id={`equipment-${option.value}`}
                    value={option.value}
                    checked={formData.equipmentTypes.includes(option.value)}
                    onChange={() => handleCheckboxChange('equipmentTypes', option.value)}
                  />
                  <label htmlFor={`equipment-${option.value}`}>{option.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* 9. 메이커스페이스 */}
          <div className="form-section">
            <label className="section-label">9. 메이커스페이스</label>
            <div className="checkbox-group">
              {makerSpaceOptions.map(option => (
                <div key={option.value} className="checkbox-item">
                  <input
                    type="checkbox"
                    name="makerSpaceTypes"
                    id={`maker-${option.value}`}
                    value={option.value}
                    checked={formData.makerSpaceTypes.includes(option.value)}
                    onChange={() => handleCheckboxChange('makerSpaceTypes', option.value)}
                  />
                  <label htmlFor={`maker-${option.value}`}>{option.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* 개인정보 처리 안내 */}
          <div className="privacy-notice">
            *모든 개인정보는 신청한 달이 지나면 자동 삭제됩니다.
          </div>

          {/* 제출 버튼 */}
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '신청 중...' : '신청하기'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SpaceReservationForm;
