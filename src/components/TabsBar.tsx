"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, FileText, LayoutGrid } from "lucide-react";
import Link from "next/link";

interface Tab {
  id: string;
  title: string;
  path: string;
}

export default function TabsBar() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const isLoaded = useRef(false);

  // 1. 核心逻辑：组件挂载后立即同步状态
  useEffect(() => {
    const savedTabs = localStorage.getItem("opened-tabs");
    let currentTabs: Tab[] = [];
    
    if (savedTabs) {
      try {
        currentTabs = JSON.parse(savedTabs);
      } catch (e) {
        console.error("Failed to parse tabs", e);
      }
    }

    // 2. 检查当前页面是否需要添加到页签
    if (pathname.startsWith("/notes/")) {
      const id = pathname.replace("/notes/", "");
      const exists = currentTabs.find(t => t.path === pathname);
      
      if (!exists) {
        // 如果是新笔记，且已有“新建笔记”标签，则更新它而不是新增
        const isNew = id === "new";
        const newTab: Tab = {
          id: id,
          title: isNew ? "新建笔记" : "正在加载...",
          path: pathname
        };
        
        if (isNew) {
          const newTabIndex = currentTabs.findIndex(t => t.id === "new");
          if (newTabIndex > -1) {
            currentTabs[newTabIndex].path = pathname;
          } else {
            currentTabs.push(newTab);
          }
        } else {
          currentTabs.push(newTab);
          // 异步更新标题
          fetch(`/api/notes/${id}`)
            .then(res => res.json())
            .then(data => {
              if (data.title) {
                setTabs(prev => {
                  const updated = prev.map(t => t.id === id ? { ...t, title: data.title } : t);
                  localStorage.setItem("opened-tabs", JSON.stringify(updated));
                  return updated;
                });
              }
            });
        }
      }
    }

    setTabs(currentTabs);
    localStorage.setItem("opened-tabs", JSON.stringify(currentTabs));
    isLoaded.current = true;
  }, [pathname]); // 监听路径变化

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newTabs = tabs.filter(t => t.path !== path);
    setTabs(newTabs);
    localStorage.setItem("opened-tabs", JSON.stringify(newTabs));

    if (pathname === path) {
      if (newTabs.length > 0) {
        router.push(newTabs[newTabs.length - 1].path);
      } else {
        router.push("/");
      }
    }
  };

  if (tabs.length === 0 && pathname === "/") return null;

  return (
    <div className="flex items-center bg-gray-100 border-b overflow-x-auto no-scrollbar h-10 px-2 select-none">
      <Link
        href="/"
        className={`flex items-center gap-1.5 px-3 h-8 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap mr-1 border-t border-x ${
          pathname === "/" ? "bg-white text-blue-600 border-gray-200" : "text-gray-500 hover:bg-gray-200 border-transparent"
        }`}
      >
        <LayoutGrid size={14} />
        首页
      </Link>
      
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          href={tab.path}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-t-md text-xs font-medium transition-colors group whitespace-nowrap mr-1 border-t border-x ${
            pathname === tab.path 
              ? "bg-white text-blue-600 border-gray-200" 
              : "text-gray-500 hover:bg-gray-200 border-transparent"
          }`}
        >
          <FileText size={14} className={pathname === tab.path ? "text-blue-500" : "text-gray-400"} />
          <span className="max-w-[120px] truncate">{tab.title}</span>
          <button
            onClick={(e) => closeTab(e, tab.path)}
            className={`p-0.5 rounded-full hover:bg-gray-300 transition-colors ${
              pathname === tab.path ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <X size={12} />
          </button>
        </Link>
      ))}
    </div>
  );
}
