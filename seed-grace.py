import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres.klqifxqwujsckcyuznma:7NBXfwUc3mkCd1VH@aws-1-us-east-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
s = 'tenant_grace'

# === Delete existing incomplete data ===
cur.execute(f'DELETE FROM "{s}".sermons')
cur.execute(f'DELETE FROM "{s}".bulletins')
cur.execute(f'DELETE FROM "{s}".albums')
cur.execute(f'DELETE FROM "{s}".events')
cur.execute(f'DELETE FROM "{s}".staff')
cur.execute(f'DELETE FROM "{s}".preachers')
print('Cleared existing data')

# === Preachers ===
preachers = [
    ('서성봉 목사', True),
    ('김은혜 전도사', False),
]
preacher_ids = {}
for name, is_default in preachers:
    cur.execute(f"""INSERT INTO "{s}".preachers (name, is_default) VALUES (%s, %s) RETURNING id""", (name, is_default))
    preacher_ids[name] = cur.fetchone()[0]
print(f'Preachers: {len(preachers)} inserted')

# === Sermons (실제 한국 교회 설교 스타일) ===
sermons = [
    ('은혜 안에서 자라가는 삶', '베드로후서 3:18', 'https://www.youtube.com/watch?v=5UPR3i0u4WQ', '2026-03-22', '서성봉 목사', '주일설교'),
    ('믿음의 선한 싸움', '디모데전서 6:12', 'https://www.youtube.com/watch?v=M_f3YB441o4', '2026-03-15', '서성봉 목사', '주일설교'),
    ('하나님의 사랑이 우리 가운데', '요한일서 4:7-12', 'https://www.youtube.com/watch?v=1SuW2LF46uI', '2026-03-08', '서성봉 목사', '주일설교'),
    ('광야에서 만나를 주시는 하나님', '출애굽기 16:1-15', 'https://www.youtube.com/watch?v=MbW1GNDYnvI', '2026-03-01', '서성봉 목사', '주일설교'),
    ('화평케 하는 자의 복', '마태복음 5:9', 'https://www.youtube.com/watch?v=gcrz3FOkynI', '2026-02-22', '서성봉 목사', '주일설교'),
    ('기도의 능력과 축복', '야고보서 5:13-18', 'https://www.youtube.com/watch?v=ZCSY186vDVU', '2026-02-15', '김은혜 전도사', '수요예배'),
    ('새 언약의 사람들', '예레미야 31:31-34', 'https://www.youtube.com/watch?v=JvZDT1r8YcM', '2026-02-08', '서성봉 목사', '주일설교'),
    ('여호와를 경외하는 것이 지혜의 근본', '잠언 9:10', 'https://www.youtube.com/watch?v=OhfiMXh9WTs', '2026-02-01', '서성봉 목사', '주일설교'),
]
for t, sc, yt, d, preacher, cat in sermons:
    vid = yt.split('v=')[1] if 'v=' in yt else ''
    thumb = f'https://img.youtube.com/vi/{vid}/maxresdefault.jpg' if vid else None
    pid = preacher_ids.get(preacher)
    cur.execute(f"""INSERT INTO "{s}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status)
        VALUES (%s,%s,%s,%s::date,%s,%s::uuid,%s)""", (t, sc, yt, d, thumb, str(pid), 'published'))
print(f'Sermons: {len(sermons)} inserted')

# === Bulletins (주보) ===
bulletins = [
    ('2026년 3월 22일 주보', '2026-03-22', ['https://picsum.photos/seed/gbul1a/800/1100', 'https://picsum.photos/seed/gbul1b/800/1100']),
    ('2026년 3월 15일 주보', '2026-03-15', ['https://picsum.photos/seed/gbul2a/800/1100', 'https://picsum.photos/seed/gbul2b/800/1100']),
    ('2026년 3월 8일 주보', '2026-03-08', ['https://picsum.photos/seed/gbul3a/800/1100', 'https://picsum.photos/seed/gbul3b/800/1100']),
    ('2026년 3월 1일 주보', '2026-03-01', ['https://picsum.photos/seed/gbul4a/800/1100', 'https://picsum.photos/seed/gbul4b/800/1100']),
]
for t, d, imgs in bulletins:
    cur.execute(f"""INSERT INTO "{s}".bulletins (title, bulletin_date, images, thumbnail_url, status)
        VALUES (%s,%s::date,%s,%s,%s)""", (t, d, json.dumps(imgs), imgs[0], 'published'))
print(f'Bulletins: {len(bulletins)} inserted')

# === Albums (앨범) ===
albums = [
    ('2026 부활절 예배', ['https://picsum.photos/seed/galb1a/800/600','https://picsum.photos/seed/galb1b/800/600','https://picsum.photos/seed/galb1c/800/600','https://picsum.photos/seed/galb1d/800/600']),
    ('새가족 환영회', ['https://picsum.photos/seed/galb2a/800/600','https://picsum.photos/seed/galb2b/800/600','https://picsum.photos/seed/galb2c/800/600']),
    ('성가대 찬양 콘서트', ['https://picsum.photos/seed/galb3a/800/600','https://picsum.photos/seed/galb3b/800/600','https://picsum.photos/seed/galb3c/800/600','https://picsum.photos/seed/galb3d/800/600','https://picsum.photos/seed/galb3e/800/600']),
    ('교회학교 소풍', ['https://picsum.photos/seed/galb4a/800/600','https://picsum.photos/seed/galb4b/800/600','https://picsum.photos/seed/galb4c/800/600']),
    ('2025 성탄절 행사', ['https://picsum.photos/seed/galb5a/800/600','https://picsum.photos/seed/galb5b/800/600','https://picsum.photos/seed/galb5c/800/600','https://picsum.photos/seed/galb5d/800/600','https://picsum.photos/seed/galb5e/800/600','https://picsum.photos/seed/galb5f/800/600']),
]
for t, imgs in albums:
    cur.execute(f"""INSERT INTO "{s}".albums (title, images, thumbnail_url, status)
        VALUES (%s,%s,%s,%s)""", (t, json.dumps(imgs), imgs[0], 'published'))
print(f'Albums: {len(albums)} inserted')

# === Events (행사) ===
events = [
    ('부활절 특별예배', 'https://picsum.photos/seed/gevt1/1200/600', '예배부', '2026-04-05', '본당', '부활절을 함께 기념하는 특별 예배에 초대합니다.', 'https://picsum.photos/seed/gevt1t/400/300'),
    ('여름 수련회', 'https://picsum.photos/seed/gevt2/1200/600', '청년부', '2026-07-18', '양평 수양관', '청년부 여름 수련회가 준비되어 있습니다.', 'https://picsum.photos/seed/gevt2t/400/300'),
    ('추수감사절 예배', 'https://picsum.photos/seed/gevt3/1200/600', '예배부', '2026-11-22', '본당', '감사의 마음을 나누는 추수감사절 예배', 'https://picsum.photos/seed/gevt3t/400/300'),
    ('성탄절 칸타타', 'https://picsum.photos/seed/gevt4/1200/600', '찬양팀', '2026-12-24', '본당', '성탄절 칸타타에 여러분을 초대합니다.', 'https://picsum.photos/seed/gevt4t/400/300'),
    ('신년 합동예배', 'https://picsum.photos/seed/gevt5/1200/600', '예배부', '2027-01-01', '본당', '새해 첫 합동 예배로 은혜롭게 시작하세요.', 'https://picsum.photos/seed/gevt5t/400/300'),
]
for t, bg, dept, d, loc, desc, thumb in events:
    cur.execute(f"""INSERT INTO "{s}".events (title, background_image_url, department, event_date, location, description, thumbnail_url, status)
        VALUES (%s,%s,%s,%s::date,%s,%s,%s,%s)""", (t, bg, dept, d, loc, desc, thumb, 'published'))
print(f'Events: {len(events)} inserted')

# === Staff (교역자) ===
cur.execute(f'DELETE FROM "{s}".staff')
staff = [
    ('서성봉', '담임목사', '목회', 'https://picsum.photos/seed/gstaff1/400/400', '<p>총신대학교 신학대학원 졸업. 미국 풀러신학교 목회학 석사. 20년간 목회사역.</p>', 'pastor@gracechurch.org', '010-1234-5678', 1),
    ('김은혜', '부목사', '교육', 'https://picsum.photos/seed/gstaff2/400/400', '<p>장로회신학대학교 졸업. 교육부 및 주일학교 담당.</p>', 'education@gracechurch.org', '010-2345-6789', 2),
    ('박찬양', '전도사', '찬양', 'https://picsum.photos/seed/gstaff3/400/400', '<p>한양대 음대 졸업. 찬양팀 및 성가대 지휘.</p>', 'worship@gracechurch.org', '010-3456-7890', 3),
    ('이청년', '전도사', '청년', 'https://picsum.photos/seed/gstaff4/400/400', '<p>서울신학대학교 졸업. 청년부 사역 담당.</p>', 'youth@gracechurch.org', '010-4567-8901', 4),
    ('최행정', '사무장', '행정', 'https://picsum.photos/seed/gstaff5/400/400', '<p>교회 행정 전반 및 시설 관리 담당.</p>', 'admin@gracechurch.org', '010-5678-9012', 5),
]
for name, role, dept, photo, bio, email, phone, order in staff:
    cur.execute(f"""INSERT INTO "{s}".staff (name, role, department, photo_url, bio, email, phone, sort_order, is_active)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (name, role, dept, photo, bio, email, phone, order, True))
print(f'Staff: {len(staff)} inserted')

conn.commit()
cur.close()
conn.close()
print('Done! Grace tenant seeded.')
