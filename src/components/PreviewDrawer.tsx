"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Link from "next/link";

interface PreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string | null;
  keyword?: string | null;
}

interface NoteContent {
  id: string;
  title: string;
  content: string;
}

export default function PreviewDrawer({ isOpen, onClose, noteId, keyword }: PreviewDrawerProps) {
  const [note, setNote] = useState<NoteContent | null>(null);
  const [loading, setLoading] = useState(false);

  // 高亮处理函数
  const getHighlightedContent = (content: string) => {
    if (!keyword || !keyword.trim()) return content;
    
    try {
      // 转义正则特殊字符
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');
      // 使用 <mark> 标签包裹关键词
      return content.replace(regex, '<mark class="bg-yellow-200 text-black px-1 rounded font-bold shadow-sm">$1</mark>');
    } catch (e) {
      return content;
    }
  };

  useEffect(() => {
    if (isOpen && noteId && noteId.startsWith("/notes/")) {
      const id = noteId.replace("/notes/", "");
      setLoading(true);
      fetch(`/api/notes/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setNote(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setNote(null);
    }
  }, [isOpen, noteId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l"
          >
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-700 truncate mr-4">
                {loading ? "加载中..." : note?.title || "预览"}
              </h2>
              <div className="flex items-center gap-2">
                {!loading && note && (
                  <Link
                    href={`/notes/${note.id}`}
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 rounded-md text-blue-600 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Maximize2 size={16} />
                    阅读全文
                  </Link>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 prose prose-slate max-w-none">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              ) : note ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {getHighlightedContent(note.content)}
                </ReactMarkdown>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <ExternalLink size={40} className="mx-auto mb-4 opacity-20" />
                  <p>这是一个外部链接，无法在此预览</p>
                  {noteId && (
                    <a 
                      href={noteId} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 underline mt-2 inline-block"
                    >
                      点击访问
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
