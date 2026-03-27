"""ARC-AGI Benchmark Runner — measures AI reasoning on visual pattern tasks.

Loads ARC-AGI-1 training set (400 tasks), runs an LLM solver on each task,
and reports accuracy. Each task has training examples (input→output pairs)
and test examples where the model must predict the output.

Usage:
    python3 arc_benchmark.py [--tasks N] [--model MODEL]
"""

import json
import sys
import time
from pathlib import Path

# Lazy import to avoid chromadb dependency
try:
    from arc_agi_core import Dataset
except ImportError:
    print("Install arc-agi: pip install arc-agi")
    sys.exit(1)


def grid_to_str(grid_list: list[list[int]]) -> str:
    """Convert a 2D grid to a compact string representation."""
    return "\n".join(" ".join(str(c) for c in row) for row in grid_list)


def format_task_prompt(task, test_idx: int = 0) -> str:
    """Format an ARC task as a text prompt for an LLM."""
    lines = [
        "You are solving an ARC-AGI visual reasoning task.",
        "Each task has training examples showing input→output grid transformations.",
        "Find the pattern and apply it to the test input.",
        "",
        "TRAINING EXAMPLES:",
    ]

    for i, pair in enumerate(task.train):
        inp = pair.input.to_list()
        out = pair.output.to_list()
        lines.append(f"\nExample {i+1} Input ({len(inp)}x{len(inp[0])}):")
        lines.append(grid_to_str(inp))
        lines.append(f"Example {i+1} Output ({len(out)}x{len(out[0])}):")
        lines.append(grid_to_str(out))

    test_pair = task.test[test_idx]
    test_inp = test_pair.input.to_list()
    lines.append(f"\nTEST INPUT ({len(test_inp)}x{len(test_inp[0])}):")
    lines.append(grid_to_str(test_inp))
    lines.append(
        "\nProvide ONLY the output grid. Each row on its own line, "
        "numbers separated by spaces. No explanation."
    )

    return "\n".join(lines)


def parse_grid_response(response: str) -> list[list[int]] | None:
    """Parse an LLM response into a 2D grid."""
    lines = []
    for line in response.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        # Skip non-grid lines
        nums = []
        for token in line.replace(",", " ").split():
            token = token.strip("[](),")
            if token.isdigit():
                nums.append(int(token))
        if nums:
            lines.append(nums)
    return lines if lines else None


def grids_match(predicted: list[list[int]], expected: list[list[int]]) -> bool:
    """Check if two grids are identical."""
    if len(predicted) != len(expected):
        return False
    for p_row, e_row in zip(predicted, expected):
        if p_row != e_row:
            return False
    return True


def run_benchmark(
    data_path: str = "/tmp/arc-agi-data",
    max_tasks: int = 10,
    solver_fn=None,
) -> dict:
    """Run ARC-AGI benchmark.

    Args:
        data_path: Path to downloaded ARC tasks
        max_tasks: Number of tasks to evaluate
        solver_fn: Function(prompt: str) -> str that calls an LLM

    Returns:
        dict with accuracy, results per task, timing
    """
    ds = Dataset.load_directory(data_path)
    tasks = list(ds[:max_tasks])

    results = []
    correct = 0
    total = 0
    t0 = time.time()

    for i, task in enumerate(tasks):
        task_id = task.task_id
        for test_idx in range(len(task.test)):
            total += 1
            prompt = format_task_prompt(task, test_idx)
            expected = task.test[test_idx].output.to_list()

            try:
                if solver_fn:
                    response = solver_fn(prompt)
                else:
                    # Dummy solver: return the first training output
                    response = grid_to_str(task.train[0].output.to_list())

                predicted = parse_grid_response(response)

                if predicted and grids_match(predicted, expected):
                    correct += 1
                    status = "PASS"
                else:
                    status = "FAIL"
                    if predicted:
                        pred_shape = f"{len(predicted)}x{len(predicted[0])}"
                        exp_shape = f"{len(expected)}x{len(expected[0])}"
                    else:
                        pred_shape = "parse_error"
                        exp_shape = f"{len(expected)}x{len(expected[0])}"

            except Exception as e:
                status = "ERROR"
                pred_shape = str(e)[:50]
                exp_shape = f"{len(expected)}x{len(expected[0])}"

            results.append({
                "task_id": task_id,
                "test_idx": test_idx,
                "status": status,
            })

            print(f"  [{i+1}/{len(tasks)}] {task_id} test_{test_idx}: {status}")

    elapsed = time.time() - t0

    accuracy = correct / total if total > 0 else 0.0
    summary = {
        "total_tasks": len(tasks),
        "total_tests": total,
        "correct": correct,
        "accuracy": round(accuracy * 100, 1),
        "elapsed_seconds": round(elapsed, 1),
        "results": results,
    }

    print(f"\n{'='*50}")
    print(f"ARC-AGI-1 Benchmark Results")
    print(f"{'='*50}")
    print(f"Tasks: {len(tasks)}, Tests: {total}")
    print(f"Correct: {correct}/{total} ({accuracy*100:.1f}%)")
    print(f"Time: {elapsed:.1f}s")

    return summary


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks", type=int, default=10)
    parser.add_argument("--data", default="/tmp/arc-agi-data")
    args = parser.parse_args()

    # Run with dummy solver first to verify pipeline works
    print("Running with dummy solver (baseline)...")
    run_benchmark(data_path=args.data, max_tasks=args.tasks)
