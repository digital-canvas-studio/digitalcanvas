import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import './SpaceEdit.css';
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

function SpaceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState({ title: '', content: '', thumbnailUrl: '' });
  const [isImageUrlInputVisible, setIsImageUrlInputVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: {
          levels: [1, 2],
        },
      }),
      Image,
      Placeholder.configure({ placeholder: '여기에 내용을 입력하세요...' }),
    ],
    content: space.content,
    onUpdate: ({ editor }) => {
      setSpace(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  useEffect(() => {
    const fetchSpace = async () => {
      try {
        const response = await api.get(`/api/spaces/${id}`);
        setSpace(response.data);
      } catch (error) {
        console.error('Error fetching space data:', error);
      }
    };
    fetchSpace();
  }, [id]);

  useEffect(() => {
    if (editor && space.content) {
      editor.commands.setContent(space.content);
    }
  }, [space.content, editor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSpace(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...space, 
        content: editor.getHTML() 
      };
      await api.put(`/api/spaces/${id}`, payload);
      alert('공간 정보가 성공적으로 업데이트되었습니다.');
      navigate(`/space/${id}`);
    } catch (error) {
      console.error('Error updating space data:', error);
      alert('저장에 실패했습니다.');
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
      <h1 className="edit-title">공간 소개 수정</h1>
      <form onSubmit={handleSubmit} className="about-edit-form">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input type="text" id="title" name="title" value={space.title} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="thumbnailUrl">썸네일 이미지 URL</label>
          <input type="text" id="thumbnailUrl" name="thumbnailUrl" value={space.thumbnailUrl} onChange={handleChange} />
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
        <button type="submit" className="btn">저장</button>
      </form>
    </div>
  );
}

export default SpaceEdit; 