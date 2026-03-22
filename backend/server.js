const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt'); // Sử dụng thư viện mqtt làm client
require('dotenv').config();

// ==========================================
// 0. Global State
// ==========================================
let garageState = {
  door: 'CLOSED',
  lock: 'UNLOCKED',
  parkingDistance: 0,
  alert: 'NONE'
};

// ==========================================
// 1. Kết nối tới HiveMQ Cloud (MQTTS - TLS)
// ==========================================
// BẮT BUỘC: HiveMQ Cloud chạy qua luồng bảo mật MQTTS / Port 8883
const MQTT_URL = process.env.MQTT_URL;

const mqttClient = mqtt.connect(MQTT_URL, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  clientId: "backend_" + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 4000
});

mqttClient.on('connect', () => {
  console.log(`[MQTT] Đã kết nối thành công tới broker.hivemq.com!`);
  // Đăng ký nhận bản tin từ ESP32

  mqttClient.subscribe('garage/status');
  mqttClient.subscribe('garage/rfid');
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Lỗi kết nối:', err);
});

// ==========================================
// 2. HTTP Server setup (Express)
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());
const HTTP_PORT = 3001;

app.get('/', (req, res) => {
  res.send('Smart Gara API is running with HiveMQ');
});

app.get('/api/state', (req, res) => {
  res.json(garageState);
});

app.post('/api/command', (req, res) => {
  console.log(`\n[API POST] Nhận được request gửi lệnh từ Frontend.`);
  const { action } = req.body;
  if (!action) {
    console.log(`[API ERROR] Bị từ chối do thiếu dữ liệu action!`);
    return res.status(400).json({ success: false, message: 'Action is required' });
  }

  console.log(`[API INFO] Đang đẩy payload: "${action}" lên HiveMQ...`);

  // Gửi lệnh lên HiveMQ với cờ QoS 1 (đảm bảo tới đích) và callback xác nhận
  mqttClient.publish('garage/command', action, { qos: 1 }, (error) => {
    if (error) {
      console.error(`[API ERROR] Gửi lệnh thất bại!`, error);
      return res.status(500).json({ success: false, message: 'Lỗi không thể gửi lệnh lên MQTT Broker' });
    } else {
      console.log(`[API SUCCESS] Lệnh "${action}" đã được đẩy thành công lên MQTT!`);
      return res.json({ success: true, message: `Command ${action} sent to HiveMQ` });
    }
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Express server listening on port ${HTTP_PORT}`);
});

// ==========================================
// 3. Xử lý nhận MQTT Message
// ==========================================
mqttClient.on('message', (topic, message) => {
  const payloadStr = message.toString();
  console.log(`[MQTT] Nhận dữ liệu từ [${topic}]: ${payloadStr}`);

  if (topic === 'garage/status') {
    try {
      if (payloadStr.trim().startsWith('{')) {
        const parsedData = JSON.parse(payloadStr);
        garageState = { ...garageState, ...parsedData };
      } else if (payloadStr === 'OPEN' || payloadStr === 'CLOSED') {
        garageState.door = payloadStr;
      } else if (payloadStr === 'LOCKED' || payloadStr === 'UNLOCKED') {
        garageState.lock = payloadStr;
      }
    } catch (err) {
      console.log(`[MQTT] Lỗi parse JSON:`, err.message);
    }
  }
  else if (topic === 'garage/rfid') {
    if (payloadStr.trim() === 'E3 A1 B2 1C') {
      mqttClient.publish('garage/command', 'TOGGLE');
      console.log('[RFID] Mở cửa bằng thẻ từ thành công!');
    } else {
      console.log('[RFID] Thẻ không hợp lệ!');
    }
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Lỗi kết nối:', err);
});