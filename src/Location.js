import React, { useEffect, useRef } from 'react';
import './Location.css';

const NAVER_CLIENT_ID = '7ogmif84uh';
const center = { lat: 36.308555, lng: 126.899024 };

function Location() {
  const mapRef = useRef(null);

  useEffect(() => {
    // 인증 실패 콜백 함수 정의
    window.navermap_authFailure = function() {
      console.error('네이버 지도 API 인증에 실패했습니다. Client ID를 확인해주세요.');
      console.error('현재 도메인:', window.location.origin);
      console.error('www 없이 접속해주세요: https://knuh-ditdo.kr');
    };

    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => {
      if (window.naver && window.naver.maps) {
        try {
          // eslint-disable-next-line no-undef
          const map = new window.naver.maps.Map(mapRef.current, {
            center: new window.naver.maps.LatLng(center.lat, center.lng),
            zoom: 15,
          });
          // 마커 추가
          // eslint-disable-next-line no-undef
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(center.lat, center.lng),
            map,
          });
        } catch (error) {
          console.error('지도 초기화 중 오류 발생:', error);
          // www 도메인으로 접속한 경우 안내 메시지 표시
          if (window.location.hostname.includes('www.')) {
            alert('지도 로딩에 문제가 있습니다. www 없이 접속해주세요: https://knuh-ditdo.kr');
          }
        }
      } else {
        console.error('네이버 지도 API가 로드되지 않았습니다.');
        // www 도메인으로 접속한 경우 안내 메시지 표시
        if (window.location.hostname.includes('www.')) {
          alert('지도 로딩에 문제가 있습니다. www 없이 접속해주세요: https://knuh-ditdo.kr');
        }
      }
    };
    script.onerror = () => {
      console.error('네이버 지도 API 스크립트 로드에 실패했습니다.');
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

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