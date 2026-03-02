#!/bin/bash
USER1="namisha.naseem@clustox.com"
USER2="owner@clustox.com"
PASS="password123"

# Login as User 1
T1=$(curl -s -X POST http://localhost:8000/token -d "username=$USER1&password=$PASS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token'))")

# Login as User 2
T2=$(curl -s -X POST http://localhost:8000/token -d "username=$USER2&password=$PASS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token'))")

echo "--- User 1 Notifications before dismiss ---"
KEY=$(curl -s -H "Authorization: Bearer $T1" http://localhost:8000/dashboard/recent-activities | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['notification_key'] if data else '')")
echo $KEY

echo "--- User 2 Notifications before dismiss ---"
curl -s -H "Authorization: Bearer $T2" http://localhost:8000/dashboard/recent-activities | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['notification_key'] if data else '')"

echo "--- Dismissing $KEY for User 1 ---"
curl -s -X POST -H "Authorization: Bearer $T1" http://localhost:8000/dashboard/recent-activities/$KEY/dismiss

echo "--- User 1 Notifications AFTER dismiss ---"
curl -s -H "Authorization: Bearer $T1" http://localhost:8000/dashboard/recent-activities | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['notification_key'] if data else '')"

echo "--- User 2 Notifications AFTER dismiss ---"
curl -s -H "Authorization: Bearer $T2" http://localhost:8000/dashboard/recent-activities | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['notification_key'] if data else '')"

