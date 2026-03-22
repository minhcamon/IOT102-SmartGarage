import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import mqtt from 'mqtt';
import { ShieldAlert, CarFront, Radio, Loader2, Lock, Unlock, Power, DoorClosed, DoorOpen, ArrowUpDown, TriangleAlert, KeyRound } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const [garageState, setGarageState] = useState({
    door: 'CLOSED', // Can be OPEN, CLOSED, OPENING, CLOSING, DOOR_OPENED, DOOR_EMERGENCY etc.
    lock: 'UNLOCKED',
    parkingDistance: 0,
    alert: 'NONE',
  });

  const [loadingAction, setLoadingAction] = useState(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [rfidPassword, setRfidPassword] = useState('');

  // Refs for tracking changes
  const prevDoor = useRef(garageState.door);
  const prevLock = useRef(garageState.lock);

  // Toast notification effect
  useEffect(() => {
    const getMappedDoor = (door) => {
      if (door === 'OPEN') return 'DOOR_OPENED';
      if (door === 'CLOSED') return 'DOOR_CLOSED';
      return door;
    };

    const currentDoor = getMappedDoor(garageState.door);
    const pd = getMappedDoor(prevDoor.current);

    if (currentDoor !== pd && pd !== undefined) {
      if (currentDoor === 'DOOR_EMERGENCY') {
        toast.error('🚨 Phát hiện vật cản! Hệ thống đang tự động dội cửa lên!', {
          style: { background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }
        });
      }
      prevDoor.current = garageState.door;
    } else if (prevDoor.current === undefined) {
      prevDoor.current = garageState.door;
    }

    if (garageState.lock !== prevLock.current && prevLock.current !== undefined) {
      if (garageState.lock === 'LOCKED') {
        toast.success('🔒 Đã kích hoạt khóa cứng an toàn', {
          style: { background: '#dcfce7', color: '#166534', fontWeight: 'bold' }
        });
      } else if (garageState.lock === 'UNLOCKED') {
        toast('🔓 Hệ thống đã được mở khóa', {
          icon: 'ℹ️',
          style: { background: '#e0f2fe', color: '#075985', fontWeight: 'bold' }
        });
      }
      prevLock.current = garageState.lock;
    } else if (prevLock.current === undefined) {
      prevLock.current = garageState.lock;
    }
  }, [garageState.door, garageState.lock]);

  useEffect(() => {
    // 1. Fetch
    axios.get('http://localhost:3001/api/state')
      .then(res => setGarageState(res.data))
      .catch(err => console.error("API Error", err));

    // 2. MQTT
    const client = mqtt.connect(import.meta.env.VITE_MQTT_URL, {
      username: import.meta.env.VITE_MQTT_USER,
      password: import.meta.env.VITE_MQTT_PASS, // Lấy từ .env
      clientId: "frontend_" + Math.random().toString(16).substr(2, 8)
    });

    client.on('connect', () => {
      console.log('Connected to MQTT via Secure WebSocket (TLS)');
      client.subscribe('garage/status');
    });

    client.on('message', (topic, message) => {
      if (topic === 'garage/status') {
        const payloadStr = message.toString().trim();
        try {
          if (payloadStr.startsWith('{')) {
            const parsedData = JSON.parse(payloadStr);
            setGarageState(prevState => ({ ...prevState, ...parsedData }));
          } else if (['OPEN', 'CLOSED', 'DOOR_OPENED', 'DOOR_CLOSED', 'OPENING', 'CLOSING', 'DOOR_EMERGENCY'].includes(payloadStr)) {
            setGarageState(prevState => ({ ...prevState, door: payloadStr }));
          } else if (['LOCKED', 'UNLOCKED'].includes(payloadStr)) {
            setGarageState(prevState => ({ ...prevState, lock: payloadStr }));
          }
        } catch (error) {
          console.error('MQTT Parse error:', error);
        }
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  const sendCommand = async (action) => {
    try {
      setLoadingAction(action);
      const response = await axios.post('http://localhost:3001/api/command', { action });
      setTimeout(() => setLoadingAction(null), 800);
      return response.data.success;
    } catch (error) {
      console.error("Failed to send command", error);
      toast.error('Gửi lệnh thất bại! Vui lòng kiểm tra lại kết nối mạng hoặc Server.');
      setLoadingAction(null);
      return false;
    }
  };

  // Safe accessor to normalize raw OPEN/CLOSED to internal matching
  const doorState = garageState.door === 'OPEN' ? 'DOOR_OPENED' :
    garageState.door === 'CLOSED' ? 'DOOR_CLOSED' :
      garageState.door;

  // Add enum mappings
  const isEmergency = doorState === 'DOOR_EMERGENCY';
  const isOpened = doorState === 'DOOR_OPENED';
  const isClosed = doorState === 'DOOR_CLOSED';
  const isOpening = doorState === 'DOOR_OPENING';
  const isClosing = doorState === 'DOOR_CLOSING';
  const isProcessing = isOpening || isClosing;

  let doorUIClass = "bg-slate-50 border-slate-300 text-slate-600 border-4";
  let doorIcon = <DoorClosed size={100} className="text-slate-500 mb-2" />;
  let doorText = "CỬA ĐÃ ĐÓNG";

  if (isEmergency) {
    doorUIClass = "bg-red-600 border-red-800 text-white font-bold border-8 animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.6)]";
    doorIcon = <TriangleAlert size={120} className="text-white mb-2 drop-shadow-md" />;
    doorText = "🚨 NGUY HIỂM: PHÁT HIỆN VẬT CẢN!";
  } else if (isOpening) {
    doorUIClass = "bg-amber-100 border-amber-500 text-amber-700 animate-pulse border-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]";
    doorIcon = <ArrowUpDown size={100} className="text-amber-600 mb-2" />;
    doorText = "ĐANG MỞ CỬA...";
  } else if (isClosing) {
    doorUIClass = "bg-orange-100 border-orange-500 text-orange-700 animate-pulse border-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]";
    doorIcon = <ArrowUpDown size={100} className="text-orange-600 mb-2" />;
    doorText = "ĐANG ĐÓNG CỬA...";
  } else if (isOpened) {
    doorUIClass = "bg-emerald-50 border-emerald-500 text-emerald-700 border-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
    doorIcon = <DoorOpen size={100} className="text-emerald-600 mb-2" />;
    doorText = "CỬA ĐANG MỞ";
  }

  const isLocked = garageState.lock === 'LOCKED';
  const buttonDisabled = isLocked || isProcessing || loadingAction !== null;
  const showLoader = loadingAction !== null || isProcessing;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <Toaster position="top-right" duration={4000} />
      <header className="mb-10 text-center md:text-left max-w-7xl mx-auto flex flex-col items-center md:items-start">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex justify-center md:justify-start items-center gap-3">
          <CarFront className="text-blue-600" size={36} />
          Smart Garage
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Bảng Điều Khiển Hệ Thống Thông Minh</p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Card 1: Door Control Panel (Takes up 8 cols on large screens, meaning "to và nổi bật nhất") */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 text-slate-800 self-start">
            Trung tâm Điều khiển & Mô phỏng Cửa
          </h2>

          <div className={`w-full max-w-xl aspect-square md:aspect-video rounded-3xl flex flex-col justify-center items-center transition-all duration-500 shadow-inner p-6 mb-8 text-center ${doorUIClass}`}>
            {doorIcon}
            <p className={`mt-4 text-2xl md:text-3xl tracking-wide ${isEmergency ? 'text-rose-700 font-black' : 'font-bold'}`}>
              {doorText}
            </p>
          </div>

          <button
            onClick={() => sendCommand('TOGGLE')}
            disabled={buttonDisabled}
            className={`w-full max-w-xl py-5 px-8 rounded-full text-xl font-bold transition-all flex justify-center items-center gap-3 ${isLocked
                ? 'bg-slate-300 text-slate-500 opacity-50 cursor-not-allowed shadow-none'
                : buttonDisabled
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xl shadow-blue-600/30'
              }`}
          >
            {showLoader ? (
              <Loader2 className="animate-spin" size={28} />
            ) : (
              <Power size={28} />
            )}
            ĐÓNG / MỞ CỬA
          </button>
        </div>

        {/* Side Column for Card 2 & Radar limit */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Card 2: Security Master Lock */}
          <div className={`border rounded-2xl p-6 shadow-sm hover:shadow-md transition-colors ${isLocked
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50 border-emerald-200'
            }`}>
            <h2 className="text-lg font-bold mb-6 text-slate-800 border-b pb-3 flex justify-between items-center">
              Hệ thống Khóa An Ninh
            </h2>
            <div className="flex flex-col items-center mt-2">
              <div className={`p-6 rounded-full mb-5 shadow-sm ${isLocked
                  ? 'bg-white text-rose-600 border border-rose-100'
                  : 'bg-white text-emerald-600 border border-emerald-100'
                }`}>
                {isLocked ? <Lock size={56} /> : <Unlock size={56} />}
              </div>
              <p className={`text-center font-black text-xl mb-3 ${isLocked ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isLocked ? 'MASTER LOCK: ĐÃ KHÓA' : 'HỆ THỐNG SẴN SÀNG'}
              </p>
              <p className={`text-center text-[15px] font-medium leading-relaxed ${isLocked ? 'text-rose-500' : 'text-emerald-600'}`}>
                {isLocked
                  ? 'Đang khóa cứng từ bên trong. Đã vô hiệu hóa nút bấm và thẻ từ.'
                  : 'Hệ thống an ninh đang trong trạng thái chờ. Các tính năng mở/đóng khả dụng.'}
              </p>
            </div>
          </div>

          {/* Card 3: Thẻ Từ & Phân Quyền */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-colors">
            <h2 className="text-lg font-bold mb-4 text-slate-800 border-b pb-3 flex gap-2 items-center">
              <KeyRound size={20} className="text-blue-600" />
              Quản Lý Thẻ Từ
            </h2>
            <div className="flex flex-col mt-2">
              {!showPasswordInput ? (
                <button
                  onClick={() => setShowPasswordInput(true)}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50"
                >
                  Cấp Đổi Thẻ Mới
                </button>
              ) : (
                <div className="flex flex-col gap-3 transition-all duration-300">
                  <p className="text-sm text-slate-500 font-medium">Nhập mật khẩu Admin:</p>
                  <input
                    type="password"
                    value={rfidPassword}
                    onChange={e => setRfidPassword(e.target.value)}
                    placeholder="Nhập 123456..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => {
                        setShowPasswordInput(false);
                        setRfidPassword('');
                      }}
                      className="flex-1 py-2 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={async () => {
                        if (!rfidPassword) {
                          toast.error("Vui lòng nhập mật khẩu xác thực!");
                          return;
                        }

                        // Đợi request trả về 200 (Success) từ backend mới đóng form
                        const isSuccess = await sendCommand('LEARN_CARD:' + rfidPassword);

                        if (isSuccess) {
                          setShowPasswordInput(false);
                          setRfidPassword('');
                          toast.success("Hệ thống đã kết nối! Vui lòng quẹt thẻ mới vào trạm quét trong vòng 15s.", { duration: 6000 });
                        }
                      }}
                      disabled={showLoader}
                      className="flex-1 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center"
                    >
                      {showLoader ? <Loader2 size={18} className="animate-spin" /> : "Xác Nhận"}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-4 text-justify leading-relaxed">
                *Hệ thống sẽ chuyển thiết bị phần cứng vào biên độ nhận diện thẻ mới trong 15 giây nếu nhận đúng mật khẩu.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
