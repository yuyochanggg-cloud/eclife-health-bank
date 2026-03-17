import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Droplets, Zap, Flame, Stethoscope, 
  CheckCircle2, LogOut, Upload, ChevronRight, 
  History, Calendar, LayoutDashboard, Search, Trophy, Download, Megaphone, Heart, Loader2
} from 'lucide-react';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxmWPRhtDnVolPWxY__kEEpN8Sexl0JpOv4Pq3NAyWCRF4kTwkNV_aP7b3yW4llIFXF/exec";

const ICON_MAP = {
  'Activity': <Activity size={24} />, 'Droplets': <Droplets size={24} />, 'Zap': <Zap size={24} />,
  'Flame': <Flame size={24} />, 'Stethoscope': <Stethoscope size={24} />, 'Search': <Search size={24} />
};

const PHILOSOPHIES = [
  "人生、工作的結果 ＝ 思維方式Ｘ熱忱Ｘ能力", "以「作為人，何謂正確」來做出判斷", "以利他之心為出發點", "保持陽光向上的心", "懷有感恩之心", "要謙虛勿驕傲，要時常反省", "動機至善，以純粹之心，走人生之路", "以「你希望別人對待你的方式」來對待別人", "做個值得信賴的人", "小善如大惡，大善似無情", "精益求精、果敢地挑戰高目標", "抱有滲透到潛意識之中的強烈而持久的願望", "認真、拼命、集中注意力工作", "改變，而不是等待", "擁有真正的勇氣", "做「自燃型」的人", "膽大與心細兼備", "不斷的各方面學習成長，追求無限可能性", "以完美為目標", "不成功決不罷休，直到成功", "能力一定會進步", "1.01 法則和 0.99 法則", "認為不行的時候，正是挑戰的開始", "珍惜當下，馬上開始", "以人為本，以心為本的經營", "光明正大地追求利潤", "全員參與經營、同一步調", "遵循原理原則", "玻璃般透明經營的原則", "第一線同仁才是經營的核心", "以正確的數字為基礎開展工作", "人人有目標，事事有目標，日日有目標", "銷售最大化，費用最小化，時間最優化", "定價即經營", "樂觀地設想，悲觀地計畫，樂觀地執行", "重視德才兼備，貫徹實力主義", "重視夥伴關係", "率先以身作則，成為漩渦的中心", "不斷創新，今日重於昨日，明日重於今日", "重視溝通、懂得相互包容", "用心服務，站在顧客的角度思考", "最佳交接，齊心協力，達成目標", "實踐與知識並重", "傾聽顧客的聲音", "創造完美的服務", "體驗重於一切，找不到答案就去現場", "追求事物及步驟的簡單化", "貫徹一對一的原則", "貫徹雙重確認原則", "貫徹健全資產原則", "注重公私分明", "工匠般執著"
];

function EmployeeAvatar({ employeeId, className = "w-16 h-16" }) {
  const [imgSrc, setImgSrc] = useState(`https://img.eclife.com.tw/EDM/11501/avatars/${employeeId}.jpg`);
  const [errorCount, setErrorCount] = useState(0); 
  const handleError = () => {
    if (errorCount === 0) { setImgSrc(`https://img.eclife.com.tw/EDM/11501/avatars/${employeeId}.png`); setErrorCount(1); }
    else if (errorCount === 1) { setImgSrc(`https://img.eclife.com.tw/EDM/11501/avatars/${employeeId}.gif`); setErrorCount(2); }
    else setErrorCount(3);
  };
  if (errorCount === 3) return <div className={`${className} bg-blue-100 rounded-full flex items-center justify-center text-blue-500 flex-shrink-0 overflow-hidden`}><Activity size={24} /></div>;
  return <img src={imgSrc} onError={handleError} alt="Avatar" className={`${className} rounded-full object-cover shadow-sm bg-black border-2 border-white flex-shrink-0`} />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(""); 
  const [loginLoading, setLoginLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const [appData, setAppData] = useState({
    settings: { startDate: '', endDate: '', bulletin: '' },
    tasks: { store: [], hq: [] },
    users: [],
    history: [] 
  });
  
  const [activeModalTask, setActiveModalTask] = useState(null);
  const [isModalRetro, setIsModalRetro] = useState(false);
  const [modalRetroDate, setModalRetroDate] = useState('');

  const getTodayStr = () => new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowPwaPrompt(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt(); 
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPwaPrompt(false);
    setDeferredPrompt(null);
  };

  const processGoogleSheetsData = (rawData) => {
    if (!rawData) return [];
    const settingsObj = {};
    if (rawData.settings) rawData.settings.forEach(row => { if (row[0]) settingsObj[row[0]] = row[1]; });
    const usersList = Array.isArray(rawData.users) ? rawData.users.slice(1).map(row => ({
      id: row[0], password: row[1], name: row[2], role: row[3], roleName: row[4], initialPoints: Number(row[5]) || 0
    })) : [];
    const tasksObj = { store: [], hq: [] };
    if (Array.isArray(rawData.tasks)) rawData.tasks.slice(1).forEach((row, index) => {
      const taskObj = { id: `t${index}`, role: row[0], title: row[1], desc: row[2], period: row[3], points: Number(row[4]) || 0, maxPoints: Number(row[4]) || 0, type: row[5], reqType: row[6], icon: ICON_MAP[row[7]] || <Activity size={24} /> };
      if (row[0] === 'store') tasksObj.store.push(taskObj);
      if (row[0] === 'hq') tasksObj.hq.push(taskObj);
    });
    setAppData({
      settings: { startDate: settingsObj['活動開始日期'] || '', endDate: settingsObj['活動結束日期'] || '', bulletin: settingsObj['今日公告'] || '' },
      users: usersList,
      tasks: tasksObj,
      history: Array.isArray(rawData.history) ? rawData.history.slice(1) : []
    });
    return usersList;
  };

  const handleLogin = async (id, pw) => {
    setLoginLoading(true);
    try {
      const res = await fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getInitialData' }) 
      });
      const data = await res.json();
      if (data.status === 'success') {
        const parsedUsers = processGoogleSheetsData(data.data);
        const foundUser = parsedUsers.find(u => u.id === id && u.password === pw);
        if (foundUser) setUser(foundUser); else alert('帳號或密碼錯誤！');
      } else { alert("資料庫回傳錯誤：" + data.message); }
    } catch (e) { alert("無法連線至資料庫！請確認網址正確。"); }
    setLoginLoading(false);
  };

  const refreshHistoryOnly = async () => {
    try {
      const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) });
      const data = await res.json();
      if (data.status === 'success') processGoogleSheetsData(data.data);
    } catch (e) { console.error(e); }
  };

  // 🌟 週期判斷核心函數
  const isTaskDone = (task) => {
    if (!Array.isArray(appData.history) || !user) return false;
    const now = new Date();
    const todayStr = getTodayStr();

    if (task.period === '每日' || !task.period) {
      return appData.history.some(r => r[1] === todayStr && r[3] === user.id && r[6] === task.title);
    }

    if (task.period === '每週') {
      const currentMonday = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      currentMonday.setDate(diff);
      currentMonday.setHours(0, 0, 0, 0);
      return appData.history.some(r => {
        const recordDate = new Date(r[1]);
        return r[3] === user.id && r[6] === task.title && recordDate >= currentMonday;
      });
    }

    if (task.period === '每月') {
      const currentMonthStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      return appData.history.some(r => r[1].startsWith(currentMonthStr) && r[3] === user.id && r[6] === task.title);
    }
    return false;
  };

  const completeTask = async (taskData, earnedPoints, photoPreview, selectedColleague, isRetro, retroDate) => {
    setLoadingQuote(PHILOSOPHIES[Math.floor(Math.random() * PHILOSOPHIES.length)]);
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
      } catch (e) { console.error(e); }
    }
    const payload = { userId: user.id, userName: user.name, roleName: user.roleName, taskName: taskData.title, points: earnedPoints, isRetroactive: isRetro, retroDate: retroDate ? retroDate.replace(/-/g, '/') : null, witness: selectedColleague, photoData: base64Photo };
    try {
      const response = await fetch(GAS_API_URL, { 
        method: "POST", 
        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
        body: JSON.stringify(payload) 
      });
      const result = await response.json();
      const finalMsg = result.status === "success" ? "🎉 儲存成功！" : result.message;
      alert(finalMsg); 
      if (result.status === "success") {
        refreshHistoryOnly();
        setActiveModalTask(null);
      }
    } catch (error) { alert("❌ 連線失敗"); }
    setLoading(false);
  };

  const getLeaderboard = () => {
    if (!Array.isArray(appData.users)) return [];
    return appData.users.map(u => {
      const seasonPoints = appData.history.filter(r => r[3] === u.id).filter(r => {
        const recordDate = r[1];
        if (!appData.settings.startDate || !appData.settings.endDate) return true; 
        return recordDate >= appData.settings.startDate && recordDate <= appData.settings.endDate;
      }).reduce((sum, r) => sum + (Number(r[7]) || 0), 0);
      return { ...u, total: (u.initialPoints || 0) + seasonPoints };
    }).sort((a, b) => b.total - a.total);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
  const myHistory = appData.history.filter(r => r[3] === user.id);
  const currentTotalPoints = (user.initialPoints || 0) + myHistory.reduce((sum, r) => sum + (Number(r[7]) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-800">
      
      {loading && (
        <div className="fixed inset-0 bg-blue-700 z-[999] flex flex-col items-center justify-center p-10 animate-in fade-in">
           <div className="text-center text-white max-w-sm">
              <div className="mb-12 relative">
                <Heart size={80} className="text-white fill-white/20 animate-pulse mx-auto" />
                <Loader2 size={110} className="text-white/40 animate-spin absolute inset-0 -top-4 mx-auto" />
              </div>
              <p className="text-sm font-black mb-6 opacity-80 tracking-[0.2em]">良興哲學充電站</p>
              <h2 className="text-3xl font-black leading-snug">「 {loadingQuote} 」</h2>
              <p className="mt-20 text-base font-bold text-white/60 animate-bounce">健康點數儲存中...</p>
           </div>
        </div>
      )}

      {showPwaPrompt && (
        <div className="fixed top-5 left-5 right-5 bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-2xl z-[100] flex justify-between items-center animate-in slide-in-from-top-6 border border-slate-700">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Download size={24} /></div>
            <div><p className="font-bold text-base text-white">加到手機桌面</p><p className="text-xs text-slate-400 mt-0.5">打卡更快速！</p></div>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => setShowPwaPrompt(false)} className="px-3 py-2 text-sm font-bold text-slate-400">稍後</button>
            <button onClick={installPwa} className="px-5 py-2 text-sm font-black bg-blue-600 text-white rounded-xl">安裝</button>
          </div>
        </div>
      )}

      <header className="bg-white p-7 shadow-sm rounded-b-[2.5rem] max-w-md mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
             <EmployeeAvatar employeeId={user.id} />
             <div>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wider">{user.roleName}</span>
                <h1 className="text-2xl font-black text-slate-900 leading-tight mt-1">{user.name}</h1>
             </div>
          </div>
          <button onClick={() => setUser(null)} className="p-2"><LogOut size={26} className="text-slate-400" /></button>
        </div>

        {appData.settings.bulletin && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 mb-6 animate-pulse">
            <Megaphone className="text-amber-500 shrink-0" size={20} />
            <p className="text-sm text-amber-900 font-bold">{appData.settings.bulletin}</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 text-center">
          <p className="text-xs font-bold text-blue-100 mb-2 tracking-widest uppercase">Total Points</p>
          <p className="text-5xl font-black tracking-tighter">{currentTotalPoints} <span className="text-lg font-normal">pt</span></p>
        </div>
      </header>

      <main className="p-6 max-w-md mx-auto">
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-bold text-slate-500 text-base ml-1">今日挑戰</h3>
            {(appData.tasks[user.role] || []).slice()
              .sort((a, b) => isTaskDone(a) - isTaskDone(b))
              .map(t => {
                const done = isTaskDone(t);
                return (
                  <div key={t.id} onClick={() => { if (!done) { setIsModalRetro(false); setActiveModalTask(t); } }} className={`bg-white p-5 rounded-[1.5rem] flex items-center justify-between border-2 transition-all ${done ? 'opacity-50 grayscale bg-slate-50 border-transparent shadow-none' : 'border-white shadow-md active:scale-95 cursor-pointer hover:border-blue-200'}`}>
                    <div className="flex items-center space-x-5">
                      <div className={`p-4 rounded-2xl ${done ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>{t.icon}</div>
                      <div>
                        <p className={`text-lg font-bold ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.title}</p>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">{t.period}</span>
                      </div>
                    </div>
                    {done ? <CheckCircle2 className="text-emerald-500 w-8 h-8" /> : <ChevronRight className="text-slate-300 w-6 h-6" />}
                  </div>
                );
            })}
          </div>
        )}

        {activeTab === 'retro' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-bold text-slate-500 text-base ml-1">補登過去任務</h3>
            <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[1.5rem] mb-6 shadow-sm">
              <p className="text-base text-orange-800 font-bold mb-3">1. 選擇補登日期：</p>
              <input type="date" className="w-full border-2 border-orange-200 p-4 rounded-2xl text-lg text-slate-700 font-bold focus:border-orange-400 outline-none" value={modalRetroDate} onChange={e => setModalRetroDate(e.target.value)} />
            </div>
            {(appData.tasks[user.role] || []).filter(t => t.period !== '每月').map(t => (
              <div key={t.id} onClick={() => { if (!modalRetroDate) return alert('請先選擇日期！'); setIsModalRetro(true); setActiveModalTask(t); }} className="bg-white p-5 rounded-[1.5rem] flex items-center justify-between border-2 border-white shadow-md cursor-pointer hover:border-orange-200">
                <div className="flex items-center space-x-5">
                  <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl">{t.icon}</div>
                  <p className="text-lg font-bold text-slate-800">{t.title}</p>
                </div>
                <ChevronRight className="text-slate-300 w-6 h-6" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
           <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-2 ml-1">
                 <h3 className="font-bold text-slate-500 text-base">🏆 賽季英雄榜</h3>
                 <button onClick={refreshHistoryOnly} className="text-sm text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-xl">更新</button>
              </div>
              <div className="bg-white rounded-[2rem] p-3 shadow-md border border-slate-100">
                {getLeaderboard().map((u, index) => (
                  <div key={u.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
                    <div className="flex items-center space-x-4">
                      <div className="font-black text-slate-300 w-6 text-center text-lg">{index+1}</div>
                      <EmployeeAvatar employeeId={u.id} className="w-12 h-12 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-800 truncate">{u.name} {u.id === user.id && <span className="ml-1 text-[10px] text-blue-500 font-bold">(你)</span>}</p>
                        <p className="text-[10px] text-slate-400 truncate uppercase">{u.roleName}</p>
                      </div>
                    </div>
                    <span className="font-black text-lg text-blue-600 flex-shrink-0 ml-2">{u.total} pt</span>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-4 animate-in fade-in">
              <h3 className="font-bold text-slate-500 text-base ml-1">個人紀錄查詢</h3>
              {myHistory.slice().reverse().map((row, i) => (
                <div key={i} className="bg-white p-6 rounded-[1.5rem] flex justify-between items-center shadow-sm border-l-[6px] border-blue-500 mb-4 text-slate-800">
                  <div><p className="font-bold text-lg">{row[6]}</p><p className="text-sm text-slate-400 font-bold mt-1">{row[1]}</p></div>
                  <span className="text-blue-700 font-black text-2xl">+{row[7]}</span>
                </div>
              ))}
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t flex justify-around p-5 max-w-md mx-auto rounded-t-[2.5rem] shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)] z-40">
        <NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<LayoutDashboard />} label="任務" />
        <NavBtn active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<Calendar />} label="補登" />
        <NavBtn active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy />} label="英雄榜" />
        <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="查詢" />
      </nav>

      {activeModalTask && (
        <TaskModal task={activeModalTask} isRetro={isModalRetro} retroDate={modalRetroDate} onClose={() => setActiveModalTask(null)} onSubmit={completeTask} loading={loading} />
      )}
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center space-y-2 w-20 transition-all ${active ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
      {React.cloneElement(icon, { size: 28, strokeWidth: active ? 2.5 : 2 })}
      <span className={`text-xs font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}

function LoginScreen({ onLogin, loading }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-600 to-indigo-800 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-md p-12 rounded-[3.5rem] shadow-2xl text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 text-blue-600 shadow-inner"><Activity size={48} /></div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">健康存摺 2.0</h2>
        <div className="space-y-6 mt-8 text-left">
          <label className="text-xs font-bold text-slate-400 ml-2">員工編號</label>
          <input type="text" placeholder="例如: 1001" value={id} onChange={e => setId(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold focus:border-blue-500 outline-none" />
          <label className="text-xs font-bold text-slate-400 ml-2">登入密碼</label>
          <input type="password" placeholder="請輸入密碼" value={pw} onChange={e => setPw(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold focus:border-blue-500 outline-none" />
        </div>
        <button disabled={loading} onClick={() => onLogin(id, pw)} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl shadow-xl mt-12 active:scale-95">{loading ? '同步中...' : '登入存摺'}</button>
      </div>
    </div>
  );
}

function TaskModal({ task, isRetro, retroDate, onClose, onSubmit, loading }) {
  const [stepInput, setStepInput] = useState(''); const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedColleague, setSelectedColleague] = useState(''); const fileInputRef = useRef(null);
  const handleModalSubmit = () => {
    let finalPoints = task.type === 'steps' ? Math.min(Math.floor(parseInt(stepInput||0) / 3000), task.maxPoints) : task.points;
    if (task.type === 'steps' && finalPoints === 0) return alert("未達 3000 步！");
    if (task.reqType === 'photo' && !photoPreview) return alert('需上傳照片！');
    if (task.reqType === 'tag' && !selectedColleague) return alert('需輸入見證人！');
    onSubmit(task, finalPoints, photoPreview, selectedColleague, isRetro, retroDate);
  };
  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 pb-10 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
        <div className="mb-8 text-center">
             <div className="inline-block p-5 bg-blue-50 text-blue-600 rounded-[1.8rem] mb-4">{task.icon}</div>
             <h3 className="text-2xl font-black text-slate-800">{task.title}</h3>
             <p className="text-base text-slate-500 mt-2 font-medium">{task.desc}</p>
        </div>
        {task.type === 'steps' && <input type="number" placeholder="今日總步數" value={stepInput} onChange={e => setStepInput(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl font-black text-2xl mb-6 focus:border-blue-500 outline-none" />}
        {task.reqType === 'photo' && (
          <div className="mb-6">
            <input type="file" ref={fileInputRef} onChange={e => e.target.files[0] && setPhotoPreview(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 bg-slate-50 h-52 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 font-black overflow-hidden transition-all hover:bg-blue-50">
              {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" /> : <><Upload size={40} className="mb-3 opacity-30"/>點擊啟動相機</>}
            </button>
          </div>
        )}
        {task.reqType === 'tag' && <input type="text" placeholder="見證戰友姓名" value={selectedColleague} onChange={e => setSelectedColleague(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl font-black text-xl mb-6 focus:border-blue-500 outline-none" />}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onClose} className="p-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-lg transition-all active:scale-95">返回</button>
          <button disabled={loading} onClick={handleModalSubmit} className={`p-5 text-white rounded-2xl font-black text-lg shadow-xl ${isRetro ? 'bg-orange-500' : 'bg-blue-600'} active:scale-95`}>{loading ? '正在傳送...' : '確認完成'}</button>
        </div>
      </div>
    </div>
  );
}