import subprocess

def test_cli_help():
    results = subprocess.run(["python", "-m", "cli"], capture_output = True, text = True)
    assert "usage:" in results.stdout



