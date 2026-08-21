"""드라이브 음원 폴더를 읽어 사이트 플레이리스트를 맞춥니다.

쓰는 방법:
  python tools/sync-site-music.py
  npm run sync:music

기본 폴더: G:\\내 드라이브\\KNOU\\노래
다른 폴더는 인자로 넘깁니다.
  python tools/sync-site-music.py "D:\\다른\\폴더"

같은 내용의 파일은 한 곡만 넣고, 이미 있는 곡 번호는 바꾸지 않습니다.
공개 사이트에 보이려면 이 스크립트 실행 뒤 커밋해서 main에 푸시해야 합니다.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"G:\내 드라이브\KNOU\노래")
MUSIC_DIR = ROOT / "public" / "music"
MANIFEST_PATH = ROOT / "tools" / "site-music-manifest.json"
TRACKS_PATH = ROOT / "src" / "data" / "site-music-tracks.ts"
ARTIST = "BnB Study"


def file_md5(path: Path) -> str:
    hasher = hashlib.md5()
    with path.open("rb") as file:
        while True:
            chunk = file.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def title_from_name(file_name: str) -> str:
    return Path(file_name).stem.strip() or "제목 없는 곡"


def slug_from_name(file_name: str) -> str:
    stem = Path(file_name).stem.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return slug[:32] if slug else "track"


def next_track_number(tracks: list[dict]) -> int:
    numbers = []
    for track in tracks:
        match = re.match(r"bnb-(\d+)", str(track.get("id", "")))
        if match:
            numbers.append(int(match.group(1)))
    return (max(numbers) if numbers else 0) + 1


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {"sourceFolder": str(DEFAULT_SOURCE), "tracks": []}
    try:
        parsed = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"sourceFolder": str(DEFAULT_SOURCE), "tracks": []}
    tracks = parsed.get("tracks")
    if not isinstance(tracks, list):
        tracks = []
    return {"sourceFolder": str(parsed.get("sourceFolder") or DEFAULT_SOURCE), "tracks": tracks}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_tracks_ts(tracks: list[dict]) -> None:
    lines = [
        "/** 이 파일은 tools/sync-site-music.py 가 만듭니다. 직접 고치지 마세요. */",
        "import type { SiteTrack } from \"./site-music\";",
        "",
        "export const SITE_TRACKS: SiteTrack[] = [",
    ]
    for track in tracks:
        lines.append(
            "  { "
            f"id: {json.dumps(track['id'], ensure_ascii=False)}, "
            f"title: {json.dumps(track['title'], ensure_ascii=False)}, "
            f"artist: {json.dumps(track['artist'], ensure_ascii=False)}, "
            f"src: {json.dumps(track['src'], ensure_ascii=False)} "
            "},"
        )
    lines.append("];")
    lines.append("")
    TRACKS_PATH.write_text("\n".join(lines), encoding="utf-8")


def list_source_files(source_dir: Path) -> list[Path]:
    return sorted(
        [path for path in source_dir.iterdir() if path.is_file() and path.suffix.lower() == ".mp3"],
        key=lambda path: path.name.casefold(),
    )


def bootstrap_from_dest(source_files: list[Path], existing_tracks: list[dict]) -> list[dict]:
    """처음 실행이면 이미 사이트에 있는 파일을 해시로 이어 번호를 유지합니다."""
    source_by_hash: dict[str, Path] = {}
    for path in source_files:
        source_by_hash.setdefault(file_md5(path), path)
    dest_files = sorted(MUSIC_DIR.glob("*.mp3"), key=lambda path: path.name)
    known_ids = {str(track.get("id")) for track in existing_tracks}
    bootstrapped = list(existing_tracks)

    for dest in dest_files:
        digest = file_md5(dest)
        if any(track.get("md5") == digest for track in bootstrapped):
            continue
        source = source_by_hash.get(digest)
        track_id = dest.stem
        if track_id in known_ids:
            track_id = f"bnb-{next_track_number(bootstrapped):02d}-{slug_from_name(dest.name)}"
        bootstrapped.append(
            {
                "id": track_id,
                "title": title_from_name(source.name if source else dest.name),
                "artist": ARTIST,
                "src": f"/music/{dest.name}",
                "file": dest.name,
                "sourceName": source.name if source else dest.name,
                "md5": digest,
            }
        )
        known_ids.add(track_id)
    return bootstrapped


def sync(source_dir: Path) -> int:
    if not source_dir.exists() or not source_dir.is_dir():
        print(f"음원 폴더를 찾지 못했습니다: {source_dir}")
        return 1

    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    source_files = list_source_files(source_dir)
    if not source_files:
        print(f"mp3 파일이 없습니다: {source_dir}")
        return 1

    manifest = load_manifest()
    tracks = [track for track in manifest["tracks"] if isinstance(track, dict)]
    if not tracks:
        tracks = bootstrap_from_dest(source_files, tracks)

    kept: list[dict] = []
    seen_hashes: set[str] = set()
    added: list[str] = []
    skipped: list[str] = []
    removed: list[str] = []

    # 이미 목록에 있는 곡은 순서를 유지하고, 폴더에 아직 있으면 제목만 맞춥니다.
    source_by_hash: dict[str, Path] = {}
    for path in source_files:
        source_by_hash.setdefault(file_md5(path), path)

    for track in tracks:
        digest = str(track.get("md5") or "")
        source = source_by_hash.get(digest)
        dest_name = str(track.get("file") or Path(str(track.get("src", ""))).name)
        dest_path = MUSIC_DIR / dest_name
        if not source:
            if dest_path.exists():
                dest_path.unlink()
            removed.append(str(track.get("title") or dest_name))
            continue
        if digest in seen_hashes:
            skipped.append(source.name)
            continue
        if not dest_path.exists() or file_md5(dest_path) != digest:
            shutil.copy2(source, dest_path)
        kept.append(
            {
                "id": track["id"],
                "title": title_from_name(source.name),
                "artist": ARTIST,
                "src": f"/music/{dest_name}",
                "file": dest_name,
                "sourceName": source.name,
                "md5": digest,
            }
        )
        seen_hashes.add(digest)

    # 폴더에 새로 생긴 곡만 뒤에 붙입니다.
    canonical_names = {track["md5"]: track["sourceName"] for track in kept}
    for path in source_files:
        digest = file_md5(path)
        if digest in seen_hashes:
            if path.name != canonical_names.get(digest):
                skipped.append(path.name)
            continue
        number = next_track_number(kept)
        slug = slug_from_name(path.name)
        dest_name = f"bnb-{number:02d}-{slug}.mp3" if slug != "track" else f"bnb-{number:02d}.mp3"
        dest_path = MUSIC_DIR / dest_name
        shutil.copy2(path, dest_path)
        track_id = dest_name.removesuffix(".mp3")
        kept.append(
            {
                "id": track_id,
                "title": title_from_name(path.name),
                "artist": ARTIST,
                "src": f"/music/{dest_name}",
                "file": dest_name,
                "sourceName": path.name,
                "md5": digest,
            }
        )
        seen_hashes.add(digest)
        added.append(path.name)

    # 목록에 없는 사이트 파일은 지웁니다. 스크립트가 만든 mp3만 해당합니다.
    kept_files = {track["file"] for track in kept}
    for dest in MUSIC_DIR.glob("*.mp3"):
        if dest.name not in kept_files:
            dest.unlink()
            removed.append(dest.name)

    save_manifest({"sourceFolder": str(source_dir), "tracks": kept})
    write_tracks_ts(kept)

    print(f"폴더: {source_dir}")
    print(f"플레이리스트: {len(kept)}곡")
    if added:
        print("추가:")
        for name in added:
            print(f"  + {name}")
    if skipped:
        print("같은 내용이라 건너뜀:")
        for name in skipped:
            print(f"  = {name}")
    if removed:
        print("폴더에 없어서 목록에서 뺌:")
        for name in removed:
            print(f"  - {name}")
    if not added and not removed:
        print("새로 넣을 곡은 없습니다. 목록은 그대로입니다.")
    print("공개 사이트에 반영하려면 이 변경을 커밋한 뒤 main에 푸시하세요.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="드라이브 음원 폴더를 사이트 플레이리스트에 맞춥니다.")
    parser.add_argument("source", nargs="?", default=str(DEFAULT_SOURCE), help="mp3가 있는 폴더")
    args = parser.parse_args()
    return sync(Path(args.source))


if __name__ == "__main__":
    sys.exit(main())
