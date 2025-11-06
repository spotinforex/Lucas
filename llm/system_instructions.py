import logging,sys
logger = logging.getLogger("runner")
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
from pathlib import Path

def read_system_instructions(file_path: str) -> str:
    '''
    Functions Opens and reads system instructions
    Args:
        file_path: path to the system instruction
    Returns:
        system_instruction: content of file
    '''
    try:
        dir = Path.cwd()
        file_path = f"{dir}/{file_path}"
        with open(file_path, "r", encoding = "utf-8") as file:
            instructions = file.read().strip()
        return instructions
    except FileNotFoundError:
        logger.error(f" Cannot Find File {file_path}")
        return None
    except Exception as e:
        logger.error(f" Error reading system instructions: {e}")
