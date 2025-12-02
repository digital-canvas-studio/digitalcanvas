import React, { useState, useEffect, useContext, useRef } from 'react';
import './Home.css';
import AuthContext from './context/AuthContext';
import api from './api';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';

gsap.registerPlugin(ScrollTrigger);

function TiptapToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div className="tiptap-toolbar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}><b>B</b></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><i>I</i></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}>H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''}>좌</button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''}>가</button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''}>우</button>
      <button type="button" onClick={() => {
        const url = window.prompt('이미지 주소(URL)를 입력하세요');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }}>이미지</button>
    </div>
  );
}

function Home() {
  const [about, setAbout] = useState({ title: '', content: '' });
  const { token } = useContext(AuthContext);
  const heroRef = useRef(null);
  const aboutCardRef = useRef(null);
  const featuresRef = useRef([]);
  const [popup, setPopup] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 임시: 관리자인 경우 true로 가정
  const isAdmin = true;

  // 카드 메시지/버튼 상태
  const [mainText, setMainText] = useState('DIGITAL CANVAS');
  const [subText, setSubText] = useState('모든 디지털 창작, 한 곳에서.');
  const [btn1, setBtn1] = useState('공간 둘러보기');
  const [btn2, setBtn2] = useState('프로그램 보기');
  const [btn1Link, setBtn1Link] = useState('');
  const [btn2Link, setBtn2Link] = useState('');
  const [snsLink, setSnsLink] = useState('https://www.instagram.com/digitalcanvas_knuh/');
  const [editMode, setEditMode] = useState(false);

  // 임시 저장용
  const [editMain, setEditMain] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editBtn1, setEditBtn1] = useState('');
  const [editBtn2, setEditBtn2] = useState('');
  const [editBtn1Link, setEditBtn1Link] = useState('');
  const [editBtn2Link, setEditBtn2Link] = useState('');
  const [editSnsLink, setEditSnsLink] = useState('');
  const [editContent, setEditContent] = useState('');

  // 이미지 상태 추가
  const [mainImage, setMainImage] = useState('http://nodetree.cafe24.com/%B5%F0%C1%F6%C5%D0%B5%B5%C8%AD%BC%AD/main.png');
  const [editMainImage, setEditMainImage] = useState('');

  // Tiptap 에디터 인스턴스
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit에 포함된 기능 중 heading만 커스텀 설정
        heading: {
          levels: [1, 2],
        },
      }),
      Image,
      Placeholder.configure({ placeholder: '소개글을 입력하세요...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: editContent,
    onUpdate: ({ editor }) => {
      setEditContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'edit-input edit-contentarea tiptap-content',
      },
    },
  });

  useEffect(() => {
    // 병렬로 API 호출하여 로딩 시간 단축
    Promise.all([
      fetchAbout(),
      fetchActivePopup()
    ]).catch(error => {
      console.error('Initial data fetch error:', error);
    });
  }, []);

  const fetchActivePopup = async () => {
    try {
      const response = await api.get('/api/popups/active', {
        timeout: 30000 // 30초 타임아웃
      });
      const data = response.data;
      console.log('Loaded popup:', data);
      
      // imageUrl과 imageUrls를 합치기
      if (data && data._id) {
        const allImages = [];
        if (data.imageUrl) {
          allImages.push(data.imageUrl);
        }
        if (data.imageUrls && data.imageUrls.length > 0) {
          allImages.push(...data.imageUrls);
        }
        
        // 합쳐진 이미지 배열을 imageUrls로 설정
        const mergedData = {
          ...data,
          imageUrls: allImages.length > 0 ? allImages : data.imageUrls
        };
        
        console.log('Merged images:', allImages);
        
        const hasClosedToday = localStorage.getItem(`popup_closed_${data._id}`);
        if (!hasClosedToday) {
          setPopup(mergedData);
          setShowPopup(true);
          setCurrentImageIndex(0); // 인덱스 초기화
        }
      }
    } catch (error) {
      // 팝업 로드 실패는 치명적이지 않으므로 조용히 처리
      if (error.code !== 'ECONNABORTED' && !error.message.includes('timeout')) {
        console.error('팝업 로드 실패:', error);
      }
    }
  };

  useEffect(() => {
    // Hero 섹션 페이드인
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }
      );
    }
    // 소개 카드 애니메이션
    if (aboutCardRef.current) {
      gsap.fromTo(
        aboutCardRef.current,
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: aboutCardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }
    // 주요 서비스 카드 애니메이션
    featuresRef.current.forEach((el, i) => {
      if (el) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 60, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            delay: 0.1 * i,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });
  }, [about]);

  useEffect(() => {
    // about 데이터가 바뀌면 상태 반영
    if (about) {
      setMainText(about.mainText || 'DIGITAL CANVAS');
      setSubText(about.subText || '모든 디지털 창작, 한 곳에서.');
      setBtn1(about.btn1 || '공간 둘러보기');
      setBtn2(about.btn2 || '프로그램 보기');
      setBtn1Link(about.btn1Link || '');
      setBtn2Link(about.btn2Link || '');
      setSnsLink(about.snsLink || 'https://www.instagram.com/digitalcanvas_knuh/');
      setMainImage(about.mainImage || 'http://nodetree.cafe24.com/%B5%F0%C1%F6%C5%D0%B5%B5%C8%AD%BC%AD/main.png');
    }
  }, [about]);

  const fetchAbout = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/abouts', {
        timeout: 30000 // 30초 타임아웃
      });
      setAbout(response.data);
    } catch (error) {
      console.error("About 데이터 로딩 실패:", error);
      // 타임아웃이나 네트워크 오류 시 기본값 설정
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('서버 응답 시간 초과 - 기본값 사용');
      }
      if (error.response && error.response.status === 404) {
        setAbout({ title: '디지털도화서란?', content: '<p>누구나 자유롭게 창작하고, 디지털로 소통하는 열린 공간입니다.</p>' });
      } else {
        setAbout({ title: '디지털도화서란?', content: '<p>데이터를 불러오는 중 문제가 발생했습니다.</p>' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setEditMain(mainText);
    setEditSub(subText);
    setEditBtn1(btn1);
    setEditBtn2(btn2);
    setEditBtn1Link(btn1Link);
    setEditBtn2Link(btn2Link);
    setEditSnsLink(snsLink);
    setEditContent(about.content || '');
    setEditMainImage(mainImage || '');
    if (editor) {
      editor.commands.setContent(about.content || '');
    }
    setEditMode(true);
  };
  const handleSave = async () => {
    // 서버에 저장
    try {
      const htmlContent = editor ? editor.getHTML() : editContent;
      const payload = {
        ...about,
        mainText: editMain,
        subText: editSub,
        btn1: editBtn1,
        btn2: editBtn2,
        btn1Link: editBtn1Link,
        btn2Link: editBtn2Link,
        snsLink: editSnsLink,
        mainImage: editMainImage,
        content: htmlContent,
      };
      
      const res = await api.put('/api/abouts', payload);

      setAbout(res.data);
      setEditMode(false);
    } catch (e) {
      alert('저장 중 오류 발생');
      console.error(e);
    }
  };
  const handleCancel = () => {
    setEditMode(false);
  };

  const closePopup = (dontShowToday = false) => {
    if (dontShowToday && popup) {
      localStorage.setItem(`popup_closed_${popup._id}`, 'true');
    }
    setShowPopup(false);
  };

  return (
    <div className="apple-main-root">
      {/* 팝업 모달 */}
      {showPopup && popup && (
        <div className="popup-overlay" onClick={() => closePopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => closePopup(false)}>×</button>
            <h2 className="popup-title">{popup.title}</h2>
            
            {/* 여러 이미지 슬라이드 */}
            {((popup.imageUrls && popup.imageUrls.length > 0) || popup.imageUrl) && (
              <div className="popup-image-wrapper">
                {popup.imageUrls && popup.imageUrls.length > 0 ? (
                  <>
                    <img 
                      src={popup.imageUrls[currentImageIndex]} 
                      alt={`${popup.title} ${currentImageIndex + 1}`} 
                      className="popup-image"
                      onError={(e) => {
                        console.error('Image load error:', popup.imageUrls[currentImageIndex]);
                        e.target.style.display = 'none';
                      }}
                    />
                    {popup.imageUrls.length > 1 && (
                      <>
                        <button 
                          className="popup-image-prev" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === 0 ? popup.imageUrls.length - 1 : prev - 1
                            );
                          }}
                        >
                          ◀
                        </button>
                        <button 
                          className="popup-image-next" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => 
                              prev === popup.imageUrls.length - 1 ? 0 : prev + 1
                            );
                          }}
                        >
                          ▶
                        </button>
                        <div className="popup-image-indicator">
                          {currentImageIndex + 1} / {popup.imageUrls.length}
                        </div>
                      </>
                    )}
                    {popup.imageUrls.length === 1 && (
                      <div className="popup-image-indicator">
                        1 / 1
                      </div>
                    )}
                  </>
                ) : popup.imageUrl && (
                  <img src={popup.imageUrl} alt={popup.title} className="popup-image" />
                )}
              </div>
            )}
            
            <div className="popup-message">{popup.message}</div>
            <div className="popup-actions">
              <button className="popup-btn-today" onClick={() => closePopup(true)}>
                오늘 하루 보지 않기
              </button>
              <button className="popup-btn-close" onClick={() => closePopup(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 카드 바깥 상단 타이틀/슬로건 */}
      <div className="apple-hero-header-row">
        <h1 className="apple-title">한국전통문화대학교</h1>
        <span className="apple-slogan">창의와 디지털이 만나는 공간</span>
      </div>
      {/* 대형 라운드 이미지/메시지 박스 */}
      <div className="apple-hero-box">
        <div className="apple-hero-flexrow">
          <div className="apple-hero-leftcol">
            {editMode ? (
              <>
                <input className="edit-input main" value={editMain} onChange={e => setEditMain(e.target.value)} />
                <input className="edit-input sub" value={editSub} onChange={e => setEditSub(e.target.value)} />
                {/* 이미지 URL 입력 및 미리보기 */}
                <div style={{margin:'1rem 0'}}>
                  <input className="edit-input img" value={editMainImage} onChange={e => setEditMainImage(e.target.value)} placeholder="대표 이미지 URL" style={{width: '80%'}} />
                  <div style={{marginTop:'0.5rem'}}>
                    <img src={editMainImage || 'https://via.placeholder.com/320x120?text=Digital+Canvas'} alt="미리보기" style={{maxWidth:320, maxHeight:120, borderRadius:8, border:'1px solid #eee'}} />
                  </div>
                </div>
                <div className="apple-hero-buttons">
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'0.5rem'}}>
                    <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                      <input className="edit-input btn" value={editBtn1} onChange={e => setEditBtn1(e.target.value)} placeholder="공간 둘러보기 텍스트" />
                      <input className="edit-input btn-link" value={editBtn1Link} onChange={e => setEditBtn1Link(e.target.value)} placeholder="공간 둘러보기 링크" style={{width:180}} />
                    </div>
                    <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                      <input className="edit-input btn" value={editBtn2} onChange={e => setEditBtn2(e.target.value)} placeholder="프로그램 보기 텍스트" />
                      <input className="edit-input btn-link" value={editBtn2Link} onChange={e => setEditBtn2Link(e.target.value)} placeholder="프로그램 보기 링크" style={{width:180}} />
                    </div>
                    <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                      <input className="edit-input btn-link" value={editSnsLink} onChange={e => setEditSnsLink(e.target.value)} placeholder="SNS 링크 (인스타그램 등)" style={{width:'100%', minWidth: 300}} />
                    </div>
                  </div>
                </div>
                <div className="edit-btn-row">
                  <button className="apple-btn" onClick={handleSave}>저장</button>
                  <button className="apple-btn outline" onClick={handleCancel}>취소</button>
                </div>
              </>
            ) : (
              <>
                <div className="apple-hero-maintext">{mainText}</div>
                <div className="apple-hero-subtext">{subText}</div>
                <img
                  src={mainImage}
                  alt="디지털캔버스 대표 이미지"
                  className="apple-hero-mainimg"
                  onError={e => { e.target.onerror=null; e.target.src='https://via.placeholder.com/320x120?text=Digital+Canvas'; }}
                />
                <div className="apple-hero-buttons">
                  {btn1Link ? (
                    <a href={btn1Link} target="_blank" rel="noopener noreferrer" className="apple-btn">{btn1}</a>
                  ) : (
                    <button className="apple-btn">{btn1}</button>
                  )}
                  {btn2Link ? (
                    <a href={btn2Link} target="_blank" rel="noopener noreferrer" className="apple-btn outline">{btn2}</a>
                  ) : (
                    <button className="apple-btn outline">{btn2}</button>
                  )}
                  {snsLink && (
                    <a 
                      href={snsLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="apple-btn sns-btn"
                    >
                      SNS 바로가기
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="apple-hero-rightcol">
            {isLoading && !editMode ? (
              <div className="loading-text-home">
                Loading...
              </div>
            ) : (
              <>
                {!editMode && about.content && (
                  <div
                    className="apple-hero-about-html"
                    dangerouslySetInnerHTML={{ __html: about.content }}
                  />
                )}
                {editMode && editor && (
                  <div className="tiptap-editor-wrap">
                    <TiptapToolbar editor={editor} />
                    <EditorContent editor={editor} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* 편집 버튼: 로그인+관리자만 카드 밖에 노출 */}
      {!editMode && isAdmin && token && (
        <div style={{textAlign:'center', margin:'1.5rem 0 2.5rem 0'}}>
          <button className="apple-btn" onClick={handleEdit}>편집</button>
        </div>
      )}

      {/* 한 줄 메시지 섹션 */}
      <section className="apple-section">
        <h2 className="apple-headline">모든 디지털 콘텐츠 작업을 한곳에서</h2>
        <p className="apple-desc">
          아이디어 기획, 디지털 목업, 사진·영상 촬영, 교육콘텐츠 제작까지<br/>
          모든 과정을 한 공간에서 경험하세요.
        </p>
      </section>

      {/* 4개 서비스 카드 섹션 */}
      <section className="apple-section">
        <div className="apple-feature-row">
          <div className="circle-card"><span className="circle-label">기획 & 융합</span></div>
          <div className="circle-card"><span className="circle-label">디지털 목업</span></div>
          <div className="circle-card"><span className="circle-label">미디어<br/>콘텐츠제작</span></div>
          <div className="circle-card"><span className="circle-label">교육<br/>콘텐츠제작</span></div>
        </div>
      </section>
    </div>
  );
}

export default Home; 