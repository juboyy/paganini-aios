"""Tests for BMAD Pipeline Engine."""

from core.bmad.pipeline import PipelineEngine, BUILTIN_STAGES, PipelineRun, StageResult


def test_builtin_stages_exist():
    assert len(BUILTIN_STAGES) == 18
    assert "context" in BUILTIN_STAGES
    assert "deploy" in BUILTIN_STAGES
    assert "knowledge" in BUILTIN_STAGES


def test_engine_init():
    engine = PipelineEngine()
    assert isinstance(engine, PipelineEngine)


def test_list_stages():
    engine = PipelineEngine()
    stages = engine.list_stages()
    assert len(stages) >= 18


def test_register_custom_stage():
    engine = PipelineEngine()
    engine.register_stage("custom_check", description="Custom verification")
    stages = engine.list_stages()
    assert "custom_check" in stages


def test_create_run():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    run = engine.create_run("test_pipeline", stages=["context", "spec", "implement"])
    assert run.pipeline_name == "test_pipeline"
    assert len(run.stages) == 3
    assert run.status == "pending"
    assert "context" in run.results


def test_execute_stage():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    run = engine.create_run("test", stages=["context", "spec"])
    result = engine.execute_stage(run.id, "context")
    assert result.status == "passed"
    assert result.duration_s >= 0


def test_execute_with_handler():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    engine.register_stage("custom", handler=lambda run, ctx: {"data": 42})
    run = engine.create_run("test", stages=["custom"])
    result = engine.execute_stage(run.id, "custom")
    assert result.status == "passed"
    assert result.output == {"data": 42}


def test_execute_with_failing_handler():
    def bad_handler(run, ctx):
        raise ValueError("boom")

    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    engine.register_stage("failing", handler=bad_handler)
    run = engine.create_run("test", stages=["failing"])
    result = engine.execute_stage(run.id, "failing")
    assert result.status == "failed"
    assert "boom" in result.error


def test_gate_blocks_stage():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    engine.register_gate("deploy", lambda run, ctx: False)
    run = engine.create_run("test", stages=["deploy"])
    result = engine.execute_stage(run.id, "deploy")
    assert result.status == "blocked"
    assert result.gate_result == "blocked"


def test_gate_passes():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    engine.register_gate("deploy", lambda run, ctx: True)
    run = engine.create_run("test", stages=["deploy"])
    result = engine.execute_stage(run.id, "deploy")
    assert result.status == "passed"
    assert result.gate_result == "passed"


def test_list_runs():
    engine = PipelineEngine(runs_dir="/tmp/pag-test-pipeline")
    engine.create_run("a", stages=["context"])
    engine.create_run("b", stages=["spec"])
    runs = engine.list_runs()
    assert len(runs) >= 2


def test_run_to_dict():
    run = PipelineRun(pipeline_name="test", stages=["context"])
    run.results["context"] = StageResult(stage="context", status="passed")
    d = run.to_dict()
    assert d["pipeline"] == "test"
    assert "context" in d["results"]


def test_pipeline_from_config():
    config = {
        "pipelines": {
            "compliance_check": {
                "stages": ["context", "analyze", "validate"],
                "agents": ["compliance"],
            }
        }
    }
    engine = PipelineEngine(config=config, runs_dir="/tmp/pag-test-pipeline")
    assert "compliance_check" in engine.list_pipelines()
    pc = engine.get_pipeline_config("compliance_check")
    assert pc["stages"] == ["context", "analyze", "validate"]
