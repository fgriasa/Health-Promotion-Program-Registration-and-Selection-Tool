
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Unit, DrawResult, CalculationResult, SavedRecord } from './types';
import { calculateAllocation } from './utils/allocation';
import Icon from './components/Icon';

const App: React.FC = () => {
  // --- State ---
  const [totalLimit, setTotalLimit] = useState<number>(100);
  const [units, setUnits] = useState<Unit[]>([
    { id: '1', name: '管理部', count: 45 },
    { id: '2', name: '技術部', count: 82 },
    { id: '3', name: '品保部', count: 30 },
  ]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCount, setNewUnitCount] = useState('');

  // Storage State
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Drawing State
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [drawQuota, setDrawQuota] = useState<number>(0);
  const [participantText, setParticipantText] = useState<string>('');
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);

  // --- Initialization & Auto-save ---
  useEffect(() => {
    // Load last session
    const lastSession = localStorage.getItem('fair_quota_last_session');
    if (lastSession) {
      try {
        const { totalLimit: l, units: u } = JSON.parse(lastSession);
        setTotalLimit(l);
        setUnits(u);
      } catch (e) {
        console.error("Failed to load last session", e);
      }
    }

    // Load saved records
    const storedRecords = localStorage.getItem('fair_quota_records');
    if (storedRecords) {
      try {
        setSavedRecords(JSON.parse(storedRecords));
      } catch (e) {
        console.error("Failed to load records", e);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-save current state
    const timer = setTimeout(() => {
      localStorage.setItem('fair_quota_last_session', JSON.stringify({ totalLimit, units }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [totalLimit, units]);

  // --- Derived State ---
  const calculation: CalculationResult = useMemo(() => {
    return calculateAllocation(units, totalLimit);
  }, [units, totalLimit]);

  // --- Handlers ---
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitCount) return;
    const count = parseInt(newUnitCount);
    if (isNaN(count) || count < 0) return;

    const newUnit: Unit = {
      id: Date.now().toString(),
      name: newUnitName.trim(),
      count
    };
    setUnits([...units, newUnit]);
    setNewUnitName('');
    setNewUnitCount('');
  };

  const removeUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const updateUnitCount = (id: string, newVal: string) => {
    const count = parseInt(newVal) || 0;
    setUnits(prev => prev.map(u => u.id === id ? { ...u, count } : u));
  };

  const saveCurrentRecord = () => {
    if (!saveTitle.trim()) {
      alert("請輸入存檔名稱");
      return;
    }
    const newRecord: SavedRecord = {
      id: Date.now().toString(),
      title: saveTitle.trim(),
      timestamp: Date.now(),
      totalLimit,
      units: [...units]
    };
    const updated = [newRecord, ...savedRecords];
    setSavedRecords(updated);
    localStorage.setItem('fair_quota_records', JSON.stringify(updated));
    setSaveTitle('');
    setIsSaving(false);
    alert("存檔成功！");
  };

  const loadRecord = (record: SavedRecord) => {
    if (confirm(`確定要載入「${record.title}」嗎？目前的編輯內容將會被覆蓋。`)) {
      setTotalLimit(record.totalLimit);
      setUnits(record.units);
      setIsRecordModalOpen(false);
    }
  };

  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("確定要刪除此存檔嗎？")) {
      const updated = savedRecords.filter(r => r.id !== id);
      setSavedRecords(updated);
      localStorage.setItem('fair_quota_records', JSON.stringify(updated));
    }
  };

  const copyResults = () => {
    let text = `【活動名額分配結果】\n總限額：${totalLimit}\n總報名：${calculation.totalSignup}\n\n`;
    calculation.data.forEach(u => {
      text += `● ${u.name}\n   報名：${u.count} 人\n   核定：${u.allocated} 人 (減額 ${u.reduction})\n\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
      alert('已將分配結果複製到剪貼簿！');
    });
  };

  const onSelectDrawUnit = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedUnitId(id);
    const unit = calculation.data.find(u => u.id === id);
    if (unit) {
      setDrawQuota(unit.allocated);
    }
    setDrawResult(null);
  };

  const handleDraw = () => {
    const participants = participantText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (participants.length === 0) {
      alert('請輸入名單');
      return;
    }

    if (drawQuota <= 0) {
      alert('抽取人數必須大於 0');
      return;
    }

    // Shuffle
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const winners = shuffled.slice(0, drawQuota);
    const waitlist = shuffled.slice(drawQuota);

    setDrawResult({ winners, waitlist });
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 py-4 px-6 md:px-12 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Icon name="Target" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">台灣三洋健康促進活動名額公平分配系統</h1>
              <p className="text-xs md:text-sm text-slate-500">採用最大餘數法進行精確比例分配</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <label className="text-sm font-medium text-slate-600 whitespace-nowrap hidden sm:inline">活動總限額</label>
              <input 
                type="number"
                value={totalLimit}
                onChange={(e) => setTotalLimit(parseInt(e.target.value) || 0)}
                className="w-20 sm:w-24 px-3 py-1 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-blue-700 text-center"
              />
            </div>
            <button 
              onClick={() => setIsRecordModalOpen(true)}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors relative"
              title="歷史紀錄"
            >
              <Icon name="Archive" size={20} />
              {savedRecords.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                  {savedRecords.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Setup & Input */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Users" size={18} className="text-blue-600" />
                <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">單位資料錄入</h2>
              </div>
              <button 
                onClick={() => setIsSaving(true)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold"
              >
                <Icon name="Save" size={14} /> 存檔
              </button>
            </div>
            
            {/* Quick Save Prompt */}
            {isSaving && (
              <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top duration-300">
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-2">存檔名稱</label>
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={saveTitle}
                    placeholder="例如：2024 春季論壇"
                    onChange={(e) => setSaveTitle(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg outline-none text-sm font-bold"
                  />
                  <button onClick={saveCurrentRecord} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Icon name="Check" size={18} />
                  </button>
                  <button onClick={() => setIsSaving(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                    <Icon name="X" size={18} />
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              <form onSubmit={handleAddUnit} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">單位名稱</label>
                    <input 
                      type="text"
                      placeholder="如：教務處"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">報名人數</label>
                    <input 
                      type="number"
                      placeholder="人數"
                      value={newUnitCount}
                      onChange={(e) => setNewUnitCount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="Plus" size={18} />
                  新增單位
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">已加入單位 ({units.length})</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {units.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-slate-400 text-sm">請在上方輸入單位報名資料</p>
                    </div>
                  )}
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all group shadow-sm">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-bold text-slate-800 truncate">{unit.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">報名：</label>
                          <input 
                            type="number"
                            value={unit.count}
                            onChange={(e) => updateUnitCount(unit.id, e.target.value)}
                            className="w-16 text-sm font-semibold text-blue-600 bg-transparent border-b border-transparent focus:border-blue-300 outline-none hover:bg-slate-50 rounded px-1"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => removeUnit(unit.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Icon name="Trash2" size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Drawing */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Allocation Results */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="BarChart3" size={18} className="text-blue-600" />
                <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">比例分配計算結果</h2>
              </div>
              <div className="flex items-center gap-2">
                {calculation.isOver ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                    <Icon name="AlertCircle" size={12} />
                    超額 {calculation.excess} 人
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                    <Icon name="CheckCircle2" size={12} />
                    額度充足
                  </span>
                )}
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">單位</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">報名人數</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">減額數量</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100">核定名額</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                        暫無分配資料
                      </td>
                    </tr>
                  )}
                  {calculation.data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{row.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono italic opacity-60">比例: {(row.exactShare).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-medium">
                        {row.count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.reduction > 0 ? (
                          <span className="text-red-500 font-bold">-{row.reduction}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-lg">
                          {row.allocated}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {calculation.data.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td className="px-6 py-4 rounded-bl-xl">總計</td>
                      <td className="px-6 py-4 text-right">{calculation.totalSignup}</td>
                      <td className="px-6 py-4 text-right text-red-400">-{calculation.isOver ? calculation.excess : 0}</td>
                      <td className="px-6 py-4 text-right text-xl rounded-br-xl">{calculation.totalAllocated}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed max-w-lg">
                <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
                <p>
                  演算法說明：系統首先根據單位比例計算其精確份額 (Exact Share)，對每個單位進行無條件捨去取得基本配額。剩餘的名額按小數點「餘數」由大到小依次補足，確保總數絕對等於限額並最大化公平。
                </p>
              </div>
              <button 
                onClick={copyResults}
                className="whitespace-nowrap flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition-colors shadow-sm"
              >
                <Icon name="Copy" size={18} />
                複製結果
              </button>
            </div>
          </div>

          {/* Lucky Draw Section */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl overflow-hidden p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="text-white">
                <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                  <Icon name="Dices" size={28} />
                  隨機抽籤工具
                </h2>
                <p className="text-blue-100 text-sm opacity-80">自動帶入核定名額，抽選名單</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">目標單位</label>
                  <select 
                    value={selectedUnitId}
                    onChange={onSelectDrawUnit}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 outline-none focus:bg-white/20 transition-all font-bold min-w-[160px]"
                  >
                    <option value="" className="text-slate-800">請選擇單位</option>
                    {calculation.data.map(u => (
                      <option key={u.id} value={u.id} className="text-slate-800">
                        {u.name} (核定: {u.allocated})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">抽選人數</label>
                  <input 
                    type="number"
                    value={drawQuota}
                    onChange={(e) => setDrawQuota(parseInt(e.target.value) || 0)}
                    className="w-24 bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2 outline-none focus:bg-white/20 transition-all font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-blue-100 mb-2 uppercase tracking-widest">參與者名單 (每行一個名字)</label>
                  <textarea 
                    value={participantText}
                    onChange={(e) => setParticipantText(e.target.value)}
                    placeholder="王小明&#10;李美玲&#10;陳大強..."
                    className="w-full h-48 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:bg-white/15 transition-all text-sm font-medium resize-none custom-scrollbar"
                  ></textarea>
                </div>
                <button 
                  onClick={handleDraw}
                  disabled={!selectedUnitId && !participantText}
                  className="w-full bg-white text-blue-700 font-black py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icon name="Shuffle" size={20} />
                  立即執行抽籤
                </button>
              </div>

              {/* Results Display */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 overflow-hidden min-h-[300px]">
                {!drawResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-blue-100/40 gap-3">
                    <Icon name="Stars" size={48} />
                    <p className="text-sm font-bold uppercase tracking-widest">尚未執行抽籤</p>
                  </div>
                ) : (
                  <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2">
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                        <h3 className="text-white font-black flex items-center gap-2">
                          <Icon name="Trophy" size={18} className="text-yellow-400" />
                          正取名單 ({drawResult.winners.length})
                        </h3>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(drawResult.winners.join(', '));
                            alert('已複製正取名單');
                          }}
                          className="text-[10px] text-white/60 hover:text-white flex items-center gap-1"
                        >
                          <Icon name="Copy" size={12} /> 複製
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {drawResult.winners.map((name, i) => (
                          <span key={i} className="bg-white text-blue-700 px-3 py-1 rounded-lg text-sm font-bold shadow-md animate-in zoom-in-50 duration-300">
                            {i+1}. {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {drawResult.waitlist.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                          <h3 className="text-white/70 font-bold flex items-center gap-2">
                            <Icon name="ListOrdered" size={18} className="text-blue-300" />
                            備取 / 未中選 ({drawResult.waitlist.length})
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {drawResult.waitlist.map((name, i) => (
                            <span key={i} className="bg-black/20 text-blue-100/60 px-2 py-1 rounded-md text-xs font-medium border border-white/5">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Record Management Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRecordModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Icon name="Archive" size={18} className="text-blue-600" />
                歷史存檔紀錄
              </h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="X" size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {savedRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Icon name="CloudOff" size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">目前沒有任何存檔</p>
                  <p className="text-xs mt-1">點擊左側「存檔」按鈕即可儲存當前配置</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedRecords.map(record => (
                    <div 
                      key={record.id}
                      onClick={() => loadRecord(record)}
                      className="group p-4 border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{record.title}</h4>
                        <button 
                          onClick={(e) => deleteRecord(record.id, e)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size={10} />
                          {new Date(record.timestamp).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Users" size={10} />
                          {record.units.length} 單位
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Target" size={10} />
                          名額 {record.totalLimit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">數據儲存於您的瀏覽器本地空間</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-slate-200 mt-12 text-center">
        <div className="inline-flex items-center gap-2 text-slate-400 font-medium text-sm">
          <Icon name="Calculator" size={16} />
          <span>高效、公平、公開的名額分配解決方案</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
