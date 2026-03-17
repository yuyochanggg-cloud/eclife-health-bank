import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Droplets, Zap, Flame, Stethoscope, 
  CheckCircle2, LogOut, Upload, ChevronRight, 
  History, Calendar, LayoutDashboard, Search, Trophy, Download
} from 'lucide-react';

// ★ 請確認這是你最新部署的 GAS 網址 ★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxmWPRhtDnVolPWxY__kEEpN8Sexl0JpOv4Pq3NAyWCRF4kTwkNV_aP7b3yW4llIFXF/exec";

// 圖示對應表 (把 Sheet 裡的字串轉成真實 Icon)
const ICON_MAP = {
  'Activity': <Activity />, 'Droplets': <Droplets />, 'Zap': <Zap />,
  'Flame': <Flame />, 'Stethoscope': <Stethoscope />, 'Search': <Search />
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ==========================================
  // 🌟 PWA 加到主畫面 (Add to Home Screen) 邏輯
  // ==========================================
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  useEffect(() => {
    // 監聽瀏覽器發出的「可安裝」事件
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
      setShowPwaPrompt(true); 
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); 
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPwaPrompt(false); 
    }
    setDeferredPrompt(null);
  };
  // ==========================================

  // --- 動態資料 State ---
  const [appData, setAppData] = useState({
    settings: { startDate: '', endDate: '' },
    tasks: { store: [], hq: [] },
    users: [],
    history: [] // 全公司的歷史紀錄
  });
  
  const [activeModalTask, setActiveModalTask] = useState(null);
  const [isModalRetro, setIsModalRetro] = useState(false);
  const [modalRetroDate, setModalRetroDate] = useState('');

  // 補登日期限制
  const getLocalYMD = (offsetDays) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const maxRetroDate = getLocalYMD(-1);
  const minRetroDate = getLocalYMD(-2);

  // --- 解析 GAS 傳來的 Google Sheets 資料 ---
  const processGoogleSheetsData = (rawData) => {
    const settingsObj = {};
    if (rawData.settings) rawData.settings.forEach(row => { if (row[0]) settingsObj[row[0]] = row[1]; });

    const usersList = rawData.users ? rawData.users.slice(1).map(row => ({
      id: row[0], password: row[1], name: row[2], role: row[3], roleName: row[4], initialPoints: Number(row[5])
    })) : [];

    const tasksObj = { store: [], hq: [] };
    if (rawData.tasks) rawData.tasks.slice(1).forEach((row, index) => {
      const taskObj = {
        id: `t${index}`, role: row[0], title: row[1], desc: row[2], period: row[3], 
        points: Number(row[4]), maxPoints: Number(row[4]), type: row[5], reqType: row[6], icon: ICON_MAP[row[7]] || <Activity />
      };
      if (row[0] === 'store') tasksObj.store.push(taskObj);
      if (row[0] === 'hq') tasksObj.hq.push(taskObj);
    });

    setAppData({
      settings: { startDate: settingsObj['活動開始日期'], endDate: settingsObj['活動結束日期'] },
      users: usersList,
      tasks: tasksObj,
      history: rawData.history ? rawData.history.slice(1) : []
    });
    return usersList;
  };

  // --- 登入與資料同步 ---
  const handleLogin = async (id, pw) => {
    setLoginLoading(true);
    try {
      const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) });
      const data = await res.json();
      
      if (data.status === 'success') {
        const parsedUsers = processGoogleSheetsData(data.data);
        const foundUser = parsedUsers.find(u => u.id === id && u.password === pw);
        if (foundUser) {
          setUser(foundUser);
        } else {
          alert('帳號或密碼錯誤！\n(如果一直登不進去，請檢查 Google 試算表的「員工名單」是否有建立您的資料)');
        }
      } else {
        alert('資料庫回應錯誤：' + data.message);
      }
    } catch (e) { alert("無法連線到資料庫！請確認 GAS 網址是否正確且權限已設為「所有人」。"); }
    setLoginLoading(false);
  };

  const refreshHistoryOnly = async () => {
    try {
      const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) });
      const data = await res.json();
      if (data.status === 'success') processGoogleSheetsData(data.data);
    } catch (e) { console.error(e); }
  };

  // --- 判斷任務是否完成 ---
  const myHistory = appData.history.filter(r => r[3] === user?.id);
  const checkTaskStatus = (taskTitle, dateStr) => myHistory.some(row => row[1] === dateStr && row[6] === taskTitle);
  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/');

  // --- 上傳打卡 ---
  const completeTask = async (taskData, earnedPoints, photoPreview, selectedColleague, isRetro, retroDate) => {
    setLoading(true);
    let base64Photo = "";
    if (photoPreview) {
      try {
        const blob = await fetch(photoPreview).then(r => r.blob());
        base64Photo = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.error("照片處理失敗", e); }
    }

    const payload = {
      userId: user.id, userName: user.name, roleName: user.roleName, taskName: taskData.title,
      points: earnedPoints, isRetroactive: isRetro, retroDate: retroDate ? retroDate.replace(/-/g, '/') : null,
      witness: selectedColleague, photoData: base64Photo 
    };

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === "success") {
        alert(`🎉 打卡成功！`);
        refreshHistoryOnly(); 
        setActiveModalTask(null);
      } else { alert(result.message); }
    } catch (error) { alert("❌ 連線錯誤"); }
    setLoading(false);
  };

  // --- 🏆 季度排行榜計算邏輯 ---
  const leaderboard = appData.users.map(u => {
    const seasonPoints = appData.history
      .filter(r => r[3] === u.id)
      .filter(r => {
        const recordDate = r[1];
        if (!appData.settings.startDate || !appData.settings.endDate) return true; 
        return recordDate >= appData.settings.startDate && recordDate <= appData.settings.endDate;
      })
      .reduce((sum, r) => sum + (Number(r[7]) || 0), 0);
    return { ...u, total: u.initialPoints + seasonPoints };
  }).sort((a, b) => b.total - a.total);

  if (!user) return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
  
  const currentTotalPoints = user.initialPoints + myHistory.reduce((sum, r) => sum + (Number(r[7]) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      
      <header className="bg-white p-6 shadow-sm rounded-b-3xl max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{user.roleName}</span>
          <button onClick={() => setUser(null)}><LogOut size={20} className="text-slate-400 hover:text-red-500" /></button>
        </div>
        <h1 className="text-2xl font-black">{user.name}，你好！</h1>
        
        <p className="text-xs text-slate-400 font-bold mt-2 mb-1 flex items-center">
           <Calendar className="w-3 h-3 mr-1" /> 本季賽事：{appData.settings.startDate || '未設定'} ~ {appData.settings.endDate || '未設定'}
        </p>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
          <p className="text-sm opacity-80 mb-1">目前累積總點數</p>
          <p className="text-4xl font-black">{currentTotalPoints} pt</p>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto mt-2">
        
        {/* 【今日任務】 */}
        {activeTab === 'tasks' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">今日挑戰 ({todayStr})</h3>
            {(appData.tasks[user.role] || []).map(t => {
              const isDone = checkTaskStatus(t.title, todayStr);
              return (
                <div key={t.id} onClick={() => { if (!isDone) { setIsModalRetro(false); setActiveModalTask(t); } }} className={`bg-white p-4 rounded-2xl flex items-center justify-between border ${isDone ? 'opacity-50 bg-slate-50' : 'shadow-sm active:scale-95 cursor-pointer hover:border-blue-300'}`}>
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

        {/* 【補登申請】 */}
        {activeTab === 'retro' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">補登過去未完成的任務</h3>
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl mb-4 shadow-sm">
              <p className="text-sm text-orange-600 font-bold mb-2">1. 選擇要補登的日期：</p>
              <input type="date" min={minRetroDate} max={maxRetroDate} className="w-full border-2 border-orange-200 p-3 rounded-xl text-slate-700 font-bold bg-white focus:border-orange-400 focus:outline-none" value={modalRetroDate} onChange={e => setModalRetroDate(e.target.value)} />
            </div>
            
            <p className="text-sm text-slate-500 font-bold mb-2 ml-1">2. 選擇任務：</p>
            {(appData.tasks[user.role] || []).filter(t => t.period !== '每月').map(t => (
              <div key={t.id} onClick={() => {
                if (!modalRetroDate) return alert('請先在上方選擇您要補登的日期！');
                setIsModalRetro(true); setActiveModalTask(t);
              }} className="bg-white p-4 rounded-2xl flex items-center justify-between border shadow-sm cursor-pointer hover:border-orange-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">{t.icon}</div>
                  <p className="font-bold">{t.title}</p>
                </div>
                <ChevronRight className="text-slate-300" />
              </div>
            ))}
          </div>
        )}

        {/* 【英雄排行榜】 */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2 ml-1">
              <h3 className="font-bold text-slate-500 text-sm">🏆 賽季英雄榜</h3>
              <button onClick={refreshHistoryOnly} className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg">更新數據</button>
            </div>
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
              {leaderboard.map((u, index) => (
                <div key={u.id} className={`flex items-center justify-between p-4 ${index !== leaderboard.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className="font-black text-slate-300 w-4 text-center text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</div>
                    <div>
                      <p className="font-bold text-slate-800">{u.name} {u.id === user.id && <span className="ml-2 bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">你</span>}</p>
                      <p className="text-[10px] text-slate-400">{u.roleName}</p>
                    </div>
                  </div>
                  <span className="font-black text-lg text-blue-600">{u.total} pt</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 【歷史查帳】 */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-slate-500 text-sm ml-1">個人歷史紀錄</h3>
            {myHistory.slice().reverse().map((row, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border-l-4 border-blue-500 mb-3">
                <div>
                  <p className="font-bold text-sm text-slate-800">{row[6]}</p>
                  <p className="text-xs text-slate-400 mt-1">{row[1]} · {row[2]}</p>
                  {row[8] !== '無' && <p className="text-[10px] text-slate-500 mt-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500"/>見證: {row[8]}</p>}
                </div>
                <div className="text-right">
                  <span className="text-blue-600 font-black text-lg">+{row[7]} pt</span>
                  {row[9] !== "無照片" && <p className="text-[10px] text-emerald-500 font-bold mt-1 bg-emerald-50 inline-block px-2 py-1 rounded-md">已傳佐證</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部導覽列 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t flex justify-around p-3 max-w-md mx-auto rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
        <NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<LayoutDashboard />} label="任務" />
        <NavBtn active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<Calendar />} label="補登" />
        <NavBtn active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy />} label="英雄榜" />
        <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="查帳" />
      </nav>

      {/* 打卡彈窗 */}
      {activeModalTask && (
        <TaskModal 
          task={activeModalTask} isRetro={isModalRetro} retroDate={modalRetroDate} 
          onClose={() => setActiveModalTask(null)} onSubmit={completeTask} loading={loading} 
        />
      )}

      {/* 🌟 PWA 安裝提示橫幅 (正確的位置在這裡！) */}
      {showPwaPrompt && (
        <div className="fixed top-4 left-4 right-4 bg-slate-800 text-white p-4 rounded-2xl shadow-2xl z-50 flex justify-between items-center animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-xl text-white"><Download size={20} /></div>
            <div>
              <p className="font-bold text-sm">加到手機桌面</p>
              <p className="text-xs text-slate-300">一鍵開啟，打卡更快速！</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setShowPwaPrompt(false)} className="px-3 py-2 text-xs font-bold text-slate-300">稍後</button>
            <button onClick={installPwa} className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-lg">立即安裝</button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- 輔助元件 ---
function LoginScreen({ onLogin, loading }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl text-center">
        <Activity className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-800 mb-8">良興健康存摺 2.0</h2>
        <input type="text" placeholder="員編 (請確保 Sheet 有資料)" value={id} onChange={e => setId(e.target.value)} className="w-full border-2 p-4 rounded-2xl mb-4 font-bold focus:border-blue-500 focus:outline-none" />
        <input type="password" placeholder="密碼" value={pw} onChange={e => setPw(e.target.value)} className="w-full border-2 p-4 rounded-2xl mb-8 font-bold focus:border-blue-500 focus:outline-none" />
        <button disabled={loading} onClick={() => onLogin(id, pw)} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-lg shadow-lg disabled:bg-slate-400">
          {loading ? '資料同步下載中...' : '登入帳戶'}
        </button>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1 w-16 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
      {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function TaskModal({ task, isRetro, retroDate, onClose, onSubmit, loading }) {
  const [stepInput, setStepInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedColleague, setSelectedColleague] = useState('');
  const fileInputRef = useRef(null);

  const handleModalSubmit = () => {
    let finalPoints = task.type === 'steps' ? Math.min(Math.floor(parseInt(stepInput||0) / 3000), task.maxPoints) : task.points;
    if (task.type === 'steps' && finalPoints === 0) return alert("步數未達最低標準 (3000步)！");
    if (task.reqType === 'photo' && !photoPreview) return alert('需上傳照片佐證！');
    if (task.reqType === 'tag' && !selectedColleague) return alert('需選擇見證戰友！');
    onSubmit(task, finalPoints, photoPreview, selectedColleague, isRetro, retroDate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] p-6 pb-8 animate-in slide-in-from-bottom-4 fade-in">
        <div className="mb-6">
          <h3 className="text-xl font-bold flex items-center text-slate-800">{task.icon} <span className="ml-2">{task.title}</span></h3>
          <p className="text-sm text-slate-500 mt-2">{task.desc}</p>
          {isRetro && <div className="mt-3 bg-orange-50 border border-orange-200 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center"><Calendar className="w-4 h-4 mr-2" /> 補登申請: {retroDate}</div>}
        </div>
        
        {task.type === 'steps' && (
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">請輸入當日總步數</label>
            <input type="number" placeholder="例如：9500" value={stepInput} onChange={e => setStepInput(e.target.value)} className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-lg focus:border-blue-500 focus:outline-none" />
            {stepInput && <p className="text-xs text-blue-600 mt-2 font-bold text-right">預計可換取: {Math.min(Math.floor(parseInt(stepInput||0) / 3000), task.maxPoints)} pt</p>}
          </div>
        )}

        {task.reqType === 'photo' && (
          <div className="mb-5">
            <label className="text-xs font-bold text-slate-400 mb-1 block">請上傳佐證照片 (必填)</label>
            <input type="file" ref={fileInputRef} onChange={e => e.target.files[0] && setPhotoPreview(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 h-36 rounded-2xl flex flex-col items-center justify-center text-blue-500 font-bold overflow-hidden transition-colors">
              {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" /> : <><Upload className="w-8 h-8 mb-2 opacity-50"/>點擊上傳</>}
            </button>
          </div>
        )}

        {task.reqType === 'tag' && (
          <div className="mb-5">
           <label className="text-xs font-bold text-slate-400 mb-1 block">請輸入見證戰友姓名 (必填)</label>
           <input 
            type="text" 
            placeholder="例如：王小明" 
            value={selectedColleague} 
            onChange={e => setSelectedColleague(e.target.value)} 
            className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:outline-none" 
           />
         </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} className="p-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold transition-colors">取消返回</button>
          <button disabled={loading} onClick={handleModalSubmit} className={`p-4 text-white rounded-2xl font-bold transition-all ${isRetro ? 'bg-orange-500' : 'bg-blue-600'} disabled:bg-slate-300`}>
            {loading ? <span className="animate-pulse">上傳中...</span> : (isRetro ? '送出補登' : '確認打卡')}
          </button>
        </div>
      </div>
    </div>
  );
}