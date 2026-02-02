import os
import emoji

ROOT = "/Users/aakritigarodia/Desktop/Project"

def remove_emojis(text):
    return emoji.replace_emoji(text, replace="")

for root, dirs, files in os.walk(ROOT):
    # skip .git entirely
    if ".git" in dirs:
        dirs.remove(".git")

    for name in files:
        path = os.path.join(root, name)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            continue

        cleaned = remove_emojis(content)
        if cleaned != content:
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(cleaned)
                print(f"Cleaned: {path}")
            except PermissionError:
                print(f"Skipped (no permission): {path}")
