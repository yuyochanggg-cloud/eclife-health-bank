import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Droplets, Zap, Flame, Stethoscope, 
  CheckCircle2, LogOut, Upload, ChevronRight, 
  History, Calendar, LayoutDashboard, Search, Trophy, Download, Megaphone, Heart, Loader2, Timer, Users, Award
} from 'lucide-react';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxmWPRhtDnVolPWxY__kEEpN8Sexl0JpOv4Pq3NAyWCRF4kTwkNV_aP7b3yW4llIFXF/exec";

const ICON_MAP = {
  'Activity': <Activity size={24} />, 'Droplets': <Droplets size={24} />, 'Zap': <Zap size={24} />,
  'Flame': <Flame size={24} />, 'Stethoscope': <Stethoscope size={24} />, 'Search': <Search size={24} />
};

const FALLBACK_PHILOSOPHIES = [
  { quote: "良興人，動起來！", bridge: "健康點數儲存中，讓今天的汗水成為明天的底氣" }
];

const FALLBACK_MILESTONES = [
  { title: "Lv. 1 🌱 暖身起步者", threshold: 0, desc: "千里之行，始於足下！穿上球鞋準備出發。" },
  { title: "Lv. 2 🚶‍♂️ 微流汗新星", threshold: 80, desc: "身體開始甦醒，多喝水，保持好節奏！" },
  { title: "Lv. 3 🏃‍♀️ 活力發電廠", threshold: 200, desc: "習慣正在成形！你的新陳代謝已經煥然一新。" },
  { title: "Lv. 4 🛡️ 鋼鐵免疫力", threshold: 400, desc: "體能大躍進！現在的你，擁有對抗疲勞的強大護盾。" },
  { title: "Lv. 5 🔥 核心燃脂將", threshold: 600, desc: "高度自律的展現！你是團隊中不可或缺的健康戰力。" },
  { title: "Lv. 6 👑 巔峰體能王", threshold: 750, desc: "頂尖的健康紀律！你的體能狀態已達到本次賽季巔峰。" }
];

const getLocalYMD = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

function SocialWall({ history }) {
  const [idx, setIdx] = useState(0);
  const recent = Array.isArray(history) ? [...history].reverse().slice(0, 5) : [];

  useEffect(() => {
    if (recent.length <= 1) return;
    const interval = setInterval(() => { setIdx(prev => (prev + 1) % recent.length); }, 3500);
    return () => clearInterval(interval);
  }, [recent.length]);

  if (recent.length === 0) return null;
  const row = recent[idx];
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-[1.2rem] mb-6 shadow-sm flex items-center space-x-4 overflow-hidden text-left">
      <div className="p-2.5 bg-white rounded-xl shadow-sm flex-shrink-0"><Zap className="text-blue-500 w-5 h-5 animate-pulse" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-blue-500 mb-1 uppercase tracking-widest">⚡ 源動力即時報</p>
        <div key={idx} className="text-[15px] font-bold text-slate-700 truncate animate-in slide-in-from-bottom-2 fade-in duration-500">
          🔥 <span className="text-blue-700">{row[5]} {row[4]}</span> 剛完成了 <span className="text-slate-900">{row[6]}</span> <span className="text-emerald-600">(+{row[7]}pt)</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState({ quote: "", bridge: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [lbMode, setLbMode] = useState('personal'); 

  // 🌟 狀態中新增 mascotUrl
  const [appData, setAppData] = useState({
    settings: { startDate: '', endDate: '', bulletin: '', mascotUrl: '' },
    philosophies: FALLBACK_PHILOSOPHIES,
    milestones: FALLBACK_MILESTONES,
    tasks: { store: [], hq: [] },
    users: [],
    history: [] 
  });
  
  const [activeModalTask, setActiveModalTask] = useState(null);
  const [isModalRetro, setIsModalRetro] = useState(false);
  const [modalRetroDate, setModalRetroDate] = useState('');

  const getTodayStr = () => new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/');

  const getCountdownDays = () => {
    if (!appData.settings.endDate) return null;
    const end = new Date(appData.settings.endDate);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 🌟 背景預先載入資料 (為了在登入前就能拿到首頁圖片)
  useEffect(() => {
    const fetchInitialDataBackground = async () => {
      try {
        const res = await fetch(GAS_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getInitialData' }) });
        const data = await res.json();
        if (data.status === 'success') processGoogleSheetsData(data.data);
      } catch (e) { console.log("背景預載入失敗，等待使用者手動登入觸發", e); }
    };
    fetchInitialDataBackground();

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
    
    // 🌟 解析設定包含 mascotUrl
    const settingsObj = { startDate: '', endDate: '', bulletin: '', mascotUrl: '' };
    const dynamicPhilosophies = [];
    const dynamicMilestones = [];
    
    if (rawData.settings) {
      rawData.settings.forEach(row => {
        if (row[0] === '活動開始日期') settingsObj.startDate = row[1];
        if (row[0] === '活動結束日期') settingsObj.endDate = row[1];
        if (row[0] === '今日公告') settingsObj.bulletin = row[1];
        if (row[0] === '首頁吉祥物') settingsObj.mascotUrl = row[1]; // 抓取圖片網址
        
        if (row[0] === '良興哲學' && row[1]) {
          dynamicPhilosophies.push({ quote: row[1], bridge: row[2] || "健康點數持續寫入中，休息一下吧！" });
        }
        if (row[0] === '健康里程碑' && row[1]) {
          dynamicMilestones.push({ title: row[1], threshold: Number(row[2]) || 0, desc: row[3] || "" });
        }
      });
    }

    if (dynamicMilestones.length > 0) dynamicMilestones.sort((a,b) => a.threshold - b.threshold);

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
      settings: settingsObj,
      philosophies: dynamicPhilosophies.length > 0 ? dynamicPhilosophies : FALLBACK_PHILOSOPHIES,
      milestones: dynamicMilestones.length > 0 ? dynamicMilestones : FALLBACK_MILESTONES,
      users: usersList, tasks: tasksObj, history: Array.isArray(rawData.history) ? rawData.history.slice(1) : []
    });
    return usersList;
  };

  const handleLogin = async (id, pw) => {
    setLoginLoading(true);
    try {
      const res = await fetch(GAS_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getInitialData' }) });
      const data = await res.json();
      if (data.status === 'success') {
        const parsedUsers = processGoogleSheetsData(data.data);
        const foundUser = parsedUsers.find(u => u.id === id && u.password === pw);
        if (foundUser) setUser(foundUser); else alert('帳號或密碼錯誤！');
      }
    } catch (e) { alert("無法連線至資料庫！"); }
    setLoginLoading(false);
  };

  const refreshHistoryOnly = async () => {
    try {
      const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) });
      const data = await res.json();
      if (data.status === 'success') processGoogleSheetsData(data.data);
    } catch (e) { console.error(e); }
  };

  const isTaskDone = (task) => {
    if (!Array.isArray(appData.history) || !user) return false;
    const now = new Date();
    const todayStr = getTodayStr();
    if (task.period === '每日' || !task.period) return appData.history.some(r => r[1] === todayStr && r[3] === user.id && r[6] === task.title);
    if (task.period === '每週') {
      const currentMonday = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      currentMonday.setDate(diff); currentMonday.setHours(0, 0, 0, 0);
      return appData.history.some(r => { const recordDate = new Date(r[1]); return r[3] === user.id && r[6] === task.title && recordDate >= currentMonday; });
    }
    if (task.period === '每月') {
      const currentMonthStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      return appData.history.some(r => r[1].startsWith(currentMonthStr) && r[3] === user.id && r[6] === task.title);
    }
    return false;
  };

  const completeTask = async (taskData, earnedPoints, photoPreview, selectedColleague, isRetro, retroDate) => {
    const randomItem = appData.philosophies[Math.floor(Math.random() * appData.philosophies.length)];
    setLoadingQuote(randomItem);
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
      const response = await fetch(GAS_API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
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

  const getPersonalLeaderboard = () => {
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

  const getTeamLeaderboard = () => {
    if (!Array.isArray(appData.users)) return [];
    const teamStats = {};
    appData.users.forEach(u => {
      const userPoints = appData.history.filter(r => r[3] === u.id).filter(r => {
        const recordDate = r[1];
        if (!appData.settings.startDate || !appData.settings.endDate) return true; 
        return recordDate >= appData.settings.startDate && recordDate <= appData.settings.endDate;
      }).reduce((sum, r) => sum + (Number(r[7]) || 0), 0);
      const total = (u.initialPoints || 0) + userPoints;

      if (!teamStats[u.roleName]) teamStats[u.roleName] = { totalPoints: 0, count: 0 };
      teamStats[u.roleName].totalPoints += total;
      teamStats[u.roleName].count += 1;
    });

    return Object.keys(teamStats).map(name => ({
      name,
      avgPoints: Math.round(teamStats[name].totalPoints / teamStats[name].count),
      count: teamStats[name].count
    })).sort((a, b) => b.avgPoints - a.avgPoints);
  };

  // 🌟 將 mascotUrl 傳給 LoginScreen
  if (!user) return <LoginScreen onLogin={handleLogin} loading={loginLoading} mascotUrl={appData.settings.mascotUrl} />;
  
  const myHistory = appData.history.filter(r => r[3] === user.id);
  const currentTotalPoints = (user.initialPoints || 0) + myHistory.reduce((sum, r) => sum + (Number(r[7]) || 0), 0);
  const countdownDays = getCountdownDays();

  const currentMilestoneIndex = appData.milestones.slice().reverse().findIndex(m => currentTotalPoints >= m.threshold);
  const realCurrentIndex = currentMilestoneIndex === -1 ? 0 : appData.milestones.length - 1 - currentMilestoneIndex;
  const currentMilestone = appData.milestones[realCurrentIndex] || appData.milestones[0];
  const nextMilestone = appData.milestones[realCurrentIndex + 1] || null;
  const progressPercent = nextMilestone 
    ? Math.min(100, Math.max(0, ((currentTotalPoints - currentMilestone.threshold) / (nextMilestone.threshold - currentMilestone.threshold)) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-800 text-left">
      
      {loading && (
        <div className="fixed inset-0 bg-blue-700 z-[999] flex flex-col items-center justify-center p-8 animate-in fade-in">
           <div className="text-center text-white max-w-sm">
              <div className="mb-10 relative">
                <Heart size={72} className="text-white fill-white/20 animate-pulse mx-auto" />
                <Loader2 size={100} className="text-white/40 animate-spin absolute inset-0 -top-3.5 mx-auto" />
              </div>
              <h3 className="text-lg font-bold opacity-80 mb-6 tracking-wider leading-relaxed px-4">「 {loadingQuote.quote} 」</h3>
              <div className="h-1.5 w-20 bg-white/20 mx-auto mb-8 rounded-full overflow-hidden">
                 <div className="h-full bg-white animate-progress w-full origin-left"></div>
              </div>
              <h2 className="text-[22px] font-black leading-snug tracking-tight mb-16 px-4">{loadingQuote.bridge}</h2>
              <p className="text-base font-black text-white/60 animate-pulse flex items-center justify-center"><Activity size={20} className="mr-2" /> 健康點數儲存中...</p>
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
             <EmployeeAvatar employeeId={user.id} className="w-14 h-14" />
             <div className="text-left">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">{user.roleName}</span>
                <h1 className="text-2xl font-black text-slate-900 leading-tight mt-1.5">{user.name}</h1>
             </div>
          </div>
          <button onClick={() => setUser(null)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><LogOut size={22} className="text-slate-400" /></button>
        </div>

        <div className="flex justify-between items-center mb-5 px-1">
          <p className="text-xs text-slate-500 font-bold flex items-center tracking-wide">
             <Calendar className="w-4 h-4 mr-1.5 opacity-70" /> 賽季: {appData.settings.startDate || '--'} ~ {appData.settings.endDate || '--'}
          </p>
          {countdownDays !== null && (
            <span className="flex items-center text-xs font-black bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 rounded-xl shadow-sm">
              <Timer className="w-3.5 h-3.5 mr-1" /> 倒數 {countdownDays} 天
            </span>
          )}
        </div>

        {appData.settings.bulletin && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 mb-6 shadow-sm">
            <Megaphone className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-amber-900 font-bold leading-relaxed">{appData.settings.bulletin}</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
          
          <p className="text-sm font-bold text-blue-100 mb-2 uppercase tracking-widest text-center relative z-10">累積健康資產</p>
          <p className="text-6xl font-black tracking-tighter text-center mb-8 relative z-10">{currentTotalPoints} <span className="text-2xl font-bold opacity-80">pt</span></p>
          
          <div className="bg-white/10 p-5 rounded-2xl text-left backdrop-blur-md border border-white/20 relative z-10">
             <div className="flex justify-between items-end mb-4">
               <div>
                 <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-md text-white font-bold uppercase tracking-widest block w-max mb-2">Current Level</span>
                 <p className="font-black text-lg tracking-wide">{currentMilestone.title}</p>
               </div>
               {nextMilestone ? (
                 <div className="text-right">
                   <p className="text-[11px] font-bold text-blue-100 mb-1">距離 {nextMilestone.title}</p>
                   <p className="text-xs font-black text-white bg-blue-900/40 px-2.5 py-1 rounded-lg">還差 <span className="text-emerald-300 text-sm mx-0.5">{nextMilestone.threshold - currentTotalPoints}</span> 點</p>
                 </div>
               ) : (
                 <p className="text-sm font-black text-emerald-300 bg-emerald-900/30 px-3 py-1.5 rounded-lg">已達最高峰！</p>
               )}
             </div>
             <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden mb-3.5 shadow-inner">
               <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-1000 relative" style={{ width: `${progressPercent}%` }}>
                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
               </div>
             </div>
             <p className="text-xs text-blue-50 font-bold leading-relaxed opacity-95">{currentMilestone.desc}</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-md mx-auto">
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in fade-in">
            <SocialWall history={appData.history} />

            <h3 className="font-black text-slate-400 text-sm ml-2 uppercase tracking-widest mb-2 text-left">今日健康任務</h3>
            {(appData.tasks[user.role] || []).slice()
              .sort((a, b) => isTaskDone(a) - isTaskDone(b))
              .map(t => {
                const done = isTaskDone(t);
                return (
                  <div key={t.id} onClick={() => { if (!done) { setIsModalRetro(false); setActiveModalTask(t); } }} className={`bg-white p-5 rounded-[1.5rem] flex items-center justify-between border-2 transition-all text-left ${done ? 'opacity-50 grayscale bg-slate-50 border-transparent shadow-none' : 'border-white shadow-md active:scale-95 cursor-pointer hover:border-blue-200'}`}>
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`p-4 rounded-2xl flex-shrink-0 ${done ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>{t.icon}</div>
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <p className={`text-lg font-black truncate w-full text-left ${done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{t.title}</p>
                        <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-500 font-bold uppercase tracking-wider inline-block mt-1.5">{t.period}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {done ? <CheckCircle2 className="text-emerald-500 w-8 h-8" /> : <ChevronRight className="text-slate-300 w-7 h-7" />}
                    </div>
                  </div>
                );
            })}
          </div>
        )}

        {activeTab === 'retro' && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-slate-400 text-sm ml-2 uppercase tracking-widest mb-2 text-left">時光機補登</h3>
            <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[1.5rem] mb-6 shadow-sm text-left">
              <p className="text-base text-orange-800 font-black mb-3">1. 選擇補登日期 (限前2日)：</p>
              <input type="date" min={getLocalYMD(-2)} max={getLocalYMD(-1)} className="w-full border-2 border-orange-200 p-4 rounded-2xl text-xl text-slate-700 font-black focus:border-orange-400 outline-none bg-white" value={modalRetroDate} onChange={e => setModalRetroDate(e.target.value)} />
            </div>
            <p className="text-base text-slate-600 font-black mb-3 ml-2 text-left">2. 選擇要補登的任務：</p>
            {(appData.tasks[user.role] || []).filter(t => t.period !== '每月').map(t => (
              <div key={t.id} onClick={() => { if (!modalRetroDate) return alert('請先選擇日期！'); setIsModalRetro(true); setActiveModalTask(t); }} className="bg-white p-5 rounded-[1.5rem] flex items-center justify-between border-2 border-white shadow-md cursor-pointer hover:border-orange-200 active:scale-95 transition-all text-left">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl flex-shrink-0">{t.icon}</div>
                  <p className="text-lg font-black text-slate-800 truncate w-full text-left">{t.title}</p>
                </div>
                <ChevronRight className="text-slate-300 w-7 h-7 flex-shrink-0 ml-3" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
           <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-4 ml-2">
                 <h3 className="font-black text-slate-400 text-sm uppercase tracking-widest">英雄榜</h3>
                 <button onClick={refreshHistoryOnly} className="text-xs text-blue-600 font-black bg-blue-50 px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-sm">更新數據</button>
              </div>

              <div className="flex bg-slate-200 p-1.5 rounded-[1.2rem] mb-6 shadow-inner">
                 <button onClick={() => setLbMode('personal')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${lbMode === 'personal' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}>🏃 個人戰神</button>
                 <button onClick={() => setLbMode('team')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${lbMode === 'team' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}>🤝 部門榮譽</button>
              </div>

              <div className="bg-white rounded-[2rem] p-3 shadow-md border border-slate-100">
                {/* 🌟 只有這裡加了 .slice(0, 30) */}
                {lbMode === 'personal' && getPersonalLeaderboard().slice(0, 30).map((u, index) => (
                  <div key={u.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 text-left">
                    <div className="flex items-center space-x-4 w-full">
                      <div className={`font-black w-7 text-center text-xl flex-shrink-0 ${index < 3 ? 'text-blue-500' : 'text-slate-300'}`}>{index+1}</div>
                      <EmployeeAvatar employeeId={u.id} className="w-12 h-12 flex-shrink-0" />
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[15px] font-black text-slate-800 truncate">{u.name} {u.id === user.id && <span className="ml-1 text-[10px] text-white bg-blue-500 px-1.5 py-0.5 rounded font-bold">(你)</span>}</p>
                        <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">{u.roleName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-black text-xl text-blue-600 block">{u.total}</span>
                        <span className="text-[10px] font-bold text-slate-400">pt</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 團隊榜沒動，顯示所有部門 */}
                {lbMode === 'team' && getTeamLeaderboard().map((dept, index) => (
                  <div key={dept.name} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 text-left">
                    <div className="flex items-center space-x-4 w-full">
                      <div className={`font-black w-7 text-center text-xl flex-shrink-0 ${index < 3 ? 'text-indigo-500' : 'text-slate-300'}`}>{index+1}</div>
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 flex-shrink-0"><Users size={22} /></div>
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-base font-black text-slate-800 truncate">{dept.name}</p>
                        <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">部門戰力：{dept.count} 人</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                         <span className="font-black text-2xl text-indigo-600 block">{dept.avgPoints}</span>
                         <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block -mt-1">Avg pt</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-4 animate-in fade-in">
              <h3 className="font-black text-slate-400 text-sm ml-2 uppercase tracking-widest mb-2 text-left">個人資產明細</h3>
              {myHistory.length === 0 && (
                <div className="text-center text-slate-300 py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-black">尚無健康資產</p>
                </div>
              )}
              {myHistory.slice().reverse().map((row, i) => (
                <div key={i} className="bg-white p-6 rounded-[1.5rem] flex justify-between items-center shadow-sm border-l-[6px] border-blue-500 mb-4 text-slate-800 text-left">
                  <div className="pr-4">
                    <p className="font-black text-[17px] mb-1">{row[6]}</p>
                    <p className="text-xs text-slate-400 font-bold tracking-wider">{row[1]} · {row[2]}</p>
                    {row[8] && row[8] !== '無' && <p className="text-xs text-slate-600 mt-2.5 flex items-center font-bold bg-slate-50 p-2 rounded-lg border border-slate-100 inline-flex"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500"/>見證者: {row[8]}</p>}
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-blue-600 font-black text-3xl flex-shrink-0">+{row[7]}</span>
                    {row[9] && row[9] !== "無照片" && <p className="text-[10px] text-emerald-700 font-black mt-2 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 whitespace-nowrap">📸 已附圖</p>}
                  </div>
                </div>
              ))}
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around p-5 max-w-md mx-auto rounded-t-[2.5rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] z-40">
        <NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<LayoutDashboard />} label="任務" />
        <NavBtn active={activeTab === 'retro'} onClick={() => setActiveTab('retro')} icon={<Calendar />} label="補登" />
        <NavBtn active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy />} label="英雄榜" />
        <NavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="明細" />
      </nav>

      {activeModalTask && (
        <TaskModal user={user} task={activeModalTask} isRetro={isModalRetro} retroDate={modalRetroDate} onClose={() => setActiveModalTask(null)} onSubmit={completeTask} loading={loading} />
      )}
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center space-y-2 w-20 transition-all ${active ? 'text-blue-600 scale-110 font-black' : 'text-slate-400 font-bold hover:text-slate-500'}`}>
      {React.cloneElement(icon, { size: active ? 28 : 26, strokeWidth: active ? 2.5 : 2 })}
      <span className={`text-[11px] ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
}

function LoginScreen({ onLogin, loading, mascotUrl }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-700 to-indigo-900 flex items-center justify-center p-6 font-sans relative overflow-hidden text-left">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="bg-white/95 backdrop-blur-xl w-full max-w-md p-10 rounded-[3rem] shadow-2xl text-center relative z-10 border border-white/20">
        
        <img 
          src={mascotUrl || "/1101109-HA-杯墊興爸.png"} 
          onError={(e) => { e.target.onerror = null; e.target.src = "/1101109-HA-杯墊興爸.png"; }}
          alt="首頁吉祥物" 
          className="h-36 mx-auto mb-4 object-contain drop-shadow-xl animate-in slide-in-from-bottom-4 duration-700" 
        />
        
        <h2 className="text-[32px] font-black text-slate-800 mb-1 tracking-tight">良興動起來</h2>
        <p className="text-blue-600 text-sm font-black mb-10 tracking-[0.2em] uppercase">LS DON DON DON</p>
        
        <div className="space-y-6 text-left">
          <div>
            <label className="text-[11px] font-black text-slate-400 ml-2 mb-1.5 block">🏃‍♂️ 專屬健康代碼 (您的員工編號)</label>
            <input type="text" placeholder="例: 1001" value={id} onChange={e => setId(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-xl font-black text-slate-700 focus:border-blue-500 outline-none shadow-inner bg-slate-50 focus:bg-white transition-all" />
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-400 ml-2 mb-1.5 block">🔑 活力解鎖金鑰 (您的登入密碼)</label>
            <input type="password" placeholder="請輸入密碼" value={pw} onChange={e => setPw(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl text-xl font-black text-slate-700 focus:border-blue-500 outline-none shadow-inner bg-slate-50 focus:bg-white transition-all" />
          </div>
        </div>
        
        <button disabled={loading} onClick={() => onLogin(id, pw)} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 mt-10 active:scale-95 transition-all hover:shadow-blue-300">
          {loading ? '正在同步數據庫...' : '啟動今日健康'}
        </button>
      </div>
    </div>
  );
}

function TaskModal({ user, task, isRetro, retroDate, onClose, onSubmit, loading }) {
  const [stepInput, setStepInput] = useState(''); const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedColleague, setSelectedColleague] = useState(''); const fileInputRef = useRef(null);

  const d = isRetro ? new Date(retroDate) : new Date();
  const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
  const isHQWeekendBonus = user.role === 'hq' && isWeekend && task.type === 'steps';
  const finalMax = isHQWeekendBonus ? task.maxPoints + 2 : task.maxPoints;

  const handleModalSubmit = () => {
    let finalPoints = task.type === 'steps' ? Math.min(Math.floor(parseInt(stepInput||0) / 3000), finalMax) : task.points;
    if (task.type === 'steps' && finalPoints === 0) return alert("未達 3000 步！");
    if (task.reqType === 'photo' && !photoPreview) return alert('需上傳照片！');
    if (task.reqType === 'tag' && !selectedColleague) return alert('需輸入見證人！');
    onSubmit(task, finalPoints, photoPreview, selectedColleague, isRetro, retroDate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 pb-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 text-left">
        <div className="mb-8 text-center">
             <div className="inline-block p-5 bg-blue-50 text-blue-600 rounded-[1.8rem] mb-4 shadow-inner">{task.icon}</div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">{task.title}</h3>
             <p className="text-[15px] text-slate-500 mt-2.5 font-bold leading-relaxed">{task.desc}</p>
             {isRetro && <div className="mt-4 text-orange-600 font-black bg-orange-50 py-1.5 px-4 rounded-xl inline-block text-sm border border-orange-100 shadow-sm">⏳ 補登日期: {retroDate}</div>}
        </div>
        
        {task.type === 'steps' && (
          <div className="mb-6">
             <input type="number" placeholder="請輸入設備上的總步數" value={stepInput} onChange={e => setStepInput(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl font-black text-2xl mb-2 focus:border-blue-500 outline-none shadow-sm bg-slate-50 focus:bg-white transition-colors text-center" />
             {stepInput && (
               <p className="text-sm text-blue-600 mt-2 font-black text-center bg-blue-50 py-2 rounded-xl">
                 🎉 預計換取: <span className="text-xl mx-1">{Math.min(Math.floor(parseInt(stepInput||0) / 3000), finalMax)}</span> pt
               </p>
             )}
             {isHQWeekendBonus && <p className="text-xs text-orange-600 font-black text-center mt-3 bg-orange-50 py-2.5 rounded-xl border border-orange-100">✨ 週末福利：後勤點數上限提高至 {finalMax} pt</p>}
          </div>
        )}

        {task.reqType === 'photo' && (
          <div className="mb-6">
            <input type="file" ref={fileInputRef} onChange={e => e.target.files[0] && setPhotoPreview(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 bg-slate-50 h-52 rounded-[2rem] flex flex-col items-center justify-center text-slate-500 font-black overflow-hidden transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500">
              {photoPreview ? <img src={photoPreview} className="h-full w-full object-cover" /> : <><Upload size={48} className="mb-4 opacity-50"/>點擊啟動相機上傳</>}
            </button>
          </div>
        )}

        {task.reqType === 'tag' && (
          <div className="mb-6">
             <input type="text" placeholder="請輸入戰友姓名" value={selectedColleague} onChange={e => setSelectedColleague(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-2xl font-black text-xl focus:border-blue-500 outline-none shadow-sm bg-slate-50 focus:bg-white transition-colors text-center" />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button onClick={onClose} className="p-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-lg transition-all active:scale-95 hover:bg-slate-200">返回</button>
          <button disabled={loading} onClick={handleModalSubmit} className={`p-5 text-white rounded-2xl font-black text-lg shadow-xl ${isRetro ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'} active:scale-95 transition-all`}>{loading ? '正在儲存...' : '確認完成'}</button>
        </div>
      </div>
    </div>
  );
}