# KisaanSaathi Yield Prediction Model - LoRA Fine-tuning

This directory contains the setup for fine-tuning **Mistral-7B-Instruct-v0.2** on agricultural yield prediction using **LoRA (Low-Rank Adaptation)**.

## 📁 Directory Structure

```
ml/finetuning/
├── data/
│   └── yield_prediction_dataset.json  # Training dataset (20 examples)
├── output/                             # Fine-tuned model will be saved here
├── config.yaml                         # Training configuration
├── train_lora.py                       # Main training script
├── requirements.txt                    # Python dependencies
└── README.md                           # This file
```

## 🌾 Dataset

The dataset contains **20 instruction-response pairs** covering:

| Crop | States Covered |
|------|----------------|
| Rice | West Bengal, Tamil Nadu |
| Wheat | Punjab |
| Cotton | Gujarat |
| Sugarcane | Maharashtra |
| Soybean | Madhya Pradesh |
| Groundnut | Andhra Pradesh |
| Maize | Karnataka |
| Potato | Uttar Pradesh |
| Mustard | Rajasthan |
| Chickpea | Maharashtra |
| Jowar | Telangana |
| Bajra | Haryana |
| Onion | Maharashtra |
| Tomato | Karnataka |
| Chilli | Andhra Pradesh |
| Turmeric | Kerala |
| Ginger | Assam |
| Tea | Darjeeling |
| Coconut | Kerala |
| Banana | Tamil Nadu |

Each entry includes:
- Land area, soil type, season
- Rainfall, temperature, humidity
- Yield prediction with reasoning
- Revenue estimates at MSP
- Crop-specific recommendations

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ml/finetuning
pip install -r requirements.txt
```

### 2. Run Training

```bash
python train_lora.py
```

Training time: ~2-3 hours on RTX 3090/A100 (16GB+ VRAM)

### 3. Test the Model

```bash
python train_lora.py --test
```

## ⚙️ Training Configuration

| Parameter | Value |
|-----------|-------|
| Base Model | `mistralai/Mistral-7B-Instruct-v0.2` |
| LoRA Rank | 16 |
| LoRA Alpha | 32 |
| Dropout | 0.05 |
| Quantization | 4-bit (NF4) |
| Epochs | 3 |
| Batch Size | 4 |
| Learning Rate | 2e-4 |
| Max Sequence Length | 2048 |

## 🎯 Fine-tuning Objectives

1. **Domain Expertise**: Make the model an expert in Indian agriculture
2. **Structured Output**: Generate yield predictions with analysis and recommendations
3. **Regional Awareness**: Understand state-wise agro-climatic conditions
4. **MSP Knowledge**: Include market prices and revenue estimates

## 📊 Expected Output Format

```
**Predicted Yield**: X - Y tons per acre
**Total Expected Production**: Z tons

**Analysis**:
- Soil suitability explanation
- Weather impact assessment
- Regional advantages

**Revenue Estimate**: ₹X,XX,XXX - ₹Y,YY,YYY

**Recommendations**:
1. Variety selection
2. Fertilizer application
3. Irrigation schedule
4. Pest management
```

## 🔧 Expanding the Dataset

To add more training examples:

1. Edit `data/yield_prediction_dataset.json`
2. Follow the instruction-response format
3. Include real yield data from agricultural databases
4. Add more crops, regions, or conditions

## 📈 Model Integration

After fine-tuning, integrate with KisaanSaathi:

```javascript
// In yield.strategy.js
module.exports = {
    execute: async (data) => ({
        prompt: formatYieldPrompt(data),
        model: "kisaansaathi/yield-predictor-mistral-lora", // Fine-tuned model
        responseParams: { json: false }
    })
};
```

## 🔒 Hardware Requirements

- **GPU**: NVIDIA GPU with 16GB+ VRAM
- **CUDA**: 11.8 or higher
- **RAM**: 32GB recommended
- **Storage**: 20GB for model checkpoints

## 📚 References

- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [PEFT Library](https://github.com/huggingface/peft)
- [Mistral-7B HuggingFace](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)
- [Indian Crop Statistics](https://agricoop.nic.in/)
