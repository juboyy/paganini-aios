"""
Paganini AIOS — Qwen3.5 27B GGUF Q4_K_M on Modal (A10G 24GB)
llama-cpp-python with CUDA — pre-built wheels, no compile needed
"""
import modal

MODEL_REPO = "bartowski/Qwen_Qwen3.5-27B-GGUF"
MODEL_FILE = "Qwen_Qwen3.5-27B-Q4_K_M.gguf"
MODEL_PATH = f"/models/{MODEL_FILE}"

app = modal.App("paganini-27b-gguf")

image = (
    modal.Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.11")
    .pip_install(
        "llama-cpp-python[server]",
        "huggingface_hub",
        "hf_transfer",
        "fastapi[standard]",
        extra_options="--extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_commands(
        f'python3 -c "from huggingface_hub import hf_hub_download; hf_hub_download(\'{MODEL_REPO}\', \'{MODEL_FILE}\', local_dir=\'/models\')"',
        secrets=[modal.Secret.from_name("huggingface-token")],
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    scaledown_window=180,
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-token")],
)
@modal.concurrent(max_inputs=4)
class Inference:
    @modal.enter()
    def load_model(self):
        import time
        from llama_cpp import Llama
        t0 = time.time()
        self.llm = Llama(
            model_path=MODEL_PATH,
            n_gpu_layers=-1,    # offload all layers
            n_ctx=4096,
            flash_attn=True,
            verbose=True,
        )
        self.load_time = time.time() - t0
        print(f"Model loaded in {self.load_time:.1f}s")

    @modal.fastapi_endpoint(method="POST", docs=True)
    def generate(self, request: dict):
        import time

        messages = request.get("messages", [])
        max_tokens = request.get("max_tokens", 512)
        temperature = request.get("temperature", 0.6)

        t0 = time.time()
        try:
            result = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=request.get("top_p", 0.95),
                stop=["<|im_end|>"],
            )
            t1 = time.time()
            inf_s = t1 - t0

            text_raw = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            out_tok = usage.get("completion_tokens", 0)
            in_tok = usage.get("prompt_tokens", 0)
            rate = 1.10  # A10G $/hr

            # Filter out thinking/reasoning blocks
            import re
            text = text_raw
            # Remove <think>...</think> blocks
            text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
            # Remove "Thinking Process:..." blocks (ends at final answer)
            text = re.sub(
                r"Thinking Process:.*?(?=\n(?:A subordinação|O FIDC|No contexto|Em um FIDC|Subordinação|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]))",
                "",
                text,
                flags=re.DOTALL,
            ).strip()
            # If still has thinking prefix, take everything after last numbered list
            if text.startswith("Thinking") and "\n\n" in text:
                parts = text.split("\n\n")
                # Find the actual answer (Portuguese text, not English reasoning)
                for i, p in enumerate(parts):
                    if any(c in p for c in ["ção", "ões", "ância", "ência"]) and not p.startswith("*"):
                        text = "\n\n".join(parts[i:])
                        break

            return {
                "text": text,
                "model": "Qwen3.5-27B-Q4_K_M (GGUF/llama.cpp)",
                "usage": {
                    "prompt_tokens": in_tok,
                    "completion_tokens": out_tok,
                    "total_tokens": in_tok + out_tok,
                },
                "timing": {
                    "inference_s": round(inf_s, 3),
                    "tokens_per_second": round(out_tok / inf_s, 1) if inf_s > 0 else 0,
                },
                "cost": {
                    "gpu": "A10G",
                    "rate_per_hour": rate,
                    "this_query_usd": round(inf_s * (rate / 3600), 6),
                },
            }
        except Exception as e:
            import traceback
            return {"error": str(e), "traceback": traceback.format_exc()[-1000:]}
