"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, ZoomIn, ArrowRight } from "lucide-react";
import Link from "next/link";

// 动态导入 ForceGraph2D，禁用 SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphData {
  nodes: { id: string; title: string }[];
  links: { source: string; target: string }[];
}

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/graph");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch graph data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">正在构建知识网状图...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* 顶部栏 */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ZoomIn size={20} className="text-blue-500" />
            知识网状图谱
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
          >
            返回知识库
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="absolute bottom-6 left-6 p-4 bg-gray-800/80 backdrop-blur-md border border-gray-700 rounded-xl z-10 text-xs text-gray-300 space-y-2 pointer-events-none">
        <p>• 滚轮缩放 / 拖拽移动</p>
        <p>• 点击节点进入笔记详情</p>
        <p>• 节点间的连线表示双向关联</p>
      </div>

      {/* 图谱容器 */}
      <div ref={containerRef} className="flex-1 w-full">
        {data && (
          <ForceGraph2D
            graphData={data}
            width={dimensions.width}
            height={dimensions.height}
            nodeLabel="title"
            nodeColor={() => "#3b82f6"}
            nodeRelSize={8}
            linkColor={() => "#4b5563"}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={(node: any) => {
              router.push(`/notes/${node.id}`);
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.title || "未命名";
              const isHovered = false; // 简化处理，可以后续添加 hover 状态
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5);

              // 绘制连接线效果
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#3b82f6';
              
              // 绘制背景矩形
              ctx.fillStyle = 'rgba(31, 41, 55, 0.9)';
              ctx.beginPath();
              const roundness = 4 / globalScale;
              if ((ctx as any).roundRect) {
                (ctx as any).roundRect(
                  node.x! - bckgDimensions[0] / 2, 
                  node.y! - bckgDimensions[1] / 2, 
                  bckgDimensions[0], 
                  bckgDimensions[1],
                  roundness
                );
              } else {
                ctx.rect(
                  node.x! - bckgDimensions[0] / 2, 
                  node.y! - bckgDimensions[1] / 2, 
                  bckgDimensions[0], 
                  bckgDimensions[1]
                );
              }
              ctx.fill();
              
              ctx.shadowBlur = 0;

              // 绘制文字
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#e5e7eb';
              ctx.fillText(label, node.x!, node.y!);

              // 节点高亮圆点
              ctx.beginPath();
              ctx.arc(node.x!, node.y! - bckgDimensions[1]/2 - 2/globalScale, 2 / globalScale, 0, 2 * Math.PI, false);
              ctx.fillStyle = '#3b82f6';
              ctx.fill();
            }}
          />
        )}
      </div>
    </div>
  );
}
