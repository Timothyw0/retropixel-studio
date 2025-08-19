import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';

// Default 16-color palette inspired by VGA
const DEFAULT_PALETTE = [
  '#000000', '#800000', '#008000', '#808000',
  '#000080', '#800080', '#008080', '#C0C0C0',
  '#808080', '#FF0000', '#00FF00', '#FFFF00',
  '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF'
];

type Tool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'circle' | 'eyedropper' | 'select';

interface Point {
  x: number;
  y: number;
}

interface HistoryEntry {
  imageData: ImageData;
  timestamp: number;
}

function App() {
  // Canvas settings
  const [canvasSize] = useState({ width: 32, height: 32 });
  const [zoom, setZoom] = useState(8);
  const [showGrid, setShowGrid] = useState(true);
  
  // Tools and colors
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [foregroundColor, setForegroundColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [palette, setPalette] = useKV('pixel-palette', [...DEFAULT_PALETTE]);
  
  // Canvas refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState<Point>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  
  // History management
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Selection and clipboard
  const [selection, setSelection] = useState<{start: Point, end: Point} | null>(null);
  const [clipboard, setClipboard] = useState<ImageData | null>(null);
  
  // Window dragging
  const [windowPos, setWindowPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Canvas data persistence
  const [canvasData, setCanvasData] = useKV('pixel-canvas-data', '');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state
    saveToHistory();
  }, []);

  const loadCanvas = useCallback(async () => {
    if (!canvasData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = canvasData;
  }, [canvasData]);

  // Load canvas when data changes
  useEffect(() => {
    if (canvasData) {
      loadCanvas();
    }
  }, [canvasData, loadCanvas]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newEntry: HistoryEntry = {
      imageData,
      timestamp: Date.now()
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      // Keep only last 50 states
      return newHistory.slice(-50);
    });
    
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const saveCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    setCanvasData(dataUrl);
  }, [setCanvasData]);

  const undo = useCallback(async () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const prevEntry = history[historyIndex - 1];
    ctx.putImageData(prevEntry.imageData, 0, 0);
    setHistoryIndex(prev => prev - 1);
    await saveCanvas();
  }, [history, historyIndex, saveCanvas]);

  const redo = useCallback(async () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const nextEntry = history[historyIndex + 1];
    ctx.putImageData(nextEntry.imageData, 0, 0);
    setHistoryIndex(prev => prev + 1);
    await saveCanvas();
  }, [history, historyIndex, saveCanvas]);

  const clearCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    await saveCanvas();
  }, [backgroundColor, saveToHistory, saveCanvas]);

  const getPixelCoords = useCallback((event: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoom);
    const y = Math.floor((event.clientY - rect.top) / zoom);
    
    return {
      x: Math.max(0, Math.min(canvasSize.width - 1, x)),
      y: Math.max(0, Math.min(canvasSize.height - 1, y))
    };
  }, [zoom, canvasSize]);

  const drawPixel = useCallback((x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }, []);

  const floodFill = useCallback((startX: number, startY: number, targetColor: string, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    if (targetColor === fillColor) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const stack: Point[] = [{x: startX, y: startY}];
    
    // Convert colors to RGB
    const targetRGB = hexToRgb(targetColor);
    const fillRGB = hexToRgb(fillColor);
    
    if (!targetRGB || !fillRGB) return;
    
    while (stack.length > 0) {
      const {x, y} = stack.pop()!;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      const index = (y * canvas.width + x) * 4;
      const currentR = data[index];
      const currentG = data[index + 1];
      const currentB = data[index + 2];
      
      if (currentR === targetRGB.r && currentG === targetRGB.g && currentB === targetRGB.b) {
        data[index] = fillRGB.r;
        data[index + 1] = fillRGB.g;
        data[index + 2] = fillRGB.b;
        
        stack.push({x: x + 1, y});
        stack.push({x: x - 1, y});
        stack.push({x, y: y + 1});
        stack.push({x, y: y - 1});
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getPixelColor = useCallback((x: number, y: number): string => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return '#000000';
    
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    
    return `#${data[0].toString(16).padStart(2, '0')}${data[1].toString(16).padStart(2, '0')}${data[2].toString(16).padStart(2, '0')}`;
  }, []);

  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number, color: string) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      drawPixel(x, y, color);
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }, [drawPixel]);

  const drawRect = useCallback((x0: number, y0: number, x1: number, y1: number, color: string, filled = false) => {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    
    if (filled) {
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          drawPixel(x, y, color);
        }
      }
    } else {
      // Draw outline
      for (let x = left; x <= right; x++) {
        drawPixel(x, top, color);
        drawPixel(x, bottom, color);
      }
      for (let y = top; y <= bottom; y++) {
        drawPixel(left, y, color);
        drawPixel(right, y, color);
      }
    }
  }, [drawPixel]);

  const drawCircle = useCallback((centerX: number, centerY: number, radius: number, color: string, filled = false) => {
    if (filled) {
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + y * y <= radius * radius) {
            const pixelX = centerX + x;
            const pixelY = centerY + y;
            if (pixelX >= 0 && pixelX < canvasSize.width && pixelY >= 0 && pixelY < canvasSize.height) {
              drawPixel(pixelX, pixelY, color);
            }
          }
        }
      }
    } else {
      // Bresenham's circle algorithm
      let x = 0;
      let y = radius;
      let d = 3 - 2 * radius;
      
      const plotPoints = (cx: number, cy: number, x: number, y: number) => {
        const points = [
          {x: cx + x, y: cy + y}, {x: cx - x, y: cy + y},
          {x: cx + x, y: cy - y}, {x: cx - x, y: cy - y},
          {x: cx + y, y: cy + x}, {x: cx - y, y: cy + x},
          {x: cx + y, y: cy - x}, {x: cx - y, y: cy - x}
        ];
        
        points.forEach(point => {
          if (point.x >= 0 && point.x < canvasSize.width && point.y >= 0 && point.y < canvasSize.height) {
            drawPixel(point.x, point.y, color);
          }
        });
      };
      
      plotPoints(centerX, centerY, x, y);
      while (y >= x) {
        x++;
        if (d > 0) {
          y--;
          d = d + 4 * (x - y) + 10;
        } else {
          d = d + 4 * x + 6;
        }
        plotPoints(centerX, centerY, x, y);
      }
    }
  }, [drawPixel, canvasSize]);

  const handleMouseDown = async (event: React.MouseEvent) => {
    const point = getPixelCoords(event);
    setStartPoint(point);
    setCurrentPoint(point);
    setIsDrawing(true);
    
    if (activeTool === 'eyedropper') {
      const color = getPixelColor(point.x, point.y);
      setForegroundColor(color);
      return;
    }
    
    if (activeTool === 'fill') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      
      const targetColor = getPixelColor(point.x, point.y);
      floodFill(point.x, point.y, targetColor, foregroundColor);
      saveToHistory();
      await saveCanvas();
      return;
    }
    
    if (activeTool === 'pencil') {
      drawPixel(point.x, point.y, foregroundColor);
    } else if (activeTool === 'eraser') {
      drawPixel(point.x, point.y, backgroundColor);
    }
  };


  
  const debouncedSave = useCallback(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      await saveCanvas();
    }, 500); // Save 500ms after drawing stops
    
    setSaveTimeout(timeout);
  }, [saveCanvas, saveTimeout]);

  const handleMouseMove = (event: React.MouseEvent) => {
    const point = getPixelCoords(event);
    setMousePos(point);
    
    if (!isDrawing) return;
    
    setCurrentPoint(point);
    
    if (activeTool === 'pencil') {
      drawPixel(point.x, point.y, foregroundColor);
      debouncedSave(); // Auto-save during drawing
    } else if (activeTool === 'eraser') {
      drawPixel(point.x, point.y, backgroundColor);
      debouncedSave(); // Auto-save during erasing
    }
    
    // Draw preview for shape tools
    const overlayCanvas = overlayRef.current;
    const overlayCtx = overlayCanvas?.getContext('2d');
    if (!overlayCanvas || !overlayCtx) return;
    
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.fillStyle = foregroundColor;
    
    if (activeTool === 'line') {
      // Preview line
      overlayCtx.strokeStyle = foregroundColor;
      overlayCtx.lineWidth = 1;
      overlayCtx.beginPath();
      overlayCtx.moveTo(startPoint.x * zoom, startPoint.y * zoom);
      overlayCtx.lineTo(point.x * zoom, point.y * zoom);
      overlayCtx.stroke();
    } else if (activeTool === 'rectangle') {
      // Preview rectangle
      const width = (point.x - startPoint.x) * zoom;
      const height = (point.y - startPoint.y) * zoom;
      overlayCtx.strokeStyle = foregroundColor;
      overlayCtx.lineWidth = 1;
      overlayCtx.strokeRect(startPoint.x * zoom, startPoint.y * zoom, width, height);
    } else if (activeTool === 'circle') {
      // Preview circle
      const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
      overlayCtx.strokeStyle = foregroundColor;
      overlayCtx.lineWidth = 1;
      overlayCtx.beginPath();
      overlayCtx.arc(startPoint.x * zoom + zoom/2, startPoint.y * zoom + zoom/2, radius * zoom, 0, 2 * Math.PI);
      overlayCtx.stroke();
    }
  };

  const handleMouseUp = async (event: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const point = getPixelCoords(event);
    
    if (activeTool === 'line') {
      drawLine(startPoint.x, startPoint.y, point.x, point.y, foregroundColor);
    } else if (activeTool === 'rectangle') {
      drawRect(startPoint.x, startPoint.y, point.x, point.y, foregroundColor);
    } else if (activeTool === 'circle') {
      const radius = Math.floor(Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)));
      drawCircle(startPoint.x, startPoint.y, radius, foregroundColor);
    }
    
    // Clear overlay
    const overlayCanvas = overlayRef.current;
    const overlayCtx = overlayCanvas?.getContext('2d');
    if (overlayCanvas && overlayCtx) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    
    setIsDrawing(false);
    saveToHistory();
    await saveCanvas();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
        }
        return;
      }
      
      switch (event.key) {
        case '1': setActiveTool('pencil'); break;
        case '2': setActiveTool('eraser'); break;
        case '3': setActiveTool('fill'); break;
        case '4': setActiveTool('line'); break;
        case '5': setActiveTool('rectangle'); break;
        case '6': setActiveTool('circle'); break;
        case '7': setActiveTool('eyedropper'); break;
        case '8': setActiveTool('select'); break;
        case '+':
        case '=':
          event.preventDefault();
          setZoom(prev => Math.min(16, prev + 1));
          break;
        case '-':
          event.preventDefault();
          setZoom(prev => Math.max(1, prev - 1));
          break;
        case 'g':
          setShowGrid(!showGrid);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGrid, undo, redo]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const importPNG = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
        saveToHistory();
        await saveCanvas();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const swapColors = () => {
    const temp = foregroundColor;
    setForegroundColor(backgroundColor);
    setBackgroundColor(temp);
  };

  const handleTitleBarMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: event.clientX - windowPos.x,
      y: event.clientY - windowPos.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        setWindowPos({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const tools = [
    { id: 'pencil' as Tool, icon: '✏️', name: 'Pencil (1)' },
    { id: 'eraser' as Tool, icon: '🧽', name: 'Eraser (2)' },
    { id: 'fill' as Tool, icon: '🪣', name: 'Fill (3)' },
    { id: 'line' as Tool, icon: '📏', name: 'Line (4)' },
    { id: 'rectangle' as Tool, icon: '⬛', name: 'Rectangle (5)' },
    { id: 'circle' as Tool, icon: '⭕', name: 'Circle (6)' },
    { id: 'eyedropper' as Tool, icon: '💧', name: 'Eyedropper (7)' },
    { id: 'select' as Tool, icon: '🔲', name: 'Select (8)' }
  ];

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#008080' }}>
      <div 
        className="retro-window max-w-4xl mx-auto"
        style={{
          position: 'relative',
          left: `${windowPos.x}px`,
          top: `${windowPos.y}px`
        }}
      >
        {/* Title Bar */}
        <div 
          className="retro-title-bar flex items-center justify-between"
          onMouseDown={handleTitleBarMouseDown}
        >
          <span>🎨 Retro Pixel Painter</span>
          <div className="flex gap-1">
            <button className="retro-button text-xs">_</button>
            <button className="retro-button text-xs">▢</button>
            <button className="retro-button text-xs">×</button>
          </div>
        </div>
        
        {/* Menu Bar */}
        <div className="retro-toolbar flex gap-1">
          <button className="retro-button">File</button>
          <button className="retro-button">Edit</button>
          <button className="retro-button">View</button>
          <button className="retro-button">Help</button>
        </div>
        
        {/* Main Toolbar */}
        <div className="retro-toolbar flex items-center gap-2 flex-wrap">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`retro-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
          
          <div className="border-l border-gray-600 h-6 mx-2" />
          
          <button 
            className="retro-button" 
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button 
            className="retro-button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
          
          <div className="border-l border-gray-600 h-6 mx-2" />
          
          <button 
            className={`retro-button ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid (G)"
          >
            #️⃣
          </button>
          
          <button 
            className="retro-button"
            onClick={clearCanvas}
            title="Clear Canvas"
          >
            🗑️
          </button>
          
          <div className="border-l border-gray-600 h-6 mx-2" />
          
          <label className="retro-button cursor-pointer">
            📁
            <input
              type="file"
              accept="image/*"
              onChange={importPNG}
              className="hidden"
            />
          </label>
          
          <button 
            className="retro-button"
            onClick={exportPNG}
            title="Export PNG"
          >
            💾
          </button>
          
          <div className="border-l border-gray-600 h-6 mx-2" />
          
          <div className="flex items-center gap-1">
            <span className="text-xs">Zoom:</span>
            <button 
              className="retro-button text-xs"
              onClick={() => setZoom(Math.max(1, zoom - 1))}
            >
              -
            </button>
            <span className="px-2 text-xs">{zoom}x</span>
            <button 
              className="retro-button text-xs"
              onClick={() => setZoom(Math.min(16, zoom + 1))}
            >
              +
            </button>
          </div>
        </div>
        
        <div className="flex">
          {/* Left Panel - Tools and Colors */}
          <div className="w-48 bg-gray-200 border-r border-gray-600 p-2">
            {/* Color Swatches */}
            <div className="mb-4">
              <div className="text-xs mb-1">Colors:</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <div 
                    className="w-8 h-8 border-2 border-black cursor-pointer"
                    style={{ backgroundColor: foregroundColor }}
                    onClick={() => document.getElementById('fg-color')?.click()}
                  />
                  <input
                    id="fg-color"
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <button 
                  className="retro-button text-xs"
                  onClick={swapColors}
                  title="Swap Colors"
                >
                  ⇄
                </button>
                <div className="relative">
                  <div 
                    className="w-8 h-8 border-2 border-black cursor-pointer"
                    style={{ backgroundColor: backgroundColor }}
                    onClick={() => document.getElementById('bg-color')?.click()}
                  />
                  <input
                    id="bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-1">
                {palette.map((color, index) => (
                  <button
                    key={index}
                    className={`color-swatch ${foregroundColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForegroundColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setBackgroundColor(color);
                    }}
                    title={`Color ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Main Canvas Area */}
          <div className="flex-1 p-4 bg-gray-100">
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="pixel-canvas"
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                  width: `${canvasSize.width * zoom}px`,
                  height: `${canvasSize.height * zoom}px`,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              
              {/* Overlay Canvas for Previews */}
              <canvas
                ref={overlayRef}
                className="absolute top-0 left-0 pointer-events-none"
                width={canvasSize.width * zoom}
                height={canvasSize.height * zoom}
                style={{
                  width: `${canvasSize.width * zoom}px`,
                  height: `${canvasSize.height * zoom}px`,
                }}
              />
              
              {/* Grid Overlay */}
              {showGrid && (
                <div 
                  className="grid-overlay"
                  style={{
                    width: `${canvasSize.width * zoom}px`,
                    height: `${canvasSize.height * zoom}px`,
                    backgroundImage: `
                      linear-gradient(to right, #00000030 1px, transparent 1px),
                      linear-gradient(to bottom, #00000030 1px, transparent 1px)
                    `,
                    backgroundSize: `${zoom}px ${zoom}px`
                  }}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="status-bar">
          <span>Cursor: {mousePos.x}, {mousePos.y}</span>
          <span>Tool: {tools.find(t => t.id === activeTool)?.name}</span>
          <span>Canvas: {canvasSize.width}x{canvasSize.height}</span>
          <span>Zoom: {zoom}x</span>
        </div>
      </div>
    </div>
  );
}

export default App;