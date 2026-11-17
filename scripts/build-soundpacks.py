"""Regenerate data/soundpacks.json tree for $POCKET1 from disk."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POCKET_ROOT = ROOT / "sounds" / "$POCKET1"


def list_wavs(folder: Path) -> list[str]:
    return sorted(p.name for p in folder.glob("*.wav") if p.is_file())


def build_tree(dir_path: Path) -> dict:
    node: dict = {"name": dir_path.name if dir_path != POCKET_ROOT else ""}
    children = []
    for child in sorted(dir_path.iterdir()):
        if child.is_dir():
            sub = build_tree(child)
            if sub.get("files") or sub.get("children"):
                children.append(sub)
    if children:
        node["children"] = children
    files = list_wavs(dir_path)
    if files:
        node["files"] = files
    return node


def prune(node: dict) -> dict:
    children = node.get("children") or []
    children = [prune(c) for c in children]
    children = [c for c in children if c.get("files") or c.get("children")]
    if children:
        node["children"] = children
    elif "children" in node:
        del node["children"]
    if node.get("files") == []:
        node.pop("files", None)
    return node


tree = prune(build_tree(POCKET_ROOT))
wav_count = len(list(POCKET_ROOT.rglob("*.wav")))

out = {
    "packs": [
        {
            "id": "pocket-1",
            "title": "$POCKET1",
            "folder": "$POCKET1",
            "description": "Pocket drum one-shots, 808s, FX, and minisynth loops.",
            "zipPath": "sounds/$POCKET1.zip",
            "sizeLabel": f"{wav_count} samples",
            "tree": tree,
        },
        {
            "id": "example-1",
            "title": "Example 1",
            "folder": "Example 1",
            "description": "CMD drum one-shots.",
            "zipPath": "",
            "sizeLabel": "4 samples",
            "tree": {
                "name": "",
                "files": [
                    "CMD Kick.wav",
                    "CMD Snare.wav",
                    "CMD Clap.wav",
                    "CMD Hat.wav",
                ],
            },
        },
    ]
}

(ROOT / "data" / "soundpacks.json").write_text(
    json.dumps(out, indent=2) + "\n", encoding="utf-8"
)
print(f"wrote soundpacks.json ({wav_count} wavs in $POCKET1)")