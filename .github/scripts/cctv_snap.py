"""공공 CCTV HLS → JPEG 스냅샷 수집 (GitHub Actions용).
live/cams.json(옹진군) + live/port-cams.json(인천항) 처리.
site/live/cams/{id}.jpg 를 갱신한다."""
import json, os, re, subprocess, tempfile, urllib.request, http.cookiejar
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'live', 'cams')
SOURCES = [
    (os.path.join(ROOT, 'live', 'cams.json'), 'http://218.148.169.193:1935/live', 'playlist.m3u8', '{id}.stream'),
    (os.path.join(ROOT, 'live', 'port-cams.json'), 'http://{host}:1935/live', 'plylist.m3u8', '{stream}.stream'),
    (os.path.join(ROOT, 'live', 'fitic-cams.json'), 'http://{host}:1935/cctv', 'playlist.m3u8', '{stream}.stream'),
]
UA = {'User-Agent': 'familytrip-cctv-snap/1.0'}
# 해변 카메라: http JPEG 직접 다운로드 (ffmpeg 불필요)
BEACH_JSON = os.path.join(ROOT, 'live', 'beach-cams.json')
BEACH_URL = 'http://220.95.232.18/camera/{code}_{cam}.jpg'
# 전국 카메라 디렉토리 스냅샷 소스 (서귀포·제주danger·제주wave)
KR_SRC_JSON = os.path.join(ROOT, 'live', 'kr-snap-sources.json')

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

def snap_ffmpeg(cam, jw_sess=None):
    """임의 HLS URL → ffmpeg로 1프레임 추출."""
    cid = cam['id']
    try:
        url = cam.get('url')
        if cam.get('kind') == 'jejusi-wave':
            url = jejusi_hls_url(cam['cam'], jw_sess)
            if not url:
                return cid, 'no-hlsurl'
        if cam.get('kind') == 'jeju-danger':
            return snap_ts_segment(cam, url)
        out = os.path.join(OUT_DIR, f'{cid}.jpg')
        r = subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error',
             '-i', url, '-frames:v', '1', '-q:v', '4', '-update', '1',
             '-rw_timeout', '20000000', out],
            capture_output=True, timeout=90)
        return cid, 'ok' if r.returncode == 0 and os.path.exists(out) else 'ffmpeg-fail'
    except Exception as e:
        return cid, f'err:{type(e).__name__}'

def snap_ts_segment(cam, pl_url):
    """세그먼트에 확장자가 없는 HLS(제주danger) — 마지막 .ts를 직접 받아 프레임 추출."""
    cid = cam['id']
    pl = fetch(pl_url, timeout=20).decode('utf-8', 'replace')
    segs = [l.strip() for l in pl.splitlines() if l.strip() and not l.startswith('#')]
    if not segs:
        return cid, 'few-segs'
    base = pl_url.rsplit('/', 1)[0] + '/'
    host = 'http://59.8.86.94:8080'
    # 라이브 엣지 세그먼트는 회전이 빨라 뒤쪽부터 순서대로 시도
    for seg in reversed(segs[-3:]):
        if seg.startswith('http'):
            seg_url = seg
        elif seg.startswith('/'):
            seg_url = host + seg
        else:
            seg_url = base + seg
        try:
            ts = fetch(seg_url, timeout=30)
        except Exception:
            continue
        if len(ts) < 10000:
            continue
        ts_path = os.path.join(tempfile.gettempdir(), f'cam_{cid}.ts')
        with open(ts_path, 'wb') as f:
            f.write(ts)
        out = os.path.join(OUT_DIR, f'{cid}.jpg')
        r = subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', '-i', ts_path,
             '-frames:v', '1', '-q:v', '4', '-update', '1', out],
            capture_output=True, timeout=60)
        os.remove(ts_path)
        if r.returncode == 0 and os.path.exists(out):
            return cid, 'ok'
    return cid, 'ffmpeg-fail'

def jejusi_session():
    """제주시 realcctvHls 세션 1개 — CSRF 토큰+쿠키를 19대가 공유."""
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.addheaders = [('User-Agent', 'Mozilla/5.0')]
    page = 'https://www.jejusi.go.kr/bangjae/realcctvHls/waveHlsCctv.do'
    h = op.open(page, timeout=20).read().decode('utf-8', 'replace')
    m = re.search(r'_csrf" content="([^"]+)', h)
    if not m:
        return None, None
    return op, (page, m.group(1))

def jejusi_hls_url(cam, sess):
    """공유 세션으로 hlsUrl 발급 (병렬 호출 시 WAF 차단 → 순차 처리)."""
    if not sess or not sess[0]:
        return None
    op, (page, csrf) = sess
    req = urllib.request.Request(
        'https://www.jejusi.go.kr/bangjae/realcctvHls/getHlsCctvUrlAjax.ajax',
        data=('point_id=' + str(cam)).encode(), method='POST',
        headers={'X-CSRF-TOKEN': csrf,
                 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                 'X-Requested-With': 'XMLHttpRequest',
                 'Referer': page})
    j = json.loads(op.open(req, timeout=20).read().decode('utf-8'))
    return j.get('hlsUrl')

def snap_jpg(cam):
    cid = cam['id']
    try:
        data = fetch(BEACH_URL.format(**cam), timeout=20)
        if len(data) < 3000 or not data[:2] == b'\xff\xd8':
            return cid, 'bad-img'
        with open(os.path.join(OUT_DIR, f'{cid}.jpg'), 'wb') as f:
            f.write(data)
        return cid, 'ok'
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
    jpg_jobs = []
    if os.path.exists(BEACH_JSON):
        jpg_jobs = json.load(open(BEACH_JSON, encoding='utf-8'))
    ff_jobs = []
    jw_jobs = []
    if os.path.exists(KR_SRC_JSON):
        for cam in json.load(open(KR_SRC_JSON, encoding='utf-8')):
            (jw_jobs if cam.get('kind') == 'jejusi-wave' else ff_jobs).append(cam)
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(lambda j: snap(*j), jobs))
        results += list(ex.map(snap_jpg, jpg_jobs))
        results += list(ex.map(snap_ffmpeg, ff_jobs))
    # jejusi-wave는 세션 공유 + 순차 (병렬 시 jejusi.go.kr WAF 차단)
    if jw_jobs:
        jw_sess = jejusi_session()
        for cam in jw_jobs:
            results.append(snap_ffmpeg(cam, jw_sess))
    ok = sum(1 for _, s in results if s == 'ok')
    print(f'snapshots: {ok}/{len(jobs)} ok')
    for cid, s in results:
        if s != 'ok':
            print(f'  cam {cid}: {s}')

if __name__ == '__main__':
    main()
