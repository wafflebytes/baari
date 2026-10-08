#!/bin/bash
# usage: watch.sh <label> <minutes>
cd /Users/chaitanya/baari; set -a; . ./.env.shared; set +a
end=$(( $(date +%s) + $2*60 ))
while [ $(date +%s) -lt $end ]; do
  ts=$(date +%H:%M:%S)
  d=$(curl -s -H "x-admin-key: $ADMIN_KEY" $RAILS_BASE/admin/demo)
  w=$(curl -s -H "x-admin-key: $ADMIN_KEY" $RAILS_BASE/admin/wake)
  s=$(curl -s -m 20 $RAILS_BASE/app/state)
  python3 - "$ts" "$d" "$w" "$s" <<'PY'
import sys,json
ts,d,w,s=sys.argv[1:]
def j(x):
  try: return json.loads(x)
  except: return {}
d,w,s=j(d),j(w),j(s)
lk=s.get('locked') or {}
print(ts,'demo',d.get('on'),'| phase',s.get('phase'),'| wait',json.dumps(w.get('waiting') or w.get('next') or '')[:120],'| short',[x.get('dish') or x.get('name') for x in (s.get('shortlist') or {}).get('dishes',[]) ] if isinstance(s.get('shortlist'),dict) else s.get('shortlist'),'| locked',lk.get('winner'),'| turn',(s.get('turn') or {}).get('holder'), flush=True)
PY
  sleep 25
done
