import torch
import os
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel 

MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
LORA_PATH = os.path.join(os.path.dirname(__file__), "..", "lora_model_herbal") 

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config, 
    device_map="auto",
    trust_remote_code=True
)

if os.path.exists(LORA_PATH):
    model = PeftModel.from_pretrained(
        base_model, 
        LORA_PATH, 
        device_map="auto"
    )
    print(" LoRA Adapter (Otak Pakar) Berhasil Terpasang!")
else:
    model = base_model
    print(" Menggunakan Model Standar (Adapter tidak ditemukan)")

model.eval()

def generate_qwen(system_prompt, user_prompt):
    print("\n" + "="*40)
    print("📥 AI SEDANG BERPIKIR...")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=256,   
            do_sample=False,      
            pad_token_id=tokenizer.eos_token_id
        )

    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True).strip()
    
    print(f"JAWABAN AI: '{response}'")
    print("="*40 + "\n")

    return response
