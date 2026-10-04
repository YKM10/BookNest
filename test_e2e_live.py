import urllib.request
import json

def test():
    # 1. Login
    login_data = json.dumps({'email': 'student@example.com', 'password': 'student123'}).encode()
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        token = res['access_token']
        print(f"Login SUCCESS! Keys: {list(res.keys())}")

    # 2. Query books
    req2 = urllib.request.Request(
        'http://127.0.0.1:8000/api/books',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req2) as resp2:
        books_data = json.loads(resp2.read().decode())
        print(f"Supabase Books Total: {len(books_data)}")
        for b in books_data[:3]:
            print(f" - {b['title']} by {b['author']} (available: {b['available_copies']}/{b['total_copies']})")

    # 3. AI Chat test
    ai_data = json.dumps({'message': 'Find beginner Python books that are available.'}).encode()
    req3 = urllib.request.Request(
        'http://127.0.0.1:8000/api/ai/chat',
        data=ai_data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    )
    with urllib.request.urlopen(req3) as resp3:
        ai_resp = json.loads(resp3.read().decode())
        print("AI Response reply:", ai_resp.get('reply')[:120], "...")

if __name__ == '__main__':
    test()
