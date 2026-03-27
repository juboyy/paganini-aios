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
    def v1_chat_completions(self, request: dict):
        """OpenAI-compatible endpoint for Paganini kernel integration."""
        return self._do_inference(request)

    @modal.fastapi_endpoint(method="POST", docs=True)
    def generate(self, request: dict):
        """Legacy endpoint — wraps OpenAI-compatible response."""
        result = self._do_inference(request)
        # Flatten for backward compat
        if "choices" in result:
            choice = result["choices"][0]
            return {
                "text": choice["message"]["content"],
                "model": result.get("model", ""),
                "usage": result.get("usage", {}),
                "timing": result.get("timing", {}),
                "cost": result.get("cost", {}),
            }
        return result

    def _do_inference(self, request: dict):
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
                chat_template_kwargs={"enable_thinking": False},
            )
            t1 = time.time()
            inf_s = t1 - t0

            text_raw = result["choices"][0]["message"]["content"]
            usage = result.get("usage", {})
            out_tok = usage.get("completion_tokens", 0)
            in_tok = usage.get("prompt_tokens", 0)
            rate = 1.10  # A10G $/hr

            # Filter out thinking/reasoning — extract final answer
            import re
            text = text_raw

            # Remove <think>...</think>
            text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

            # If reasoning detected, extract Portuguese answer
            if any(m in text for m in ["Thinking Process:", "Analyze the Request", "1.  **"]):
                # Collect all Portuguese sentences (accented, >80 chars, starts with capital)
                pt_sentences = []
                for line in text.split("\n"):
                    clean = line.strip().lstrip("*- ").strip()
                    # Skip lines that are meta-commentary
                    if any(clean.startswith(w) for w in [
                        "Sentence", "Draft", "Check", "Critique", "Refin",
                        "Review", "Select", "Let", "Also", "Good", "Very",
                        "Language", "Topic", "Constraint", "Mode", "In the",
                        "What", "How", "Why", "It ", "They", "The ", "Yes",
                        "No", "Note", "Hint", "Think", "#", "**"
                    ]):
                        continue
                    # Must be substantial Portuguese prose (not English with accents)
                    pt_words = ["em", "de", "do", "da", "dos", "das", "que", "para",
                                "entre", "como", "uma", "são", "pelo", "pela", "aos",
                                "nas", "nos", "com", "por", "sua", "seu", "este",
                                "essa", "esse", "mais", "também", "sobre"]
                    words_in_line = clean.lower().split()
                    pt_word_count = sum(1 for w in words_in_line if w in pt_words)
                    if (len(clean) > 80
                        and pt_word_count >= 3
                        and clean[0] in "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÂÊÔÃÕÇ"):
                        pt_sentences.append(clean)

                if pt_sentences:
                    # Take the last 3 (final refined version)
                    text = " ".join(pt_sentences[-3:])

            return {
                "id": f"chatcmpl-paganini-{int(time.time())}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": "qwen3.5-27b-q4km",
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": text},
                    "finish_reason": "stop",
                }],
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
