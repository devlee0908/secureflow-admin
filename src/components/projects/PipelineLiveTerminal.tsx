import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PipelineLiveTerminalProps {
  logs: string[];
  isOpen: boolean;
  onToggle: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  runnerInfo?: {
    workerNode: string;
    containerId: string;
    branch: string;
    commitId: string;
  };
}

export const PipelineLiveTerminal: React.FC<PipelineLiveTerminalProps> = ({
  logs,
  isOpen,
  onToggle,
  isExpanded,
  onToggleExpand,
  runnerInfo = {
    workerNode: 'k8s-sec-worker-01',
    containerId: 'cnt-sec-98124',
    branch: 'main',
    commitId: '8f2a1b9',
  },
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'scan' | 'gate' | 'deploy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpandedFull = isExpanded !== undefined ? isExpanded : internalExpanded;
  const handleToggleExpand = onToggleExpand || (() => setInternalExpanded((prev) => !prev));
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on logs update
  useEffect(() => {
    if (isOpen && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, activeTab]);

  const handleCopyLogs = () => {
    const text = logs.join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('터미널 실행 로그 전체가 클립보드에 복사되었습니다.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filter logs by tab, search, and error toggle
  const filteredLogs = logs.filter((log) => {
    if (filterErrorsOnly && !log.includes('ERROR') && !log.includes('BLOCKED') && !log.includes('차단') && !log.includes('실패') && !log.includes('위반')) {
      return false;
    }
    if (searchQuery && !log.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === 'scan') {
      return log.includes('SCAN') || log.includes('STAGE 2') || log.includes('SAST') || log.includes('SCA') || log.includes('Secret') || log.includes('IaC') || log.includes('SBOM') || log.includes('cosign');
    }
    if (activeTab === 'gate') {
      return log.includes('STAGE 3') || log.includes('STAGE 4') || log.includes('게이트') || log.includes('정책') || log.includes('AUDIT') || log.includes('심사');
    }
    if (activeTab === 'deploy') {
      return log.includes('STAGE 5') || log.includes('배포') || log.includes('Kubernetes') || log.includes('k8s') || log.includes('롤링') || log.includes('롤백') || log.includes('Canary');
    }
    return true;
  });

  // Colorize log text based on syntax keywords
  const formatLogLine = (line: string, index: number) => {
    let colorClass = 'text-slate-300';
    let icon = null;

    if (line.includes('ERROR') || line.includes('BLOCKED') || line.includes('차단') || line.includes('실패') || line.includes('위반')) {
      colorClass = 'text-rose-400 font-semibold bg-rose-950/20 px-1 py-0.5 rounded';
    } else if (line.includes('WARN') || line.includes('주의') || line.includes('검토')) {
      colorClass = 'text-amber-400';
    } else if (line.includes('SUCCESS') || line.includes('PASSED') || line.includes('통과') || line.includes('완료') || line.includes('성공')) {
      colorClass = 'text-emerald-400 font-medium';
    } else if (line.includes('AUDIT') || line.includes('CISO') || line.includes('예외 승인')) {
      colorClass = 'text-fuchsia-400 font-bold bg-fuchsia-950/30 px-1 py-0.5 rounded';
    } else if (line.includes('SCAN') || line.includes('SAST') || line.includes('SCA') || line.includes('Secret') || line.includes('IaC')) {
      colorClass = 'text-cyan-300';
    } else if (line.includes('$ ') || line.includes('Running') || line.includes('Executing')) {
      colorClass = 'text-indigo-300 font-mono';
    } else if (line.includes('STAGE')) {
      colorClass = 'text-blue-300 font-semibold';
    }

    return (
      <div key={index} className="flex items-start gap-2 hover:bg-slate-900/60 px-1 py-0.5 rounded transition-colors group">
        <span className="text-[10px] text-slate-600 font-mono select-none w-7 shrink-0 text-right">
          {index + 1}
        </span>
        <span className={`text-[11px] font-mono leading-relaxed break-all ${colorClass}`}>
          {line}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl flex flex-col ${
        isOpen
          ? isExpandedFull
            ? 'h-[75%] translate-y-0 opacity-100 pointer-events-auto border-t visible'
            : 'h-72 translate-y-0 opacity-100 pointer-events-auto border-t visible'
          : 'h-0 translate-y-full opacity-0 pointer-events-none border-t-0 invisible overflow-hidden'
      }`}
    >
      {/* Terminal Title Bar & Quick Controls */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 shrink-0 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>실시간 CI/CD 러너 터미널 콘솔</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>워커: {runnerInfo.workerNode}</span>
            <span className="text-slate-600">|</span>
            <span>컨테이너: {runnerInfo.containerId}</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-400 font-bold">@{runnerInfo.commitId}</span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
            {logs.length} 로그 라인
          </Badge>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isOpen && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLogs}
                className="h-7 px-2 text-slate-400 hover:text-white text-xs gap-1 hover:bg-slate-800"
                title="로그 전체 복사"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isCopied ? '복사됨' : '복사'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExpand}
                className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                title={isExpandedFull ? '축소' : '최대화'}
              >
                {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span className="text-xs ml-1">{isOpen ? '접기' : '콘솔 열기'}</span>
          </Button>
        </div>
      </div>

      {/* Expanded Terminal Panel */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {/* Sub Toolbar: Tabs, Search, Filter */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] ${
                  activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                전체 로그 ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] ${
                  activeTab === 'scan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔍 보안 점검
              </button>
              <button
                onClick={() => setActiveTab('gate')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] ${
                  activeTab === 'gate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚖️ 정책 & 승인
              </button>
              <button
                onClick={() => setActiveTab('deploy')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] ${
                  activeTab === 'deploy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🚀 배포 & K8s
              </button>
            </div>

            {/* Search & Error Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-44 sm:w-56">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="로그 검색..."
                  className="h-7 pl-7 pr-2 bg-slate-950 border-slate-800 text-[11px] text-slate-200 rounded-lg placeholder:text-slate-600 focus:border-indigo-500 font-mono"
                />
              </div>

              <Button
                variant={filterErrorsOnly ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
                className={`h-7 px-2.5 text-[11px] gap-1 font-mono ${
                  filterErrorsOnly
                    ? 'bg-rose-600 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                에러만 보기
              </Button>
            </div>
          </div>

          {/* Terminal Output Stream */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs select-text space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs font-mono">
                검색 조건과 일치하는 콘솔 로그가 없습니다.
              </div>
            ) : (
              filteredLogs.map((log, index) => formatLogLine(log, index))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
