import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres.klqifxqwujsckcyuznma:7NBXfwUc3mkCd1VH@aws-1-us-east-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
s = 'tenant_dwchurch'

# === Sermons ===
sermons = [
    ('은혜의 강물이 흐르는 곳', '시편 23:1-6', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-03-01', 'https://picsum.photos/seed/sermon1/640/360'),
    ('십자가의 사랑', '요한복음 3:16', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-03-08', 'https://picsum.photos/seed/sermon2/640/360'),
    ('믿음으로 걷는 길', '히브리서 11:1-6', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-03-15', 'https://picsum.photos/seed/sermon3/640/360'),
    ('기도의 능력', '마태복음 6:5-15', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-03-22', 'https://picsum.photos/seed/sermon4/640/360'),
    ('감사하는 삶', '데살로니가전서 5:16-18', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-02-22', 'https://picsum.photos/seed/sermon5/640/360'),
]
for t, sc, yt, d, th in sermons:
    cur.execute(f'INSERT INTO "{s}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, status) VALUES (%s,%s,%s,%s::date,%s,%s)', (t, sc, yt, d, th, 'published'))
print('Sermons: 5 inserted')

# === Bulletins ===
for i in range(1, 6):
    day = i * 7
    if day > 28:
        day = 28
    imgs = json.dumps([f'https://picsum.photos/seed/bul{i}a/800/1100', f'https://picsum.photos/seed/bul{i}b/800/1100'])
    cur.execute(f'INSERT INTO "{s}".bulletins (title, bulletin_date, pdf_url, images, status) VALUES (%s,%s::date,%s,%s::jsonb,%s)',
        (f'2026년 3월 {day}일 주일예배 주보', f'2026-03-{day:02d}', f'https://example.com/bulletin-{i}.pdf', imgs, 'published'))
print('Bulletins: 5 inserted')

# === Columns ===
columns = [
    ('봄날의 감사', '<p>사랑하는 성도 여러분, 따뜻한 봄날이 찾아왔습니다.</p><p>겨울의 추위를 이겨내고 피어나는 꽃들처럼, 우리의 믿음도 시련을 통해 더욱 아름답게 피어납니다.</p>'),
    ('믿음의 여정', '<p>믿음의 길을 걷는다는 것은 때로는 보이지 않는 길을 걷는 것과 같습니다.</p><p>아브라함이 본향을 떠나 미지의 땅으로 향했듯이, 우리도 하나님의 인도하심을 믿고 한 걸음씩 나아갑니다.</p>'),
    ('사랑의 씨앗', '<p>작은 사랑의 씨앗 하나가 큰 나무로 자라듯, 우리의 작은 섬김이 세상을 변화시킵니다.</p>'),
    ('소망의 노래', '<p>어두운 밤이 지나면 반드시 밝은 아침이 옵니다.</p><p>소망을 잃지 마시길 부탁드립니다.</p>'),
    ('은혜의 빛', '<p>은혜란 우리가 받을 자격이 없는데도 주시는 하나님의 선물입니다.</p><p>매일 아침 눈을 뜨는 것 자체가 은혜입니다.</p>'),
]
for i, (t, c) in enumerate(columns):
    cur.execute(f'INSERT INTO "{s}".columns_pastoral (title, content, top_image_url, thumbnail_url, status) VALUES (%s,%s,%s,%s,%s)',
        (t, c, f'https://picsum.photos/seed/col{i+1}/800/400', f'https://picsum.photos/seed/col{i+1}t/400/300', 'published'))
print('Columns: 5 inserted')

# === Albums ===
albums = ['2026 신년감사예배', '교회 창립 30주년', '부활절 특별찬양', '여름성경학교', '성탄절 축하공연']
for i, t in enumerate(albums):
    imgs = json.dumps([f'https://picsum.photos/seed/alb{i+1}{c}/800/600' for c in 'abcde'])
    cur.execute(f'INSERT INTO "{s}".albums (title, images, thumbnail_url, status) VALUES (%s,%s::jsonb,%s,%s)',
        (t, imgs, f'https://picsum.photos/seed/alb{i+1}/400/300', 'published'))
print('Albums: 5 inserted')

# === Events ===
events = [
    ('부활절 특별예배', '2026-04-05', '본당', '예배부'),
    ('어버이주일 감사예배', '2026-05-10', '본당', '교육부'),
    ('여름수련회', '2026-07-20', '양평수양관', '청년부'),
    ('추수감사절 예배', '2026-11-22', '본당', '예배부'),
    ('성탄절 칸타타', '2026-12-25', '본당', '찬양팀'),
]
for i, (t, d, loc, dept) in enumerate(events):
    cur.execute(f'INSERT INTO "{s}".events (title, background_image_url, event_date, location, department, description, thumbnail_url, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
        (t, f'https://picsum.photos/seed/evt{i+1}/1200/600', d, loc, dept,
         f'{t}에 온 성도님들을 초대합니다. 함께 은혜를 나누는 시간이 되기를 소망합니다.',
         f'https://picsum.photos/seed/evt{i+1}t/400/300', 'published'))
print('Events: 5 inserted')

# === Banners ===
banners = [
    ('주일예배 안내', 'main'),
    ('부활절 특별예배', 'main'),
    ('여름수련회 등록', 'main'),
    ('교회 창립 30주년', 'sub'),
    ('성탄절 행사 안내', 'sub'),
]
for i, (t, cat) in enumerate(banners):
    cur.execute(f'INSERT INTO "{s}".banners (title, pc_image_url, mobile_image_url, link_url, category, status) VALUES (%s,%s,%s,%s,%s,%s)',
        (t, f'https://picsum.photos/seed/ban{i+1}pc/1920/600', f'https://picsum.photos/seed/ban{i+1}m/720/1280', '', cat, 'published'))
print('Banners: 5 inserted')

# === Staff ===
staff_list = [
    ('김영수', '담임목사', '목회', 'pastor.kim@example.com', '010-1234-5678', '<p>서울신학대학교 졸업. 미국 풀러신학교 목회학 석사. 2010년부터 담임목사로 섬기고 있습니다.</p>', 1),
    ('이은혜', '부목사', '교육', 'lee.eh@example.com', '010-2345-6789', '<p>총신대학교 신학대학원 졸업. 교육부와 주일학교를 담당하고 있습니다.</p>', 2),
    ('박성민', '전도사', '청년', 'park.sm@example.com', '010-3456-7890', '<p>장로회신학대학교 졸업. 청년부 사역을 담당하고 있습니다.</p>', 3),
    ('최미영', '전도사', '찬양', 'choi.my@example.com', '010-4567-8901', '<p>한양대학교 음악대학 졸업. 찬양팀과 성가대를 이끌고 있습니다.</p>', 4),
    ('정현우', '사무장', '행정', 'jung.hw@example.com', '010-5678-9012', '<p>교회 행정 전반과 시설 관리를 담당하고 있습니다.</p>', 5),
]
for name, role, dept, email, phone, bio, order in staff_list:
    sns = json.dumps({'facebook': '', 'instagram': '', 'youtube': ''})
    cur.execute(f'INSERT INTO "{s}".staff (name, role, department, email, phone, bio, photo_url, sns_links, sort_order, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s)',
        (name, role, dept, email, phone, bio, f'https://picsum.photos/seed/staff{order}/400/400', sns, order, True))
print('Staff: 5 inserted')

# === History ===
history_data = [
    (2024, [
        {'id': 'h1', 'month': 1, 'day': 7, 'content': '2024년 신년감사예배', 'photoUrl': ''},
        {'id': 'h2', 'month': 3, 'day': 15, 'content': '교회 창립 30주년 기념예배', 'photoUrl': 'https://picsum.photos/seed/hist1/400/300'},
        {'id': 'h3', 'month': 7, 'day': 20, 'content': '여름성경학교 개최 (참가 120명)', 'photoUrl': ''},
        {'id': 'h4', 'month': 10, 'day': 5, 'content': '가을음악회 개최', 'photoUrl': ''},
        {'id': 'h5', 'month': 12, 'day': 25, 'content': '성탄절 칸타타 공연', 'photoUrl': 'https://picsum.photos/seed/hist2/400/300'},
    ]),
    (2023, [
        {'id': 'h6', 'month': 2, 'day': 0, 'content': '교육관 리모델링 완료', 'photoUrl': ''},
        {'id': 'h7', 'month': 5, 'day': 12, 'content': '해외선교팀 파송 (태국)', 'photoUrl': 'https://picsum.photos/seed/hist3/400/300'},
        {'id': 'h8', 'month': 8, 'day': 15, 'content': '청년부 수련회 (속초)', 'photoUrl': ''},
        {'id': 'h9', 'month': 11, 'day': 19, 'content': '추수감사절 바자회', 'photoUrl': ''},
    ]),
    (2022, [
        {'id': 'h10', 'month': 3, 'day': 1, 'content': '제2대 담임목사 취임', 'photoUrl': 'https://picsum.photos/seed/hist4/400/300'},
        {'id': 'h11', 'month': 6, 'day': 0, 'content': '교회 홈페이지 리뉴얼', 'photoUrl': ''},
        {'id': 'h12', 'month': 9, 'day': 18, 'content': '교회 설립 28주년 기념행사', 'photoUrl': ''},
    ]),
]
for year, items in history_data:
    cur.execute(f'INSERT INTO "{s}".history (year, items) VALUES (%s, %s::jsonb)', (year, json.dumps(items)))
print('History: 3 years inserted')

conn.commit()
conn.close()
print('=== ALL DONE ===')
