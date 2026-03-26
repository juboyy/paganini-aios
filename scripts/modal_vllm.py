"""
Paganini AIOS — Qwen 7B on Modal via vLLM (cls pattern)
"""
import modal

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
MODEL_DIR = "/models/qwen-7b"

app = modal.App("paganini-vllm")

image = (
    modal.Image.from_registry("nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.11")
    .pip_install("vllm==0.8.5", "transformers==4.52.4", "fastapi[standard]", "huggingface_hub", "hf_transfer")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_commands(
        f'python3 -c "from huggingface_hub import snapshot_download; snapshot_download(\'{MODEL_NAME}\', local_dir=\'{MODEL_DIR}\')"',
        secrets=[modal.Secret.from_name("huggingface-token")],
    )
)


@app.cls(
    image=image,
    gpu="A10G",
    scaledown_window=120,
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-token")],
)
@modal.concurrent(max_inputs=16)
class Inference:
    @modal.enter()
    def load_model(self):
        import time
        from vllm import LLM
        t0 = time.time()
        self.llm = LLM(
            model=MODEL_DIR,
            gpu_memory_utilization=0.90,
            max_model_len=4096,
            dtype="half",
        )
        self.load_time = time.time() - t0
        print(f"Model loaded in {self.load_time:.1f}s")

    @modal.fastapi_endpoint(method="POST", docs=True)
    def generate(self, request: dict):
        import time
        from vllm import SamplingParams

        messages = request.get("messages", [])
        prompt = request.get("prompt", "")

        if messages and not prompt:
            parts = []
            for msg in messages:
                parts.append(f"<|im_start|>{msg.get('role','user')}\n{msg.get('content','')}<|im_end|>")
            parts.append("<|im_start|>assistant\n")
            prompt = "\n".join(parts)

        params = SamplingParams(
            max_tokens=request.get("max_tokens", 256),
            temperature=request.get("temperature", 0.3),
            stop=["<|im_end|>"],
        )

        t0 = time.time()
        try:
            outputs = self.llm.generate([prompt], params)
            t1 = time.time()
            inf_s = t1 - t0

            if not outputs or not outputs[0].outputs:
                return {"error": "No output generated", "debug": str(outputs)[:500]}

            text = outputs[0].outputs[0].text
            out_tok = len(outputs[0].outputs[0].token_ids)
            in_tok = len(outputs[0].prompt_token_ids) if hasattr(outputs[0], 'prompt_token_ids') else 0
            rate = 1.10  # A10G $/hr

            return {
                "text": text,
                "model": MODEL_NAME,
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
