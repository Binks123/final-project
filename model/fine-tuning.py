import os
import json
import argparse
from typing import Optional, List, Dict

import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    DataCollatorForLanguageModeling,
    default_data_collator,
    AutoConfig,
    get_scheduler,
)
from transformers import Trainer, TrainingArguments
from transformers.utils import check_min_version

# Optional libs for LoRA
try:
    from peft import (
        LoraConfig,
        get_peft_model,
        prepare_model_for_kbit_training,
        PeftConfig,
        set_peft_model_state_dict,
    )
    PEFT_AVAILABLE = True
except Exception:
    PEFT_AVAILABLE = False

# Optional bitsandbytes (8-bit) acceleration
try:
    import bitsandbytes as bnb  # noqa
    BNB_AVAILABLE = True
except Exception:
    BNB_AVAILABLE = False

# -------------------------
# Helper: prompts & formatting
# -------------------------
PROMPT_TPL = """用户输入（instruction）:
{instruction}

请根据上述用户输入输出一个 JSON，结构必须严格为：
{{
  "menu": [<dish_name>, ...],
  "shopping_list": {{ "<ingredient>": "<quantity_and_unit>", ... }},
  "plan": [{{"step": <int>, "action": "<descr>", "time_min": <int>, "equipment": ["..."]}}, ...],
  "total_time_min": <int>
}}

注意：
- 输出必须是合法 JSON，不要包含额外说明文字。
- menu 里给出 1-3 个候选菜名。
- shopping_list 列出需要采购或使用的主要原料及建议数量/单位。
- plan 给出按顺序可执行的步骤，并给出每步预计分钟（time_min）和所需设备列表。
- total_time_min 为预计总分钟数。
"""

def build_input_from_example(example: Dict[str, str]) -> str:
    instruction = example["user_input"].strip()
    prompt = PROMPT_TPL.format(instruction=instruction)
    if isinstance(example["output"], (dict, list)):
        target_json = json.dumps(example["output"], ensure_ascii=False)
    else:
        target_json = example["output"].strip()
    return prompt, target_json

# -------------------------
# Dataset processing
# -------------------------
def preprocess_dataset(dataset, tokenizer, max_length=1024, add_eos_token=True):
    def _map_fn(example):
        prompt, target = build_input_from_example(example)
        full = prompt + "\n\n" + target
        tokenized_full = tokenizer(
            full,
            truncation=True,
            max_length=max_length,
            padding=False,
        )
        tokenized_prompt = tokenizer(
            prompt,
            truncation=True,
            max_length=max_length,
            padding=False,
        )
        input_ids = tokenized_full["input_ids"]
        labels = input_ids.copy()
        prompt_len = len(tokenized_prompt["input_ids"])
        for i in range(prompt_len):
            labels[i] = -100
        if add_eos_token and (len(input_ids) == 0 or input_ids[-1] != tokenizer.eos_token_id):
            if len(input_ids) < max_length:
                input_ids = input_ids + [tokenizer.eos_token_id]
                labels = labels + [tokenizer.eos_token_id]
            else:
                pass
        return {"input_ids": input_ids, "labels": labels}
    processed = dataset.map(_map_fn, remove_columns=dataset.column_names, num_proc=1)
    return processed

# -------------------------
# Main training flow
# -------------------------
def main():
    parser = argparse.ArgumentParser(description="Fine-tune a causal LM for CookingAgent tasks (LoRA supported).")
    parser.add_argument("--model_name_or_path", type=str, required=True)
    parser.add_argument("--output_dir", type=str, required=True)
    parser.add_argument("--train_file", type=str, required=True, help="train jsonl with fields user_input, output")
    parser.add_argument("--validation_file", type=str, required=True)
    parser.add_argument("--per_device_train_batch_size", type=int, default=4)
    parser.add_argument("--per_device_eval_batch_size", type=int, default=4)
    parser.add_argument("--learning_rate", type=float, default=2e-5)
    parser.add_argument("--weight_decay", type=float, default=0.0)
    parser.add_argument("--num_train_epochs", type=int, default=3)
    parser.add_argument("--max_length", type=int, default=1024)
    parser.add_argument("--logging_steps", type=int, default=50)
    parser.add_argument("--save_steps", type=int, default=200)
    parser.add_argument("--eval_steps", type=int, default=200)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=1)
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--use_lora", action="store_true", help="Enable LoRA (requires peft)")
    parser.add_argument("--lora_rank", type=int, default=8)
    parser.add_argument("--lora_alpha", type=int, default=16)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    parser.add_argument("--save_total_limit", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.use_lora and not PEFT_AVAILABLE:
        raise RuntimeError("PEFT is not installed but --use_lora was passed. Install peft.")

    tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path, trust_remote_code=True, use_fast=False)
    if tokenizer.eos_token_id is None:
        tokenizer.add_special_tokens({"eos_token": "</s>"})

    data_files = {}
    data_files["train"] = args.train_file
    data_files["validation"] = args.validation_file
    raw_dset = load_dataset("json", data_files=data_files)

    print("Preprocessing datasets...")
    tokenized_train = preprocess_dataset(raw_dset["train"], tokenizer, max_length=args.max_length)
    tokenized_eval = preprocess_dataset(raw_dset["validation"], tokenizer, max_length=args.max_length)

    device_map = "auto"
    load_kwargs = {"device_map": device_map}
    if BNB_AVAILABLE:
        load_kwargs.update({"load_in_8bit": False})
    print("Loading model:", args.model_name_or_path)
    model = AutoModelForCausalLM.from_pretrained(args.model_name_or_path, trust_remote_code=True, **load_kwargs)

    model.resize_token_embeddings(len(tokenizer))

    if args.use_lora:
        if not PEFT_AVAILABLE:
            raise RuntimeError("PEFT not available.")
        try:
            model = prepare_model_for_kbit_training(model)
        except Exception:
            pass
        lora_config = LoraConfig(
            r=args.lora_rank,
            lora_alpha=args.lora_alpha,
            target_modules=["q_proj", "v_proj"] if "q_proj" in model.state_dict() else None,
            lora_dropout=args.lora_dropout,
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora_config)
        print("Wrapped model with LoRA. Trainable params:")
        model.print_trainable_parameters()

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        num_train_epochs=args.num_train_epochs,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        logging_steps=args.logging_steps,
        evaluation_strategy="steps",
        eval_steps=args.eval_steps,
        save_steps=args.save_steps,
        save_total_limit=args.save_total_limit,
        fp16=args.fp16,
        remove_unused_columns=False,
        report_to="none",
        run_name="cookingagent_finetune",
    )

    data_collator = default_data_collator

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_eval,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    trainer.train()
    trainer.save_model(args.output_dir)

    if args.use_lora and PEFT_AVAILABLE:
        peft_out = os.path.join(args.output_dir, "peft_adapter")
        model.push_to_hub if False else None
        model.save_pretrained(peft_out)
        print(f"Saved LoRA adapter to {peft_out}")

    print("Training finished. Final model saved to", args.output_dir)

    model.eval()
    example = raw_dset["validation"][0]
    prompt, _ = build_input_from_example(example)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        generation = model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            temperature=0.0,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.pad_token_id if tokenizer.pad_token_id is not None else tokenizer.eos_token_id,
        )
    generated_text = tokenizer.decode(generation[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
    print("==== Example inference ====")
    print("PROMPT:\n", prompt)
    print("GENERATED:\n", generated_text)

if __name__ == "__main__":
    main()