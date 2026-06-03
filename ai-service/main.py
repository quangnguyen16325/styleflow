import json
import os
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer


DEFAULT_STAGE1_LABELS = {
    0: "NEGATIVE",
    1: "POSITIVE",
}

DEFAULT_STAGE2_LABELS = {
    0: "NEGATIVE",
    1: "NEUTRAL",
    2: "POSITIVE",
    3: "NO_ASPECT",
}

DEFAULT_ASPECTS = [
    {"key": "material", "label": "Material"},
    {"key": "design", "label": "Design"},
    {"key": "price", "label": "Price"},
    {"key": "service", "label": "Service"},
    {"key": "general", "label": "General"},
]


class AnalyzeReviewRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class Prediction(BaseModel):
    label: str
    confidence: float


class AspectPrediction(Prediction):
    aspect: str
    key: str


class AnalyzeReviewResponse(BaseModel):
    overall: Prediction
    aspects: list[AspectPrediction]
    modelVersion: str


class SentimentPipeline:
    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.stage1_model_path = os.getenv("AI_STAGE1_MODEL_PATH", "/app/ai/saved_model_stage1")
        self.stage2_model_path = os.getenv("AI_STAGE2_MODEL_PATH", "/app/ai/saved_model_stage2")
        self.stage1_labels = load_label_map("AI_STAGE1_LABELS", DEFAULT_STAGE1_LABELS)
        self.stage2_labels = load_label_map("AI_STAGE2_LABELS", DEFAULT_STAGE2_LABELS)
        self.aspects = load_aspects()
        self.model_version = os.getenv("AI_MODEL_VERSION", "stage1_v1_stage2_v1")

        self.stage1_tokenizer = AutoTokenizer.from_pretrained(self.stage1_model_path, local_files_only=True)
        self.stage1_model = AutoModelForSequenceClassification.from_pretrained(
            self.stage1_model_path,
            local_files_only=True,
        ).to(self.device)
        self.stage1_model.eval()

        self.stage2_tokenizer = AutoTokenizer.from_pretrained(self.stage2_model_path, local_files_only=True)
        self.stage2_model = AutoModelForSequenceClassification.from_pretrained(
            self.stage2_model_path,
            local_files_only=True,
        ).to(self.device)
        self.stage2_model.eval()

    def analyze(self, text: str) -> AnalyzeReviewResponse:
        normalized_text = text.strip()
        if not normalized_text:
            raise ValueError("text is required")

        overall = self._predict_stage1(normalized_text)
        aspects = []
        for aspect in self.aspects:
            prediction = self._predict_stage2(normalized_text, aspect)
            if prediction.label != "NO_ASPECT":
                aspects.append(prediction)

        return AnalyzeReviewResponse(
            overall=overall,
            aspects=aspects,
            modelVersion=self.model_version,
        )

    def _predict_stage1(self, text: str) -> Prediction:
        inputs = self.stage1_tokenizer(
            text,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        ).to(self.device)

        with torch.no_grad():
            logits = self.stage1_model(**inputs).logits[0]

        label_id, confidence = logits_to_label(logits)
        return Prediction(
            label=self.stage1_labels.get(label_id, f"LABEL_{label_id}"),
            confidence=confidence,
        )

    def _predict_stage2(self, text: str, aspect: dict[str, str]) -> AspectPrediction:
        # Stage 2 was trained as sentence-pair classification: review text + fixed aspect name.
        inputs = self.stage2_tokenizer(
            text,
            aspect["label"],
            truncation=True,
            padding="max_length",
            max_length=256,
            return_tensors="pt",
        ).to(self.device)

        with torch.no_grad():
            logits = self.stage2_model(**inputs).logits[0]

        label_id, confidence = logits_to_label(logits)
        return AspectPrediction(
            key=aspect["key"],
            aspect=aspect["label"],
            label=self.stage2_labels.get(label_id, f"LABEL_{label_id}"),
            confidence=confidence,
        )


app = FastAPI(title="Ecloria Review AI Service")
pipeline: SentimentPipeline | None = None


@app.on_event("startup")
def load_pipeline() -> None:
    global pipeline
    pipeline = SentimentPipeline()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok" if pipeline is not None else "loading",
        "device": str(pipeline.device) if pipeline else None,
        "modelVersion": pipeline.model_version if pipeline else None,
    }


@app.post("/analyze-review", response_model=AnalyzeReviewResponse)
def analyze_review(payload: AnalyzeReviewRequest) -> AnalyzeReviewResponse:
    if pipeline is None:
        raise HTTPException(status_code=503, detail="AI model is still loading")

    try:
        return pipeline.analyze(payload.text)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def logits_to_label(logits: torch.Tensor) -> tuple[int, float]:
    probabilities = torch.softmax(logits, dim=-1)
    confidence, label_id = torch.max(probabilities, dim=-1)
    return int(label_id.item()), round(float(confidence.item()), 4)


def load_label_map(env_name: str, default: dict[int, str]) -> dict[int, str]:
    raw = os.getenv(env_name)
    if not raw:
        return default

    try:
        parsed = json.loads(raw)
        return {int(key): str(value).upper() for key, value in parsed.items()}
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


def load_aspects() -> list[dict[str, str]]:
    raw = os.getenv("AI_ASPECTS")
    if not raw:
        return DEFAULT_ASPECTS

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return DEFAULT_ASPECTS

    if not isinstance(parsed, list):
        return DEFAULT_ASPECTS

    aspects = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key", "")).strip().lower()
        label = str(item.get("label", "")).strip()
        if key and label:
            aspects.append({"key": key, "label": label})

    return aspects or DEFAULT_ASPECTS
