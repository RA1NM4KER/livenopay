// NewinMeter optical pulse reader -- prototype.
//
// Reads the Kamstrup OMNIPOWER metering LED (1000 impulses/kWh, so 1 pulse =
// 1 Wh = 0.001 kWh) via an LDR on A0 and emits one serial line per pulse:
//
//   PULSE,<sequence>,<uptime_ms>,<delta_ms>
//
// e.g.
//   PULSE,1,14573,0
//   PULSE,2,16381,1808
//   PULSE,3,18185,1804
//
// The hardware is intentionally dumb: it only reports pulse identity and
// timing. All watts/kWh/tariff/cost/graph logic lives in NewinMeter, not here,
// so calculations can change without reflashing.
//
// This is the simple hysteresis detector already validated against the real
// meter (including cupboard door open/closed). Do not replace it with anything
// heavier -- it works.

const int sensorPin = A0;

const int TRIGGER_THRESHOLD = 900;
const int RESET_THRESHOLD = 950;

bool inPulse = false;
unsigned long pulseCount = 0;
unsigned long lastPulseMs = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int value = analogRead(sensorPin);

  if (!inPulse && value < TRIGGER_THRESHOLD) {
    inPulse = true;

    unsigned long nowMs = millis();
    unsigned long deltaMs = 0;

    pulseCount++;

    if (lastPulseMs != 0) {
      deltaMs = nowMs - lastPulseMs;
    }

    Serial.print("PULSE,");
    Serial.print(pulseCount);
    Serial.print(",");
    Serial.print(nowMs);
    Serial.print(",");
    Serial.println(deltaMs);

    lastPulseMs = nowMs;
  }

  if (inPulse && value > RESET_THRESHOLD) {
    inPulse = false;
  }

  delay(2);
}
