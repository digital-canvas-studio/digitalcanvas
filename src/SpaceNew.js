import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import './HomeEdit.css'; // 공통 에디터 스타일 사용

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const addImage = () => {
        const url = window.prompt('URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    return (
        <div className="menu-bar">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
            <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'is-active' : ''}>Paragraph</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
            <button type="button" onClick={addImage}>Add Image</button>
        </div>
    );
};

function SpaceNew() {
    const [title, setTitle] = useState('');
    const navigate = useNavigate();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                hardBreak: false,
            }),
            Image,
        ],
        content: '<p>내용을 입력하세요.</p>',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const content = editor.getHTML();

        try {
            const response = await fetch('/api/spaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    title, 
                    content 
                }),
            });

            if (response.ok) {
                alert('새 글이 등록되었습니다.');
                navigate('/space');
            } else {
                const errorData = await response.json();
                alert(`글 등록에 실패했습니다: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error creating space:', error);
            alert('글 등록 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>공간소개 새 글 작성</h1>
            </div>
            <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                    <label htmlFor="title">제목</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>내용</label>
                    <div className="editor-container">
                        <MenuBar editor={editor} />
                        <EditorContent editor={editor} />
                    </div>
                </div>
                <button type="submit" className="btn-submit">등록</button>
            </form>
        </div>
    );
}

export default SpaceNew; 