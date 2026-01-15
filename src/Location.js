import React, { useEffect, useRef } from 'react';
import './Location.css';

// 카카오 지도 API 키 (JavaScript 키)
const KAKAO_APP_KEY = '072a98b82dd39ad4ac6cc381d32b0fac';
// 한국전통문화대학교 온지관 좌표
const center = { lat: 36.3077, lng: 126.8960 };

function Location() {
  const mapRef = useRef(null);

  useEffect(() => {
    // 이미 카카오 맵 스크립트가 로드되어 있는지 확인
    if (window.kakao && window.kakao.maps) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => {
        initializeMap();
      });
    };
    script.onerror = () => {
      console.error('카카오 지도 API 스크립트 로드에 실패했습니다.');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;

    try {
      const mapOption = {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: 3, // 확대 레벨 (숫자가 작을수록 확대)
      };

      const map = new window.kakao.maps.Map(mapRef.current, mapOption);

      // 마커 추가
      const markerPosition = new window.kakao.maps.LatLng(center.lat, center.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
      });
      marker.setMap(map);

      // 인포윈도우 추가
      const infowindow = new window.kakao.maps.InfoWindow({
        content: '<div style="padding:5px;font-size:12px;">디지털도화서</div>',
      });
      infowindow.open(map, marker);

    } catch (error) {
      console.error('지도 초기화 중 오류 발생:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>오시는 길</h1>
      </div>
      <div className="location-content">
        <div className="location-map" ref={mapRef} style={{ minHeight: 450 }} />
        <div className="location-info">
          <h2>디지털도화서 정보</h2>
          <p><strong>주소:</strong> 충청남도 부여군 규암면 백제문로 367-2</p>
          <p><strong>장소:</strong> 온지관 207호 디지털도화서</p>
          <p><strong>전화:</strong> 041-830-7189</p>
          <p><strong>운영시간:</strong> 평일 10:00-17:00(주말 및 공휴일 휴무)</p>
        </div>
      </div>
    </div>
  );
}

export default Location; 