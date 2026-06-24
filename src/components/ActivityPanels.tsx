import React, { useState, useEffect, useRef } from 'react';
import type { ApiLog, SocketLog } from '../stores/useDeveloperLogsStore';
import { useDeveloperLogsStore } from '../stores/useDeveloperLogsStore';
import { Terminal, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export const ActivityPanels: React.FC = () => {
  const { apiLogs, socketLogs, clearApiLogs, clearSocketLogs } = useDeveloperLogsStore();
  const [activeTab, setActiveTab] = useState<'api' | 'socket'>('api');
  const [selectedApiLog, setSelectedApiLog] = useState<ApiLog | null>(null);
  const [selectedSocketLog, setSelectedSocketLog] = useState<SocketLog | null>(null);

  const socketEndRef = useRef<HTMLDivElement>(null);
  const apiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'socket') {
      socketEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      apiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [apiLogs, socketLogs, activeTab]);

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-slate-300 h-96 flex flex-col font-sans">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Terminal size={16} />
            <span>Developer Activity Panels</span>
          </div>
          <div className="flex border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === 'api'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              API Activity ({apiLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('socket')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === 'socket'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Socket.IO Traffic ({socketLogs.length})
            </button>
          </div>
        </div>
        <button
          onClick={activeTab === 'api' ? clearApiLogs : clearSocketLogs}
          className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-950 transition-all font-semibold"
          title="Clear logs"
        >
          <Trash2 size={13} />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Panel Contents */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {activeTab === 'api' ? (
          <div className="flex-1 flex min-h-0 divide-x divide-slate-800">
            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
              {apiLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                  <span>No HTTP activity recorded yet. Create a booking or fetch drivers.</span>
                </div>
              ) : (
                apiLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedApiLog(log)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      selectedApiLog?.id === log.id
                        ? 'bg-indigo-950/40 border-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          log.method === 'POST'
                            ? 'bg-blue-900/50 text-blue-300'
                            : log.method === 'GET'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="font-mono text-slate-300 truncate" title={log.url}>
                        {log.url.replace(/^https?:\/\/[^/]+/, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <span className="text-slate-500 font-mono text-[11px]">{log.timestamp}</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          log.status >= 200 && log.status < 300
                            ? 'text-emerald-400'
                            : log.status === 0
                            ? 'text-amber-400 animate-pulse'
                            : 'text-rose-400'
                        }`}
                      >
                        {log.status === 0 ? (
                          'PENDING'
                        ) : log.status >= 200 && log.status < 300 ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>{log.status}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>{log.status}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={apiEndRef} />
            </div>
            
            {/* Log Details Viewer */}
            <div className="w-96 overflow-y-auto p-4 bg-slate-950 flex flex-col gap-3 custom-scroll">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">HTTP Request Inspector</h3>
              {selectedApiLog ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold text-[10px]">Endpoint</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 select-all break-all">
                      {selectedApiLog.url}
                    </div>
                  </div>
                  {selectedApiLog.requestData && (
                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase font-semibold text-[10px]">Payload</span>
                      <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 overflow-x-auto text-[11px] custom-scroll">
                        {JSON.stringify(selectedApiLog.requestData, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold text-[10px]">Response Data</span>
                    {selectedApiLog.responseData ? (
                      <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px] custom-scroll">
                        {JSON.stringify(selectedApiLog.responseData, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-500 text-center italic">
                        {selectedApiLog.error || 'Pending response...'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 italic text-center">
                  <span>Click an API log to inspect coordinates.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 divide-x divide-slate-800">
            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scroll">
              {socketLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                  <span>No Socket.IO telemetry tracked yet. Join a trip room or emit updates.</span>
                </div>
              ) : (
                socketLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedSocketLog(log)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      selectedSocketLog?.id === log.id
                        ? 'bg-indigo-950/40 border-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          log.direction === 'emit'
                            ? 'bg-blue-900/60 text-blue-300'
                            : log.direction === 'receive'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-violet-900/60 text-violet-300'
                        }`}
                      >
                        {log.direction.toUpperCase()}
                      </span>
                      <span className="font-mono text-slate-300 truncate font-semibold">
                        {log.event}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-slate-500 text-[11px] pl-2">
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={socketEndRef} />
            </div>

            {/* Log Details Viewer */}
            <div className="w-96 overflow-y-auto p-4 bg-slate-950 flex flex-col gap-3 custom-scroll">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Socket Event Payload</h3>
              {selectedSocketLog ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold text-[10px]">Event Name</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200 font-bold select-all break-all">
                      {selectedSocketLog.event}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold text-[10px]">Payload Data</span>
                    {selectedSocketLog.payload ? (
                      <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 overflow-x-auto text-[11px] custom-scroll">
                        {JSON.stringify(selectedSocketLog.payload, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-500 text-center italic">
                        No payload attached
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 italic text-center">
                  <span>Click a socket log to inspect parameters.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
