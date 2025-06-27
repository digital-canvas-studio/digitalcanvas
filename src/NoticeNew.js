import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './HomeEdit.css';
import api from './api';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="menu-bar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
    </div>
  );
};

function NoticeNew() {
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({ placeholder: '내용을 입력하세요...' }),
    ],
    content: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editor) return;

    try {
      await api.post('/api/notices', { title, content: editor.getHTML() });
      alert('공지사항이 성공적으로 등록되었습니다.');
      navigate('/notice');
    } catch (error) {
      console.error('Error creating notice:', error);
      alert('공지사항 등록에 실패했습니다.');
    }
  };

  return (
    <div className="page-container">
      <h1 className="edit-title">새 공지사항 작성</h1>
      <form onSubmit={handleSubmit} className="about-edit-form">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <div className="editor-container">
            {editor && <MenuBar editor={editor} />}
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>
        <button type="submit" className="btn">등록</button>
      </form>
    </div>
  );
}

export default NoticeNew; 