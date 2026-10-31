#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

const char* WIFI_SSID = "Harsh";
const char* WIFI_PASSWORD = "00998877";
// Use the IPv4 address of the PC running FreshGuard on the same Wi-Fi network.
// Update this value when the PC's DHCP address changes.
const char* API_URL = "http://10.37.160.240:3000/api/sensor";

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define DOOR_PIN 27

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  // Wire the door switch between GPIO27 and GND; HIGH means the door is open.
  pinMode(DOOR_PIN, INPUT_PULLUP);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    const float humidity = dht.readHumidity();
    const float temperature = dht.readTemperature();
    const int gasRaw = analogRead(MQ135_PIN);
    const bool doorOpen = digitalRead(DOOR_PIN) == HIGH;

    if (!isnan(humidity) && !isnan(temperature)) {
      HTTPClient http;
      http.begin(API_URL);
      http.addHeader("Content-Type", "application/json");
      http.setConnectTimeout(5000);
      http.setTimeout(5000);

      String body = "{\"temperature\":" + String(temperature, 1) +
                    ",\"humidity\":" + String(humidity, 1) +
                    ",\"gasRaw\":" + String(gasRaw) +
                    ",\"doorOpen\":" + String(doorOpen ? "true" : "false") + "}";
      const int status = http.POST(body);
      Serial.printf("POST status: %d, door: %s, reading: %s\n",
                    status, doorOpen ? "OPEN" : "CLOSED", body.c_str());
      if (status < 0) {
        Serial.printf("HTTP connection error: %s\n", http.errorToString(status).c_str());
      } else if (status >= 400) {
        Serial.printf("FreshGuard API response: %s\n", http.getString().c_str());
      }
      http.end();
    } else {
      Serial.println("Failed to read DHT22");
    }
  } else {
    Serial.println("Wi-Fi disconnected");
  }

  delay(3000);
}