# DRISHTI-X
## Explainable AI for Diabetic Retinopathy Screening in Rural India
### See the Evidence. Explain the Risk. Connect Rural India.

---

> **AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS**
> This is a prototype system for research and demonstration purposes only.

---

## Quick Start

### 1. Backend
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Configure database (edit backend/.env)
cp backend/.env.example backend/.env
# Set DATABASE_URL with your PostgreSQL credentials

# Run database setup
./scripts/setup_db.sh

# Start backend (from drishti-x/ directory)
export PYTHONPATH="$(pwd)/backend:$(pwd)"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev   # Visit http://localhost:3000
```

### 3. Train the Model (requires dataset)
```bash
# Download APTOS 2019: https://www.kaggle.com/c/aptos2019-blindness-detection
# Update training/configs/train_config.yaml with dataset paths

python training/train_efficientnet.py
python training/evaluate.py
```

### 4. Run Tests
```bash
python3 -m pytest tests/ -v
```

---

## Architecture

```
Frontend (Next.js 16 + React 19 + Tailwind 4)
    ↓ REST API (JSON)
Backend (FastAPI + PostgreSQL)
    ↓
AI Pipeline:
  ├── Image Quality Engine (OpenCV)
  ├── Preprocessing (CLAHE + normalization + crop)
  ├── EfficientNet-B0 DR Classifier (PyTorch/timm)
  ├── Grad-CAM Explainability (real gradients)
  ├── Lesion Evidence (CV pipeline → U-Net when trained)
  ├── Evidence Concordance Engine
  └── Assurance Engine → VALIDATED / HUMAN_REVIEW / RECAPTURE
    ↓
MATLAB Bridge (fallback to Python when MATLAB unavailable)
    ↓
Simulink Simulation (Python analytical model fallback)
```

---

## Model Status

| Component | Status |
|-----------|--------|
| EfficientNet-B0 architecture | ✅ Ready |
| ImageNet pretrained weights | ✅ Downloaded |
| DR training (APTOS 2019) | ❌ NOT_TRAINED — dataset required |
| U-Net lesion segmentation | ❌ NOT_TRAINED — dataset required |
| Grad-CAM (infrastructure) | ✅ Implemented and tested |
| CV lesion pipeline (heuristic) | ✅ Active |

---

## Project Structure

```
drishti-x/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL
│   └── app/
│       ├── api/      REST routes
│       ├── models/   Database models
│       ├── schemas/  Pydantic schemas
│       └── core/     Config, security
├── ai/               AI pipeline modules
│   ├── classification/   EfficientNet-B0
│   ├── explainability/   Grad-CAM
│   ├── evidence/         Lesion analysis
│   ├── assurance/        Assurance engine
│   ├── quality/          Image quality
│   ├── inference/        Canonical pipeline
│   └── matlab_fallback/  MATLAB bridge
├── training/         Training scripts + configs
├── frontend/         Next.js application
├── matlab/           MATLAB .m files
├── simulink/         Telemedicine simulation
└── tests/            Test suite (61 tests)
```

---

## Limitations

See `LIMITATIONS.md` for a full honest account of what is and is not implemented.
# Drishti--X
