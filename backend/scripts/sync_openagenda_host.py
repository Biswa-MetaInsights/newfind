"""Run the OpenAgenda sync in NewFind's existing event container."""
import argparse
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def key_from_environment():
    key = os.environ.get('OPENAGENDA_PUBLIC_KEY', '')
    if not key and (ROOT / '.env').exists():
        for line in (ROOT / '.env').read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name == 'OPENAGENDA_PUBLIC_KEY':
                key = value.strip().strip('"').strip("'")
    return key if key.startswith('oa_pk_') else ''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--check-config', action='store_true')
    parser.add_argument('--pages', type=int, default=5, choices=range(1, 11))
    args = parser.parse_args()
    key = key_from_environment()
    if args.check_config:
        print('OPENAGENDA_PUBLIC_KEY: ' + ('configured' if key else 'missing'))
        return 0 if key else 2
    if not key:
        raise RuntimeError('OpenAgenda public key missing; import was not activated')
    command = ['docker', 'compose', '-p', 'newfind', 'exec', '-T', 'event',
               'python', '-m', 'backend.scripts.sync_openagenda', '--pages', str(args.pages)]
    if args.apply:
        command.append('--apply')
    result = subprocess.run(command, cwd=ROOT, input=json.dumps({'key': key}).encode(),
                            capture_output=True, timeout=1200)
    if result.returncode:
        raise RuntimeError('OpenAgenda sync failed; check private service logs and provider access')
    summary = json.loads(result.stdout)
    print(json.dumps(summary), flush=True)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else 'OpenAgenda sync operation failed')
