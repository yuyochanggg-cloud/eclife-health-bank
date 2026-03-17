import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Droplets, Zap, Flame, Stethoscope, 
  CheckCircle2, LogOut, Upload, ChevronRight, 
  History, Calendar, LayoutDashboard, Search
} from 'lucide-react';

// --- 模擬資料庫 (完整保留你原本的設定) ---
const USERS = {
  '1001': { id: '1001', password: '1234', name: '陳大明', role: 'store', roleName: '前線突擊隊', initialPoints: 120 },
  '2001': { id: '2001', password: '5678', name: '林小華', role: 'hq', roleName: '基地補給官', initialPoints: 245 }
};

const TASKS = {
  store: [
    { id: 's1', title: '步數狂人', desc: '每3000步1點(上限7點)', period: '每日', maxPoints: 7, type: 'steps', reqType: 'photo', icon: <Activity /> },
    { id: 's2', title: '每日喝水', desc: '1500cc 達標', period: '每日', points: 2, type: 'normal', reqType: 'none', icon: <Droplets /> },
    { id: 's3', title: '收銀台拉筋', desc: '踩網球舒緩筋膜', period: '每日', points: 2, type: 'normal', reqType: 'none', icon: <Zap /> },
    { id: 's4', title: '外部健康解鎖', desc: '至外部量測體脂', period: '每月', points: 10, type: 'normal', reqType: 'photo', icon: <Search /> },
  ],
  hq: [
    { id: 'h1', title: '步數機制', desc: '平日每3000步1點(上限3點)', period: '每日', maxPoints: 3, type: 'steps', reqType: 'photo', icon: <Activity /> },
    { id: 'h2', title: '每日喝水', desc: '1500cc 達標', period: '每日', points: 2, type: 'normal', reqType: 'none', icon: <Droplets /> },
    { id: 'h3', title: '辦公桌微伸展', desc: '不流汗的桌下對抗', period: '每日', points: 2, type: 'normal', reqType: 'none', icon: <Zap /> },
    { id: 'h4', title: '爬樓梯上 7 樓', desc: '預先疲勞法深蹲', period: '每週', points: 2, type: 'normal', reqType: 'tag', icon: <Flame /> },
    { id: 'h5', title: '無痕微肌力訓練', desc: '桌下無影腿撐10秒', period: '每週', points: 5, type: 'normal', reqType: 'tag', icon: <Zap /> },
    { id: 'h6', title: '健康防護罩', desc: '每週量血壓', period: '每週', points: 5, type: 'normal', reqType: 'photo', icon: <Stethoscope /> },
    { id: 'h7', title: 'InBody 核心檢測', desc: '每月首週檢測', period: '每月', points: 10, type: 'normal', reqType: 'photo', icon: <Activity /> },
  ]
};

const COLLEAGUES = ['王小明 (總部)', '李大頭 (總部)', '張雅婷 (採購)', '劉冠宇 (行銷)'];

// ★ 這裡已經幫你替換成你最新部署的 GAS 網址 ★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxmWPRhtDnVolPWxY__kEEpN8Sexl0JpOv4Pq3NAyWCRF4kTwkNV_aP7b3yW4llIFXF/exec";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // tasks (今日), retro (補登), history (查帳)
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeModalTask, setActiveModalTask] = useState(null);
  
  // 補登專用的狀態
  const [isModalRetro, setIsModalRetro] = useState(false);
  const [modalRetroDate, setModalRetroDate] = useState('');

  // --- 獲取歷史紀錄 (查帳與判斷防重複用) ---
  const fetchUserHistory = async (userId) => {
    try {
      const res = await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getHistory', userId })
      });
      const result = await res.json();
      if (result.status === 'success') {
        setHistory(result.data);
      }
    } catch (e) { 
      console.error("同步歷史紀錄失敗", e); 
    }
  };

  const handleLogin = (id, pw) => {
    const found = USERS[id];
    if (found && found.password === pw) {
      setUser(found);
      fetchUserHistory(found.id); // 登入成功後立刻抓取歷史資料
    } else {
      alert('帳號或密碼錯誤！');
    }
  };

  // --- 判斷任務是否完成 (用 GAS 統一的 yyyy/MM/dd 格式比對) ---
  const checkTaskStatus = (taskTitle, dateStr) => {
    return history.some(row => row[1] === dateStr && row[6] === taskTitle);
  };

  // 取得今天的日期字串 (格式轉為 yyyy/MM/dd 以符合 GAS)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}/${mm}/${dd}`;

  // --- ★ 核心：上傳與打卡函數 (完整保留你的 Base64 照片邏輯) ★ ---
  const completeTask = async (taskData, earnedPoints, photoPreview, selectedColleague, isRetro, retroDate) => {
    setLoading(true);
    let base64Photo = "";
    
    // 如果有照片，轉換為 Base64
    if (photoPreview) {
      try {
        const blob = await fetch(photoPreview).then(r => r.blob());
        base64Photo = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("照片處理失敗", e);
      }
    }

    const payload = {
      userId: user.id,
      userName: user.name,
      roleName: user.roleName,
      taskName: taskData.title,
      points: earnedPoints,
      isRetroactive: isRetro,
      retroDate: retroDate ? retroDate.replace(/-/g, '/') : null, // 確保補登日期格式正確
      witness: selectedColleague,
      photoData: base64Photo 
    };

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.status === "success") {
        alert(`🎉 打卡成功！資料已同步雲端。`);
        fetchUserHistory(user.id); // 成功後自動刷新查帳紀錄
        setActiveModalTask(null);
      } else {
        alert(result.message); // 顯示後端擋下來的重複打卡錯誤
      }
    } catch (error) {
      alert("❌ 連線錯誤，請檢查 GAS 權限設定！");
    }
    setLoading(false);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // 動態計算總點數 (初始設定點數 + 歷史紀錄加總)
  const currentTotalPoints = user.initialPoints + history.reduce((sum, r) => sum + (Number(r[7]) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      {/* 頂部 Header */}
      <header className="bg-white p-6 shadow-sm rounded-b-3xl max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{user.roleName}</span>
          <button onClick={() => setUser(null)}><LogOut size={20} className="text-slate-400 hover:text-red-500 transition-colors" /></button>
        </div>
        <h1 className="text-2xl font-black">{user.name}，你好！</h1>
        <div className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
          <p className="text-sm opacity-80 mb-1">目前累積點數</p>
          <p className="text-4xl font-black">{currentTotalPoints} pt</p>
        </div>
      </header>

      {/* 主內容切換區 */}
      <main className="p-4 max-w-md mx-auto mt-2">
        
        {/* 【分頁一：今日任務】 */}
        {activeTab === 'tasks' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">今日挑戰 ({todayStr})</h3>
            {TASKS[user.role].map(t => {
              const isDone = checkTaskStatus(t.title, todayStr);
              return (
                <div key={t.id} onClick={() => {
                  if (!isDone) {
                    setIsModalRetro(false);
                    setActiveModalTask(t);
                  }
                }} className={`bg-white p-4 rounded-2xl flex items-center justify-between border ${isDone ? 'opacity-50 bg-slate-50' : 'shadow-sm active:scale-95 transition-all cursor-pointer hover:border-blue-300'}`}>
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${isDone ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>{t.icon}</div>
                    <div>
                      <p className={`font-bold ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.title}</p>
                      <p className="text-xs text-slate-400">{t.desc}</p>
                    </div>
                  </div>
                  {isDone ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <ChevronRight className="text-slate-300" />}
                </div>
              );
            })}
          </div>
        )}

        {/* 【分頁二：補登申請介面獨立】 */}
        {activeTab === 'retro' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">補登過去未完成的任務</h3>
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl mb-4 shadow-sm">
              <p className="text-sm text-orange-600 font-bold mb-2">1. 選擇要補登的日期：</p>
              <input type="date" className="w-full border-2 border-orange-200 p-3 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-orange-400" value={modalRetroDate} onChange={e => setModalRetroDate(e.target.value)} />
            </div>
            
            <p className="text-sm text-slate-500 font-bold mb-2 ml-1">2. 選擇任務：</p>
            {TASKS[user.role].filter(t => t.period !== '每月').map(t => (
              <div key={t.id} onClick={() => {
                if (!modalRetroDate) return alert('請先在上方選擇您要補登的日期！');
                setIsModalRetro(true);
                setActiveModalTask(t);
              }} className="bg-white p-4 rounded-2xl flex items-center justify-between border shadow-sm cursor-pointer hover:border-orange-300 active:scale-95 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">{t.icon}</div>
                  <div>
                    <p className="font-bold">{t.title}</p>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" />
              </div>
            ))}
          </div>
        )}

        {/* 【分頁三：歷史查帳】 */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">歷史紀錄查帳 (最近 50 筆)</h3>
            {history.length === 0 && (
              <div className="text-center text-slate-400 mt-10 p-6 bg-white rounded-2xl border border-dashed">
                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>尚無打卡紀錄</p>
              </div>
            )}
            {history.slice().reverse().map((row, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border-l-4 border-blue-500 mb-3">
                <div>
                  <p className="font-bold text-sm text-slate-800">{row[6]}</p>
                  <p className="text-xs text-slate-400 mt-1">{row[1]} · {row[2]}</p>
                  {row[8] !== '無' && <p className="text-[10px] text-slate-500 mt-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500"/>見證: {row[8]}</p>}
                </div>
                <div className="text-right">
                  <span className="text-blue-600 font-black text-lg">+{row[7]} pt</span>
                  {row[9] !== "無照片" && <p className="text-[10px] text-emerald-500 font-bold mt-1 bg-emerald-50 inline-block px-2 py-1 rounded-md">已傳佐證照片</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部導覽列 (Bottom Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t flex justify-around p-4 max-w-md mx-auto rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
        <NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<LayoutDashboard />} label="今日任務" />
        <NavBtn active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<Calendar />} label="補登申請" />
        <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="歷史查帳" />
      </nav>

      {/* 任務打卡彈窗 */}
      {activeModalTask && (
        <TaskModal 
          task={activeModalTask} 
          isRetro={isModalRetro}
          retroDate={modalRetroDate}
          onClose={() => setActiveModalTask(null)} 
          onSubmit={completeTask}
          loading={loading}
        />
      )}
    </div>
  );
}

// --- 登入畫面元件 ---
function LoginScreen({ onLogin }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">良興健康存摺 2.0</h2>
          <p className="text-slate-400 text-sm mt-2">員工健康戰與數據中心</p>
        </div>
        <input type="text" placeholder="輸入員工編號 (1001 / 2001)" value={id} onChange={e => setId(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl mb-4 font-bold focus:border-blue-500 focus:outline-none transition-colors" />
        <input type="password" placeholder="輸入密碼 (1234 / 5678)" value={pw} onChange={e => setPw(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl mb-8 font-bold focus:border-blue-500 focus:outline-none transition-colors" />
        <button onClick={() => onLogin(id, pw)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">登入帳戶</button>
      </div>
    </div>
  );
}

// --- 底部按鈕元件 ---
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1 w-20 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

// --- 打卡表單 Modal (你的核心上傳介面) ---
function TaskModal({ task, isRetro, retroDate, onClose, onSubmit, loading }) {
  const [stepInput, setStepInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedColleague, setSelectedColleague] = useState('');
  const fileInputRef = useRef(null);

  const triggerFileInput = () => fileInputRef.current?.click();
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleModalSubmit = () => {
    let finalPoints = 0;
    
    // 驗證步數邏輯 (你原本的)
    if (task.type === 'steps') {
      if (!stepInput || parseInt(stepInput) <= 0) return alert("請輸入總步數！");
      finalPoints = Math.min(Math.floor(parseInt(stepInput) / 3000), task.maxPoints);
      if (finalPoints === 0) return alert("步數未達最低標準 (3000步)！");
    } else {
      finalPoints = task.points;
    }

    // 驗證佐證要求 (你原本的)
    if (task.reqType === 'photo' && !photoPreview) return alert('此任務需要上傳照片作為證明哦！');
    if (task.reqType === 'tag' && !selectedColleague) return alert('此任務需要選擇一位現場見證的戰友！');

    // 送出資料
    onSubmit(task, finalPoints, photoPreview, selectedColleague, isRetro, retroDate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-8 animate-in slide-in-from-bottom-4 fade-in">
        
        <div className="mb-6">
          <h3 className="text-xl font-bold flex items-center text-slate-800">
            {task.icon} <span className="ml-2">{task.title}</span>
          </h3>
          <p className="text-sm text-slate-500 mt-2">{task.desc}</p>
          {/* 如果是補登模式，顯示橘色提示 */}
          {isRetro && (
            <div className="mt-3 bg-orange-50 border border-orange-200 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center">
              <Calendar className="w-4 h-4 mr-2" /> 這是 {retroDate} 的補登申請
            </div>
          )}
        </div>
        
        {/* 輸入一：步數計算器 */}
        {task.type === 'steps' && (
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">請輸入當日總步數</label>
            <input type="number" placeholder="例如：9500" value={stepInput} onChange={e => setStepInput(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-lg focus:border-blue-500 focus:outline-none" />
            {stepInput && <p className="text-xs text-blue-600 mt-2 font-bold text-right">預計可換取: {Math.min(Math.floor(parseInt(stepInput) / 3000), task.maxPoints)} pt</p>}
          </div>
        )}

        {/* 輸入二：📸 照片上傳 (你原本的) */}
        {task.reqType === 'photo' && (
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">請上傳佐證照片 (必填)</label>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <button onClick={triggerFileInput} className="w-full border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 h-36 rounded-2xl flex flex-col items-center justify-center text-blue-500 font-bold overflow-hidden transition-colors">
              {photoPreview ? (
                <img src={photoPreview} className="h-full w-full object-cover" alt="Preview" />
              ) : (
                <><Upload className="w-8 h-8 mb-2 opacity-50" /> 點擊開啟相機或相簿</>
              )}
            </button>
          </div>
        )}

        {/* 輸入三：👥 戰友標記 (你原本的) */}
        {task.reqType === 'tag' && (
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">請選擇見證戰友 (必填)</label>
            <select value={selectedColleague} onChange={e => setSelectedColleague(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:outline-none bg-white">
              <option value="">-- 請選擇現場見證的同事 --</option>
              {COLLEAGUES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        
        {/* 按鈕區塊 */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} className="p-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold transition-colors">取消返回</button>
          <button 
            disabled={loading}
            onClick={handleModalSubmit} 
            className={`p-4 text-white rounded-2xl font-bold transition-all ${
              isRetro 
                ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
            } disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed flex justify-center items-center`}
          >
            {loading ? <span className="animate-pulse">資料上傳中...</span> : (isRetro ? '送出補登申請' : '確認打卡')}
          </button>
        </div>
      </div>
    </div>
  );
}