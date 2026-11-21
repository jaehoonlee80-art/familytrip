"""KBS 재난포털 CCTV 목록 갱신 — live/kbs-cams.json 생성.
토큰 URL이 만료되므로 주기적으로 재수집한다."""
import json, os, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'live', 'kbs-cams.json')
URL = 'https://d.kbs.co.kr/special/cctv/list'

def main():
    data = urllib.parse.urlencode({'area': '', 'disaster': '8'}).encode()
    req = urllib.request.Request(URL, data=data, headers={
        'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest'})
    d = json.loads(urllib.request.urlopen(req, timeout=20).read().decode('utf-8'))
    cams = []
    for c in d.get('cctvList', []):
        if c.get('available') != 'Y' or not c.get('url'):
            continue
        cams.append({'id': c['cctvId'], 'name': c.get('name', ''),
                     'region': c.get('subtitleMainText') or c.get('adressFull', ''),
                     'api': c['url']})
    cams.sort(key=lambda c: c['id'])
    json.dump(cams, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'kbs cams: {len(cams)}')

if __name__ == '__main__':
    main()
