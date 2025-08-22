import argparse

def main():
    parser = argparse.ArgumentParser(prog = "lucas")
    subparsers = parser.add_subparsers(dest = "command")

    run_parser = subparsers.add_parser("run", help = "Run a backtest from YAML spec")
    run_parser.add_argument("spec", type = str, help = "Path to strategy.yaml")
    run_parser.add_argument("--report", type = str, default = "report.html", help = "Output report path")

    args = parser.parse_args()

    if args.command == "run":
        print(f"[Lucas] Running strategy spec: {args.spec}")
        print(f"[Lucas] Report will be saved: {args.report}")

    else:
        parser.print_help()

if __name__=="__main__":
    main()
