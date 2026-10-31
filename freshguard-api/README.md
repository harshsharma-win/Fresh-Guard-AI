# ESP32 connection

1. Connect the PC, phone, and ESP32 to the same Wi-Fi network. Guest Wi-Fi or client isolation can block devices from reaching each other.
2. Start the app so it listens on the LAN interface:

   ```powershell
   npm run dev:lan
   ```

   For a production build, use `npm run build` followed by `npm run start:lan`.
3. Keep that terminal running. `npm run dev` binds to localhost only; it will not serve a phone or ESP32 on the LAN.
4. Find the PC's current IPv4 address with `ipconfig`. Open `http://<PC-IPv4>:3000` on the phone (not `localhost`) and set the sketch's `API_URL` to `http://<PC-IPv4>:3000/api/sensor`.
5. Allow Node.js through Windows Firewall on the **Private networks** profile. Keep the PC awake and connected to Wi-Fi.
6. Upload `esp32_dht22.ino`; open the serial monitor at 115200 baud. A successful POST reports HTTP status 200.
7. The dashboard polls the sensor endpoint every 3 seconds and marks the ESP32 online while readings arrive at least every 15 seconds. Inventory and room changes are saved on the PC and shared with phone browsers on the same app URL.

The latest reading is persisted locally in `.freshguard/sensor-state.json`, so separate Next.js workers see the same sensor data. This is intended for a self-hosted PC on a local network, not a serverless deployment.

The `/api/sensor` endpoint accepts the legacy `gasRaw`, `doorOpen`, and `doorStatus` fields, as well as the sketch's `gas_voc_raw`, `door`, `door_warning`, and `sensor_ok` fields. When the DHT22 read fails, send `sensor_ok: false` and omit both `temperature` and `humidity`; the dashboard records the sensor fault, displays those measurements as unavailable, and pauses automatic predictions until valid readings return.

Inventory entries also track an estimated shelf-life countdown from the date they are added. Set the estimated shelf life in days when adding produce; the dashboard and Alerts center flag entries at two days remaining or less. Supported produce can use an AI estimate when live sensor data is available; other inventory uses the entered estimate. These are planning reminders, not food-safety decisions. Shared inventory is stored on the self-hosted PC in `.freshguard/dashboard-state.json`; browser-only settings and alert acknowledgements remain local to each device.

## Automatic prediction limits

In AI Predictions, create an automatic monitor once for a Banana, Orange, Pineapple, or Tomato batch; every new sensor reading then refreshes its prototype prediction and two-day reminder. The trained dataset covers 21–27°C, so cold-room readings may be outside the training range. Automatic monitoring opts in to clearly labeled experimental extrapolation for those readings; results are highly uncertain and never food-safety alerts. Direct prediction API calls remain range-blocked unless explicitly opted in. Gas and light features use dataset medians because the current sketch has no calibrated gas-ppm or light measurement; the raw MQ-135 ADC value is not treated as ppm.
