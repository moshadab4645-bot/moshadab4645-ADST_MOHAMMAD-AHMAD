from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
CORS(app)

model = joblib.load(BASE_DIR / "used_car_price_pipeline.joblib")


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "UsedCar.html")


@app.get("/<path:filename>")
def frontend_files(filename):
    allowed_files = {
        "UsedCar.css",
        "UsedCar.js",
        "car_dropdown_data.json",
    }
    if filename in allowed_files:
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "File not found"}), 404


@app.post("/predict")
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "JSON input is required"}), 400

    row = pd.DataFrame([{
        "Brand": data["brand"],
        "Model Name": data["model_name"],
        "Model Variant": data["model_variant"],
        "Car Type": data["car_type"],
        "Transmission": data["transmission"],
        "Fuel Type": data["fuel_type"],
        "Year": int(data["year"]),
        "Kilometers": int(data["kilometers"]),
        "Owner": data["owner"],
        "State": data["state"],
        "Accidental": data["accidental"],
    }])

    prediction = model.predict(row)[0]
    return jsonify({"predicted_price": float(prediction)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)