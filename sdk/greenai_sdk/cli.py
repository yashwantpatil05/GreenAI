"""CLI entrypoint wrapping GreenAI tracker."""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

from .tracker import GreenAITracker
from .hardware import detect_hardware


def load_config():
    """Load config from home directory."""
    path = os.path.expanduser("~/.greenai/config")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(data):
    """Persist config."""
    path = os.path.expanduser("~/.greenai")
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, "config"), "w", encoding="utf-8") as f:
        json.dump(data, f)


def run_command(args):
    """Execute wrapped command."""
    process = subprocess.Popen(args, shell=True)
    process.wait()
    return process.returncode


def main():
    parser = argparse.ArgumentParser(description="GreenAI CLI")
    subparsers = parser.add_subparsers(dest="command")

    run_parser = subparsers.add_parser("run", help="Wrap a command and track telemetry")
    run_parser.add_argument("--project-id", required=False)
    run_parser.add_argument("--api-key", required=False)
    run_parser.add_argument("--model-name", required=True)
    run_parser.add_argument("--model-version", default="v1")
    run_parser.add_argument("--job-type", default="training")
    run_parser.add_argument("--region", default="aws:eu-west-1")
    run_parser.add_argument("--cmd", required=True)

    configure_parser = subparsers.add_parser("configure", help="Save defaults (api key, project id)")
    configure_parser.add_argument("--project-id", required=True)
    configure_parser.add_argument("--api-key", required=True)

    args = parser.parse_args()
    if args.command == "configure":
        save_config({"api_key": args.api_key, "project_id": args.project_id})
        print("Configuration saved to ~/.greenai/config")
        return

    if args.command == "run":
        cfg = load_config()
        api_key = args.api_key or cfg.get("api_key")
        project_id = args.project_id or cfg.get("project_id")
        if not api_key or not project_id:
            print("API key and project ID required (pass flags or run `greenai-cli configure`)")
            sys.exit(1)
        tracker = GreenAITracker(
            api_key=api_key,
            project_id=project_id,
            model_name=args.model_name,
            model_version=args.model_version,
            job_type=args.job_type,
            region=args.region,
        )
        start = datetime.utcnow()
        ret = run_command(args.cmd)
        tracker.end_time = datetime.utcnow()
        tracker.start_time = start
        tracker.hardware = detect_hardware()
        tracker.stop()
        sys.exit(ret)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
