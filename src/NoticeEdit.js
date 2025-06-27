import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import './HomeEdit.css'; // 스타일 재사용
import api from './api';

const MenuBar = ({ editor, onImageInsertClick }) => {
  if (!editor) {
    return null;
  }
  return (
    <div className="menu-bar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
      <button type="button" onClick={onImageInsertClick}>이미지 추가</button>
    </div>
  );
};

function NoticeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [isImageUrlInputVisible, setIsImageUrlInputVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: { levels: [1, 2] },
      }),
      Image,
      Placeholder.configure({ placeholder: '여기에 내용을 입력하세요...' }),
    ],
    content: '',
  });

  useEffect(() => {
    if (!id || !editor) return;
    const fetchNotice = async () => {
      try {
        const response = await api.get(`/api/notices/${id}`);
        const data = response.data;
        setTitle(data.title);
        editor.commands.setContent(data.content);
      } catch (error) {
        console.error('Error fetching notice data:', error);
        alert('공지사항 정보를 불러오는데 실패했습니다.');
        navigate('/notice'); // 에러 발생 시 목록으로
      }
    };
    fetchNotice();
  }, [id, editor, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/notices/${id}`, { title, content: editor.getHTML() });
      alert('공지사항이 성공적으로 수정되었습니다.');
      navigate(`/notice/${id}`);
    } catch (error) {
      console.error('Error updating notice data:', error);
      alert('수정에 실패했습니다.');
    }
  };

  const handleInsertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setIsImageUrlInputVisible(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="edit-title">공지사항 수정</h1>
      <form onSubmit={handleSubmit} className="about-edit-form">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <div className="editor-container">
            {editor && <MenuBar editor={editor} onImageInsertClick={() => setIsImageUrlInputVisible(!isImageUrlInputVisible)} />}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
          {isImageUrlInputVisible && (
            <div className="image-url-input-container">
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="이미지 URL을 입력하세요" className="image-url-input" />
              <button onClick={handleInsertImage} className="image-url-submit-btn" type="button">추가</button>
            </div>
          )}
        </div>
        <button type="submit" className="btn">수정 완료</button>
      </form>
    </div>
  );
}

export default NoticeEdit; 