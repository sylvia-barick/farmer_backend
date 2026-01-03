"""
LoRA Fine-tuning Script for Yield Prediction Model
Base Model: mistralai/Mistral-7B-Instruct-v0.2

Requirements:
    pip install torch transformers datasets peft bitsandbytes accelerate trl

Usage:
    python train_lora.py
"""

import os
import json
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    pipeline
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

# Configuration
MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.2"
OUTPUT_DIR = "./output/yield-predictor-lora"
DATASET_PATH = "./data/yield_prediction_dataset.json"

def load_dataset():
    """Load and format the yield prediction dataset."""
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Format for Mistral Instruct
    formatted_data = []
    for item in data:
        text = f"[INST] {item['instruction']} [/INST]\n{item['response']}"
        formatted_data.append({"text": text})
    
    return Dataset.from_list(formatted_data)

def setup_model_and_tokenizer():
    """Setup Mistral model with 4-bit quantization and LoRA."""
    
    # BitsAndBytes config for 4-bit quantization
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    # Load model with quantization
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Prepare model for k-bit training
    model = prepare_model_for_kbit_training(model)
    
    # LoRA configuration
    lora_config = LoraConfig(
        r=16,                           # LoRA rank
        lora_alpha=32,                  # Alpha scaling
        lora_dropout=0.05,              # Dropout
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ]
    )
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    return model, tokenizer

def train():
    """Main training function."""
    print("=" * 50)
    print("KisaanSaathi Yield Prediction Model - LoRA Fine-tuning")
    print("Base Model: mistralai/Mistral-7B-Instruct-v0.2")
    print("=" * 50)
    
    # Load dataset
    print("\n[1/4] Loading dataset...")
    dataset = load_dataset()
    print(f"     Loaded {len(dataset)} training examples")
    
    # Setup model
    print("\n[2/4] Loading model with 4-bit quantization...")
    model, tokenizer = setup_model_and_tokenizer()
    
    # Training arguments
    print("\n[3/4] Setting up training...")
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        weight_decay=0.001,
        logging_steps=10,
        save_steps=100,
        save_total_limit=3,
        fp16=False,
        bf16=True,
        gradient_checkpointing=True,
        optim="paged_adamw_32bit",
        report_to="none",
        max_grad_norm=0.3,
    )
    
    # SFT Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        tokenizer=tokenizer,
        args=training_args,
        dataset_text_field="text",
        max_seq_length=2048,
        packing=False,
    )
    
    # Train
    print("\n[4/4] Starting training...")
    trainer.train()
    
    # Save model
    print("\n[Done] Saving fine-tuned model...")
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print(f"\n✅ Model saved to: {OUTPUT_DIR}")
    print("You can now use this model for yield predictions!")

def test_model():
    """Test the fine-tuned model."""
    from peft import PeftModel
    
    print("\nLoading fine-tuned model for testing...")
    
    # Load base model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )
    
    # Load LoRA adapter
    model = PeftModel.from_pretrained(model, OUTPUT_DIR)
    
    # Test prompt
    test_prompt = """[INST] Predict the yield for Wheat cultivation in Punjab with the following conditions: Land area is 10 acres, soil type is Loamy, season is Rabi, annual rainfall is 450mm, average temperature is 20°C, and humidity is 50%. [/INST]"""
    
    inputs = tokenizer(test_prompt, return_tensors="pt").to("cuda")
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=500,
            temperature=0.7,
            do_sample=True,
            top_p=0.9
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("\n" + "=" * 50)
    print("TEST OUTPUT:")
    print("=" * 50)
    print(response)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="Test the fine-tuned model")
    args = parser.parse_args()
    
    if args.test:
        test_model()
    else:
        train()
