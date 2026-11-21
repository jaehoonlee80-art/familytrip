"""공공 CCTV HLS → JPEG 스냅샷 수집 (GitHub Actions용).
live/cams.json(옹진군) + live/port-cams.json(인천항) 처리.
site/live/cams/{id}.jpg 를 갱신한다."""
import json, os, re, subprocess, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'live', 'cams')
SOURCES = [
    (os.path.join(ROOT, 'live', 'cams.json'), 'http://218.148.169.193:1935/live', 'playlist.m3u8', '{id}.stream'),
    (os.path.join(ROOT, 'live', 'port-cams.json'), 'http://{host}:1935/live', 'plylist.m3u8', '{stream}.stream'),
]
UA = {'User-Agent': 'familytrip-cctv-snap/1.0'}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()

def snap(cam, base_t, list_t, path_t):
    cid = cam['id']
    try:
        if '{host}' in base_t:
            base = base_t.format(host=cam['host'])
        else:
            base = base_t
        stream_name = path_t.format(**cam) if '{stream}' in path_t else path_t.format(id=cam['id'])
        listfile = list_t
        pl_url = f'{base}/{stream_name}/{listfile}'
        pl = fetch(pl_url).decode('utf-8', 'replace')
        variant = next((l.strip() for l in pl.splitlines() if l.strip() and not l.startswith('#')), '')
        if not variant:
            return cid, 'no-variant'
        cl = fetch(f'{base}/{stream_name}/{variant}').decode('utf-8', 'replace')
        segs = re.findall(r'[^\s#]+\.ts', cl)
        if len(segs) < 2:
            return cid, 'few-segs'
        seg = segs[-2]  # 마지막 세그먼트는 아직 쓰이는 중일 수 있어 한 개 전 사용
        ts = fetch(f'{base}/{stream_name}/{seg}', timeout=25)
        ts_path = os.path.join(tempfile.gettempdir(), f'cam_{cid}.ts')
        with open(ts_path, 'wb') as f:
            f.write(ts)
        out = os.path.join(OUT_DIR, f'{cid}.jpg')
        r = subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', '-ss', '5', '-i', ts_path,
             '-frames:v', '1', '-q:v', '4', '-update', '1', out],
            capture_output=True, timeout=60)
        os.remove(ts_path)
        return cid, 'ok' if r.returncode == 0 and os.path.exists(out) else 'ffmpeg-fail'
    except Exception as e:
        return cid, f'err:{type(e).__name__}'

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = []
    for path, base, lst, pt in SOURCES:
        if not os.path.exists(path):
            continue
        for cam in json.load(open(path, encoding='utf-8')):
            jobs.append((cam, base, lst, pt))
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(lambda j: snap(*j), jobs))
    ok = sum(1 for _, s in results if s == 'ok')
    print(f'snapshots: {ok}/{len(jobs)} ok')
    for cid, s in results:
        if s != 'ok':
            print(f'  cam {cid}: {s}')

if __name__ == '__main__':
    main()
