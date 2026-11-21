"""옹진군 재난CCTV HLS → JPEG 스냅샷 수집 (GitHub Actions용).
site/live/cams/{id}.jpg 를 갱신한다. 원본: http://218.148.169.193 (옹진군 재난CCTV시스템)"""
import json, os, re, subprocess, sys, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = 'http://218.148.169.193:1935/live'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CAMS_JSON = os.path.join(ROOT, 'live', 'cams.json')
OUT_DIR = os.path.join(ROOT, 'live', 'cams')
UA = {'User-Agent': 'familytrip-cctv-snap/1.0'}

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()

def snap(cam):
    cid = cam['id']
    try:
        pl = fetch(f'{BASE}/{cid}.stream/playlist.m3u8').decode('utf-8', 'replace')
        variant = next((l.strip() for l in pl.splitlines() if l.strip() and not l.startswith('#')), '')
        if not variant:
            return cid, 'no-variant'
        cl = fetch(f'{BASE}/{cid}.stream/{variant}').decode('utf-8', 'replace')
        segs = re.findall(r'media_[^\s#]+\.ts', cl)
        if len(segs) < 2:
            return cid, 'few-segs'
        seg = segs[-2]  # 마지막 세그먼트는 아직 쓰이는 중일 수 있어 한 개 전 사용
        ts = fetch(f'{BASE}/{cid}.stream/{seg}', timeout=25)
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
    cams = json.load(open(CAMS_JSON, encoding='utf-8'))
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(snap, cams))
    ok = sum(1 for _, s in results if s == 'ok')
    print(f'snapshots: {ok}/{len(cams)} ok')
    for cid, s in results:
        if s != 'ok':
            print(f'  cam {cid}: {s}')

if __name__ == '__main__':
    main()
