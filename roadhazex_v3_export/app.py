##############################################################################
#  RoadHazeX V3 — Hugging Face Spaces Inference API
#  Upload this as app.py with roadhazex_v3.pt and config.json
##############################################################################
 
import os
import json
import torch
import torch.nn as nn
import clip
from PIL import Image
from flask import Flask, request, jsonify
import torchvision.transforms as T
 
app = Flask(__name__)
 
with open("config.json") as f:
    CFG = json.load(f)
 
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"
NUM_CLASSES = CFG["num_classes"]
CLASS_NAMES = CFG["class_names"]
IDX_TO_LABEL = {int(k): v for k, v in CFG["idx_to_label"].items()}
INPUT_SIZE  = CFG["input_size"]
CLIP_MEAN   = (0.48145466, 0.4578275, 0.40821073)
CLIP_STD    = (0.26862954, 0.26130258, 0.27577711)
 
 
class RoadHazeXClassifier(nn.Module):
    def __init__(self, num_classes, clip_model_name="ViT-B/32", dropout=0.35):
        super().__init__()
        clip_model, _ = clip.load(clip_model_name, device="cpu")
        self.vision_encoder = clip_model.visual
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(512, 256),
            nn.GELU(),
            nn.BatchNorm1d(256),
            nn.Dropout(dropout * 0.4),
            nn.Linear(256, num_classes)
        )
 
    def forward(self, images):
        with torch.cuda.amp.autocast(enabled=(DEVICE == "cuda")):
            features = self.vision_encoder(images.half()).float()
        return self.classifier(features)
 
 
model = RoadHazeXClassifier(NUM_CLASSES).to(DEVICE)
ckpt = torch.load("roadhazex_v3.pt", map_location=DEVICE, weights_only=False)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
print(f"RoadHazeX V3 loaded | {NUM_CLASSES} classes | {DEVICE}")
 
base_transform = T.Compose([
    T.Resize(INPUT_SIZE), T.CenterCrop(INPUT_SIZE),
    T.ToTensor(), T.Normalize(mean=CLIP_MEAN, std=CLIP_STD),
])
 
tta_transforms = [
    base_transform,
    T.Compose([
        T.Resize(INPUT_SIZE), T.CenterCrop(INPUT_SIZE),
        T.RandomHorizontalFlip(p=1.0),
        T.ToTensor(), T.Normalize(mean=CLIP_MEAN, std=CLIP_STD),
    ]),
    T.Compose([
        T.Resize(256), T.CenterCrop(INPUT_SIZE),
        T.ToTensor(), T.Normalize(mean=CLIP_MEAN, std=CLIP_STD),
    ]),
    T.Compose([
        T.Resize(INPUT_SIZE), T.CenterCrop(INPUT_SIZE),
        T.ColorJitter(brightness=0.15, contrast=0.15),
        T.ToTensor(), T.Normalize(mean=CLIP_MEAN, std=CLIP_STD),
    ]),
]
 
 
@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
 
    file = request.files["file"]
    image = Image.open(file.stream).convert("RGB")
    use_tta = request.form.get("tta", "true").lower() == "true"
 
    with torch.no_grad():
        if use_tta:
            logit_stack = []
            for t in tta_transforms:
                tensor = t(image).unsqueeze(0).to(DEVICE)
                logit_stack.append(model(tensor))
            logits = torch.stack(logit_stack).mean(dim=0)
        else:
            tensor = base_transform(image).unsqueeze(0).to(DEVICE)
            logits = model(tensor)
 
        probs = torch.softmax(logits, dim=1).squeeze()
        conf, idx = probs.max(dim=0)
 
    top3_v, top3_i = probs.topk(3)
    top3 = [
        {"label": IDX_TO_LABEL[i.item()], "confidence": round(v.item(), 4)}
        for v, i in zip(top3_v, top3_i)
    ]
 
    return jsonify({
        "prediction": IDX_TO_LABEL[idx.item()],
        "confidence": round(conf.item(), 4),
        "top3": top3,
        "model_version": "3.0",
        "tta_enabled": use_tta
    })
 
 
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_version": "3.0",
        "num_classes": NUM_CLASSES,
        "classes": CLASS_NAMES,
        "device": DEVICE
    })
 
 
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
