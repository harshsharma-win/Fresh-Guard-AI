# Shelf-life prototype

The dashboard loads the exported tree model from `app/api/predict/model.json` and evaluates it in the Node.js API route. Retrain it with the supplied dataset and NumPy installed:

```powershell
python ml\train_model.py --csv C:\path\to\FreshGuard_dataset.csv
```

The trainer writes the model to the app's API directory by default. The dashboard displays the holdout metrics, but they measure agreement with the supplied dataset, not real-world freshness performance. Shelf-life targets in this dataset are literature-anchored simulations.

Prediction requests are range-checked by default. Automatic dashboard monitoring explicitly opts into experimental extrapolation when readings fall outside observed numeric ranges; those results are highly uncertain and must never be used for food-safety decisions. In particular, the dataset uses 21–27°C and calibrated gas concentration in ppm; the ESP32's MQ-135 ADC counts are not ppm, and normal cold-room temperatures can be outside the training range. Two-day reminders and shelf-life charts are prototype estimates, not food-safety alerts.

Automatic dashboard predictions run on new ESP32 readings for a configured Banana, Orange, Pineapple, or Tomato batch monitor. Temperature and humidity come from the ESP32. Because the current sketch has no calibrated gas-ppm or light sensor, those features use the dataset-wide median defaults; the raw MQ-135 ADC value is never treated as ppm. Storage age is entered once when configuring the batch. Out-of-range automatic results are labeled experimental/high-uncertainty in the status panel, outlook, and two-day reminders; direct API requests remain range-blocked unless they explicitly opt in.
