import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import './HomeEdit.css';
import api from './api';

const MenuBar = ({ editor, onImageInsertClick }) => {
  if (!editor) return null;
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

function ProgramNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isImageUrlInputVisible, setIsImageUrlInputVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: { levels: [1, 2] },
      }),
      Image,
      Placeholder.configure({ placeholder: '프로그램 상세 내용을 입력하세요...' }),
    ],
    content: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editor) return;

    const content = editor.getHTML();
    
    // 기본 유효성 검사
    if (!title.trim() || !thumbnailUrl.trim() || content === '<p></p>') {
      alert('모든 필드를 채워주세요.');
      return;
    }

    const programData = { title, content, thumbnailUrl };

    try {
      await api.post('/api/programs', programData);
      alert('프로그램이 성공적으로 등록되었습니다.');
      navigate('/program');
    } catch (error) {
      console.error('Error creating program:', error);
      alert('프로그램 등록에 실패했습니다.');
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
      <h1 className="edit-title">새 프로그램 등록</h1>
      <form onSubmit={handleSubmit} className="about-edit-form">
        <div className="form-group">
          <label htmlFor="title">프로그램명</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="thumbnailUrl">썸네일 이미지 URL</label>
          <input type="text" id="thumbnailUrl" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <div className="editor-container">
            {editor && <MenuBar editor={editor} onImageInsertClick={() => setIsImageUrlInputVisible(!isImageUrlInputVisible)} />}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
          {isImageUrlInputVisible && (
            <div className="image-url-input-container">
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="이미지 URL을 입력하세요" className="image-url-input"/>
              <button onClick={handleInsertImage} className="image-url-submit-btn" type="button">추가</button>
            </div>
          )}
        </div>
        <button type="submit" className="btn">등록</button>
      </form>
    </div>
  );
}

export default ProgramNew; 