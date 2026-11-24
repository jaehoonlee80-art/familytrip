# -*- coding: utf-8 -*-
"""한국공항공사 실시간 항공운항(info) -> korea/flights.json
cron에서 15분마다 실행. serviceKey는 공공데이터포털 일반인증키."""
import json, os, sys, time, urllib.request, urllib.parse, datetime

KEY = os.environ.get('DATA_GO_KR_KEY', '')
if not KEY:
    sys.exit('DATA_GO_KR_KEY 환경변수가 필요합니다 (GitHub Secrets)')
BASE = 'https://apis.data.go.kr/B551178/flight-status/info'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'korea', 'flights.json')

def fetch(page):
    q = urllib.parse.urlencode({
        'serviceKey': KEY, '_type': 'json', 'type': 'json',
        'numOfRows': 100, 'pageNo': page,
    })
    req = urllib.request.Request(BASE + '?' + q, headers={'User-Agent': 'familytrip/1.0'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def norm(it):
    return {
        'io': it.get('io'), 'line': it.get('line'),
        'al': it.get('airlineKorean'), 'alE': it.get('airlineEnglish'),
        'f': it.get('airFln'), 'apt': it.get('airport'), 'city': it.get('city'),
        'fromK': it.get('boardingKor'), 'fromE': it.get('boardingEng'),
        'toK': it.get('arrivedKor'), 'toE': it.get('arrivedEng'),
        'std': it.get('std'), 'etd': it.get('etd'),
        'rmk': (it.get('rmkKor') or '').strip(), 'rmkE': (it.get('rmkEng') or '').strip(),
        'gate': it.get('gate'),
    }

def main():
    items, page, total = [], 1, None
    while True:
        d = fetch(page)
        body = d.get('response', {}).get('body', {})
        if total is None:
            total = int(body.get('totalCount', 0))
        its = body.get('items', {}).get('item') or []
        if isinstance(its, dict):
            its = [its]
        items.extend(norm(i) for i in its)
        if len(items) >= total or not its or page > 30:
            break
        page += 1
        time.sleep(0.3)
    data = {
        'ts': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'count': len(items), 'items': items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('wrote', len(items), 'flights ->', OUT)

if __name__ == '__main__':
    main()
