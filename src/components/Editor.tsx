"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Markdown } from "tiptap-markdown";
import { 
  Trash2, Bold, Image as ImageIcon, 
  Highlighter, List, ListOrdered, Download, 
  Italic, Quote, Heading1, Heading2, Strikethrough,
  Type as FontIcon, MoveHorizontal, CheckCircle2, ChevronDown, Eraser, Link as LinkIcon, ExternalLink,
  Link2Off, X
} from "lucide-react";
import PreviewDrawer from "./PreviewDrawer";
import ConfirmModal from "./ConfirmModal";

// 自定义行高扩展
const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: '1.6',
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: element => element.style.lineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            },
          },
        },
      },
    ]
  },
})

// 自定义字间距扩展
const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addOptions() {
    return {
      types: ['textStyle'],
      defaultLetterSpacing: 'normal',
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: this.options.defaultLetterSpacing,
            parseHTML: element => element.style.letterSpacing,
            renderHTML: attributes => {
              if (!attributes.letterSpacing) return {}
              return { style: `letter-spacing: ${attributes.letterSpacing}` }
            },
          },
        },
      },
    ]
  },
})

interface Note {
  id: string;
  title: string;
}

interface EditorProps {
  id?: string;
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function Editor({ id, initialTitle = "", initialContent = "", onSave, onDelete }: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [lastSavedTitle, setLastSavedTitle] = useState(initialTitle);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewKeyword, setPreviewKeyword] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [, setUpdateTick] = useState(0);

  const highlightColors = [
    { name: "浅黄", color: "#fff9c4" },
    { name: "粉色", color: "#ffd1dc" },
    { name: "浅蓝", color: "#d0e8ff" },
    { name: "浅绿", color: "#d4f1d4" },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Markdown,
      TextStyle,
      LineHeight,
      LetterSpacing,
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "开始输入内容..." }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none min-h-[500px] py-4",
      },
      handleClick: (view, pos, event) => {
        const { target } = event;
        if (target instanceof HTMLAnchorElement) {
          event.preventDefault();
          const href = target.getAttribute("href");
          const keyword = target.innerText;
          if (href) {
            setPreviewId(href);
            setPreviewKeyword(keyword);
            setIsPreviewOpen(true);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: () => {
      triggerAutoSave();
    },
    // 强制在选择变化或交易发生时重新渲染，以更新工具栏状态
    onSelectionUpdate: () => {
      setUpdateTick(tick => tick + 1);
    },
    onTransaction: () => {
      setUpdateTick(tick => tick + 1);
    },
  });

  const handleSave = useCallback(async (currentTitle: string, currentContent: string) => {
    if (currentTitle === lastSavedTitle && currentContent === lastSavedContent) return;
    
    setIsSaving(true);
    try {
      await onSave(currentTitle, currentContent);
      setLastSavedTitle(currentTitle);
      setLastSavedContent(currentContent);
      setLastSavedTime(new Date());
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [lastSavedTitle, lastSavedContent, onSave]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (editor) {
        const currentContent = (editor.storage as any).markdown.getMarkdown();
        handleSave(title, currentContent);
      }
    }, 2000);
  }, [editor, title, handleSave]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const searchNotes = async () => {
        const res = await fetch(`/api/notes?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.slice(0, 5));
      };
      searchNotes();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (editor && initialContent !== (editor.storage as any).markdown.getMarkdown()) {
      editor.commands.setContent(initialContent);
      setLastSavedContent(initialContent);
    }
  }, [initialContent, editor]);

  useEffect(() => {
    setTitle(initialTitle);
    setLastSavedTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (title !== lastSavedTitle) {
      triggerAutoSave();
    }
  }, [title, lastSavedTitle, triggerAutoSave]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } catch (error) {
      alert("图片上传失败");
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    startDeleteTransition(async () => {
      try {
        if (onDelete) await onDelete();
      } catch (error) {
        alert("删除失败，请稍后重试。");
      }
    });
  };

  const formatTime = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部标题栏 */}
      <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-20">
        <div className="flex-1 flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="笔记标题..."
            className="text-2xl font-bold focus:outline-none w-full bg-transparent"
          />
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                自动保存中...
              </span>
            ) : showSaveSuccess ? (
              <span className="flex items-center gap-1.5 text-green-600 font-medium animate-in fade-in duration-300">
                <CheckCircle2 size={14} />
                保存成功
              </span>
            ) : lastSavedTime ? (
              <span className="text-gray-400">上次保存：{formatTime(lastSavedTime)}</span>
            ) : (
              <span className="text-gray-400">所有更改已保存</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {id && (
            <a
              href={`/api/notes/${id}/export`}
              className="p-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              title="导出为 Word"
            >
              <Download size={18} />
            </a>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <Trash2 size={18} className={isDeleting ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* 增强版工具栏 */}
      <div className="px-6 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1 sticky top-[73px] z-10">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded-md ${editor.isActive("heading", { level: 1 }) ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="一级标题"
        >
          <Heading1 size={18} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-md ${editor.isActive("heading", { level: 2 }) ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="二级标题"
        >
          <Heading2 size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-md ${editor.isActive("bold") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="加粗"
        >
          <Bold size={18} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-md ${editor.isActive("italic") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="斜体"
        >
          <Italic size={18} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-md ${editor.isActive("strike") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="删除线"
        >
          <Strikethrough size={18} />
        </button>
        
        <div className="relative flex items-center">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = window.prompt("请输入外部链接 URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`p-2 rounded-l-md border-r border-gray-300 ${editor.isActive("link") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
            title="插入外部链接"
          >
            <ExternalLink size={18} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowLinkSearch(!showLinkSearch);
            }}
            className={`p-1.5 rounded-r-md ${showLinkSearch ? "bg-gray-300" : "text-gray-500 hover:bg-gray-200"}`}
            title="关联其他笔记"
          >
            <LinkIcon size={18} />
          </button>

          {editor.isActive("link") && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="ml-1 p-2 rounded-md text-red-400 hover:bg-red-50 transition-colors"
              title="取消超链接"
            >
              <Link2Off size={18} />
            </button>
          )}

          {showLinkSearch && (
            <div className="absolute top-full left-0 mt-1 p-3 bg-white border rounded-lg shadow-xl z-30 w-72 animate-in fade-in zoom-in duration-200">
              <input
                type="text"
                autoFocus
                placeholder="搜索笔记标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {selectedNotes.length > 0 && (
                <div className="mt-3 pb-3 border-b">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">已选择 ({selectedNotes.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNotes.map(note => (
                      <span key={note.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                        {note.title}
                        <button onClick={() => setSelectedNotes(selectedNotes.filter(n => n.id !== note.id))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (editor) {
                        // 如果有选中的文字，且只选了一个笔记，则将选中的文字变成该笔记链接
                        const { from, to } = editor.state.selection;
                        const isTextSelected = from !== to;

                        if (isTextSelected && selectedNotes.length === 1) {
                          editor.chain().focus().setLink({ href: `/notes/${selectedNotes[0].id}` }).run();
                        } else {
                          // 否则在光标处插入新链接
                          selectedNotes.forEach(note => {
                            editor.chain().focus().insertContent(`<a href="/notes/${note.id}">${note.title}</a> `).run();
                          });
                        }
                        
                        setShowLinkSearch(false);
                        setSearchQuery("");
                        setSelectedNotes([]);
                      }
                    }}
                    className="w-full mt-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
                  >
                    插入所选关联
                  </button>
                </div>
              )}

              <div className="mt-2 max-h-40 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((note) => {
                    const isSelected = selectedNotes.some(n => n.id === note.id);
                    return (
                      <button
                        key={note.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedNotes(selectedNotes.filter(n => n.id !== note.id));
                          } else {
                            setSelectedNotes([...selectedNotes, note]);
                          }
                        }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-sm truncate flex items-center justify-between ${isSelected ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        {note.title}
                        {isSelected && <CheckCircle2 size={14} />}
                      </button>
                    );
                  })
                ) : searchQuery ? (
                  <p className="text-xs text-gray-400 p-2">未找到相关笔记</p>
                ) : (
                  <p className="text-xs text-gray-400 p-2">输入关键词搜索笔记</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center">
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-2 rounded-l-md border-r border-gray-300 ${editor.isActive("highlight") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
            title="高亮标记"
          >
            <Highlighter size={18} />
          </button>
          <button
            onClick={() => setShowHighlightColors(!showHighlightColors)}
            className={`p-1.5 rounded-r-md ${showHighlightColors ? "bg-gray-300" : "text-gray-500 hover:bg-gray-200"}`}
            title="选择高亮颜色"
          >
            <ChevronDown size={14} />
          </button>

          {showHighlightColors && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-xl z-30 flex gap-2 animate-in fade-in zoom-in duration-200">
              {highlightColors.map((item) => (
                <button
                  key={item.color}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: item.color }).run();
                    setShowHighlightColors(false);
                  }}
                  className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: item.color }}
                  title={item.name}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightColors(false);
                }}
                className="w-6 h-6 flex items-center justify-center border rounded-full hover:bg-gray-100 text-gray-500 transition-colors shadow-sm"
                title="清除高亮"
              >
                <Eraser size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <div className="flex items-center gap-1 px-1">
          <div className="flex items-center gap-1 text-gray-400 mr-1" title="行间距">
            <FontIcon size={14} />
            <select 
              onChange={(e) => editor.chain().focus().updateAttributes('paragraph', { lineHeight: e.target.value }).updateAttributes('heading', { lineHeight: e.target.value }).run()}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer hover:text-gray-900"
              defaultValue="1.6"
            >
              <option value="1.2">紧凑</option>
              <option value="1.6">常规</option>
              <option value="2.0">宽松</option>
              <option value="2.5">极宽</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-gray-400" title="字间距">
            <MoveHorizontal size={14} />
            <select 
              onChange={(e) => editor.chain().focus().setMark('textStyle', { letterSpacing: e.target.value }).run()}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer hover:text-gray-900"
              defaultValue="normal"
            >
              <option value="tight">紧凑</option>
              <option value="normal">标准</option>
              <option value="0.05em">稍宽</option>
              <option value="0.1em">宽</option>
            </select>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-md ${editor.isActive("bulletList") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="无序列表"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-md ${editor.isActive("orderedList") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="有序列表"
        >
          <ListOrdered size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded-md ${editor.isActive("blockquote") ? "bg-gray-300 text-gray-900 shadow-inner" : "text-gray-500 hover:bg-gray-200"}`}
          title="引用"
        >
          <Quote size={18} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <label className="p-2 hover:bg-gray-200 rounded-md cursor-pointer text-gray-500" title="插入图片">
          <ImageIcon size={18} />
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-auto px-12 lg:px-24">
        <EditorContent editor={editor} />
      </div>

      <PreviewDrawer 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        noteId={previewId} 
        keyword={previewKeyword}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="确认删除"
        message="你确定要删除这篇笔记吗？此操作无法撤销。"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        type="danger"
        confirmText="是"
        cancelText="否"
      />
    </div>
  );
}
