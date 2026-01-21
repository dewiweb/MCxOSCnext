import { useState, useRef, useCallback, ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
}

export function ResizablePanel({ 
  children, 
  defaultWidth, 
  minWidth, 
  maxWidth 
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minWidth, maxWidth]);

  return (
    <div className="flex">
      <div 
        ref={panelRef}
        className="bg-gray-850 border-r border-gray-700 p-4 space-y-4 min-h-[calc(100vh-73px)] overflow-hidden"
        style={{ width: `${width}px` }}
      >
        <div className="h-full overflow-x-auto overflow-y-auto">
          {children}
        </div>
      </div>
      
      {/* Resize handle */}
      <div
        className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={startResize}
        title="Drag to resize"
      />
    </div>
  );
}
