const API_URL = "/predict";
const OPTIONS_URL = "./car_dropdown_data.json";

const form = document.getElementById("prediction");
const statusMessage = document.getElementById("pageStatus");
const brandSelect = document.getElementById("brand");
const modelSelect = document.getElementById("model");
const yearSelect = document.getElementById("year");
const kilometersInput = document.getElementById("kilometers");
const predictButton = document.getElementById("predictButton");
const resultBox = document.getElementById("resultBox");
const result = document.getElementById("result");
const resultMessage = document.getElementById("resultMessage");

const dependentSelects = {
    modelVariant: ["variants", "Select a year first"],
    carType: ["carTypes", "Select a year first"],
    transmission: ["transmissions", "Select a year first"],
    fuelType: ["fuelTypes", "Select a year first"],
    owner: ["owners", "Select a year first"],
    state: ["states", "Select a year first"],
    accidental: ["accidentals", "Select a year first"]
};

let dropdownData = null;

function setOptions(select, values, placeholder, enabled = true) {
    select.replaceChildren(new Option(placeholder, ""));
    for (const value of values || []) {
        select.add(new Option(String(value), String(value)));
    }
    select.disabled = !enabled || !values || values.length === 0;
}

function updateSubmitButton() {
    const requiredControls = [...form.querySelectorAll("[required]")];
    predictButton.disabled = requiredControls.some(
        control => control.disabled || !control.value
    );
}

function resetDetailDropdowns() {
    for (const id of Object.keys(dependentSelects)) {
        setOptions(
            document.getElementById(id),
            [],
            "Select a year first",
            false
        );
    }
}

brandSelect.addEventListener("change", () => {
    const models = dropdownData?.modelsByBrand?.[brandSelect.value] || [];
    setOptions(modelSelect, models, "Select a model", true);
    setOptions(yearSelect, [], "Select a model first", false);
    resetDetailDropdowns();
    resultBox.hidden = true;
    updateSubmitButton();
});

modelSelect.addEventListener("change", () => {
    const years =
        dropdownData?.yearsByModel?.[brandSelect.value]?.[modelSelect.value] || [];

    setOptions(yearSelect, years, "Select a manufacturing year", true);
    resetDetailDropdowns();
    resultBox.hidden = true;
    updateSubmitButton();
});

yearSelect.addEventListener("change", () => {
    const yearData =
        dropdownData?.detailsByYear?.[brandSelect.value]?.[modelSelect.value]?.[yearSelect.value];

    for (const [id, [key, placeholder]] of Object.entries(dependentSelects)) {
        setOptions(
            document.getElementById(id),
            yearData?.[key] || [],
            placeholder,
            Boolean(yearData)
        );
    }

    resultBox.hidden = true;
    updateSubmitButton();
});

for (const id of Object.keys(dependentSelects)) {
    document.getElementById(id).addEventListener("change", () => {
        resultBox.hidden = true;
        updateSubmitButton();
    });
}

kilometersInput.addEventListener("input", () => {
    resultBox.hidden = true;
    updateSubmitButton();
});

async function loadDropdownData() {
    try {
        const response = await fetch(OPTIONS_URL);
        if (!response.ok) {
            throw new Error("Could not load car_dropdown_data.json.");
        }

        dropdownData = await response.json();
        setOptions(brandSelect, dropdownData.brands, "Select a brand", true);
        statusMessage.textContent =
            "Choose a brand, then its model and an available year.";
        updateSubmitButton();
    } catch (error) {
        statusMessage.textContent =
            `${error.message} Keep the JSON file beside this page and run the local web server.`;
        statusMessage.classList.add("error");
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const car = {
        brand: brandSelect.value,
        model_name: modelSelect.value,
        model_variant: document.getElementById("modelVariant").value,
        car_type: document.getElementById("carType").value,
        transmission: document.getElementById("transmission").value,
        fuel_type: document.getElementById("fuelType").value,
        year: Number(yearSelect.value),
        kilometers: Number(kilometersInput.value),
        owner: document.getElementById("owner").value,
        state: document.getElementById("state").value,
        accidental: document.getElementById("accidental").value
    };

    resultBox.hidden = false;
    result.textContent = "Calculating…";
    resultMessage.textContent = "Contacting the prediction API.";
    predictButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(car)
        });

        const data = await response.json();

        if (!response.ok) {
            const detail = Array.isArray(data.detail)
                ? data.detail.map(item => item.msg).join("; ")
                : data.detail;
            throw new Error(detail || "The prediction request failed.");
        }

        const price = Number(data.predicted_price);
        if (!Number.isFinite(price)) {
            throw new Error("The API returned an invalid price.");
        }

        result.textContent = `₹ ${(price / 100000).toFixed(2)} Lakh`;
        resultMessage.textContent =
            `Approx. ₹ ${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    } catch (error) {
        result.textContent = "Prediction unavailable";
        resultMessage.textContent =
            error.message || "Check that the backend is running.";
    } finally {
        updateSubmitButton();
    }
});

resetDetailDropdowns();
loadDropdownData();