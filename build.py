"""
build.py — 将 vault/ 内容编译为静态数据文件 web/static/js/data.js

用法:  python build.py

生成 data.js 后，直接用浏览器打开 web/templates/index.html 即可运行。
无需 Flask、无需 Python 后端。
"""
import json
import os
import sys
import random
import hashlib
import re

# 允许从 web/ 目录导入 services 模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'web'))

from services.vault_loader import (
    load_areas, load_directions, load_topics,
    load_topic_by_id, load_direction_by_id, load_learning_paths,
)
from services.graph_builder import get_graph_data
from services.progress import get_progress
from services.quiz_engine import parse_quiz
from services.search import build_cli_search_prompt

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, 'web', 'static', 'js', 'data.js')


def build():
    print("读取 vault 内容...")
    areas = load_areas()
    directions = load_directions()
    topics = load_topics()
    paths = load_learning_paths()

    # ── 基础知识数据 ────────────────────────────────────────────
    area_map = {a['id']: a for a in areas}
    dir_map = {d['id']: d for d in directions}

    # 精简 topic 元数据（不含 body 和 quiz 原文）
    topics_meta = []
    topic_map = {}
    for t in topics:
        tid = t.get('id')
        body = t.get('body', '') or ''
        desc = body.strip().split('\n')[0][:200] if body else ''
        # 分离正文（Quiz 之前的内容）和全文
        body_without_quiz = body.split('## Quiz')[0].strip() if '## Quiz' in body else body
        meta = {
            'id': tid,
            'name': t.get('name'),
            'name_en': t.get('name_en'),
            'area': t.get('area'),
            'direction': t.get('direction'),
            'difficulty': t.get('difficulty', 3),
            'importance': t.get('importance', 3),
            'prerequisites': t.get('prerequisites', []),
            'tags': t.get('tags', []),
            'description': desc,
            'body': body_without_quiz,
            'body_full': body,
            'status': 'unknown',
            'tested': False,
        }
        topics_meta.append(meta)
        topic_map[tid] = meta

    # ── Quiz 数据（含正确答案，供前端判分） ────────────────────
    quizzes = {}  # { topic_id: [question_objects_with_answers] }
    for t in topics:
        tid = t.get('id')
        qs = parse_quiz(t.get('body', '') or '', topic_id=tid)
        if qs:
            # 保留 correct_index 和 explanation，前端用它们判分
            quizzes[tid] = qs

    # ── 图谱数据（默认状态，运行时由前端合并 localStorage） ──
    graph = get_graph_data()

    # ── 进度数据 ────────────────────────────────────────────────
    progress = get_progress()

    # ── 预生成全局诊断题（15 方向 × 2 题） ───────────────────────
    diagnostic_db = []
    for d in directions:
        did = d['id']
        dir_questions = []
        for t_data in topics:
            if t_data.get('direction') != did:
                continue
            tid = t_data.get('id')
            qs = quizzes.get(tid, [])
            for q in qs:
                q_copy = dict(q)
                q_copy['topic_id'] = tid
                q_copy['topic_name'] = t_data.get('name')
                q_copy['direction_id'] = did
                q_copy['direction_name'] = d.get('name')
                q_copy['area_id'] = d.get('area')
                dir_questions.append(q_copy)
        # 预计算每方向每组组合（最多2题），供前端快速采样
        if len(dir_questions) >= 2:
            diagnostic_db.append({
                'direction_id': did,
                'direction_name': d.get('name'),
                'area_id': d.get('area'),
                'questions': dir_questions,
                # 预计算确定性打乱种子
            })
        elif dir_questions:
            diagnostic_db.append({
                'direction_id': did,
                'direction_name': d.get('name'),
                'area_id': d.get('area'),
                'questions': dir_questions,
            })

    # ── 预生成方向测评数据 ──────────────────────────────────────
    direction_quizzes = {}
    for d in directions:
        did = d['id']
        dir_topics = sorted(
            [t for t in topics if t.get('direction') == did],
            key=lambda t: (t.get('difficulty', 3), t.get('name', ''))
        )
        all_qs = []
        topic_infos = []
        for t in dir_topics:
            tid = t.get('id')
            qs = quizzes.get(tid, [])
            for q in qs:
                q_copy = dict(q)
                q_copy['topic_id'] = tid
                q_copy['topic_name'] = t.get('name')
                q_copy['direction_id'] = did
                all_qs.append(q_copy)
            topic_infos.append({
                'topic_id': tid,
                'topic_name': t.get('name'),
                'topic_name_en': t.get('name_en'),
                'difficulty': t.get('difficulty', 3),
                'question_count': len(qs),
            })
        direction_quizzes[did] = {
            'direction_id': did,
            'direction_name': d.get('name'),
            'direction_name_en': d.get('name_en'),
            'area_id': d.get('area'),
            'topics': topic_infos,
            'questions': all_qs,
            'total_questions': len(all_qs),
        }

    # ── 预生成课程提示词 ────────────────────────────────────────
    course_prompts = {}
    for area in areas:
        key = f"area/{area['id']}"
        result = build_cli_search_prompt(area['id'], 'area')
        if result:
            course_prompts[key] = result
    for d in directions:
        key = f"direction/{d['id']}"
        result = build_cli_search_prompt(d['id'], 'direction')
        if result:
            course_prompts[key] = result
    for t in topics:
        key = f"topic/{t['id']}"
        result = build_cli_search_prompt(t['id'], 'topic')
        if result:
            course_prompts[key] = result

    # ── 搜索索引（预分词） ──────────────────────────────────────
    search_index = []
    for t in topics:
        tid = t.get('id')
        name = t.get('name', '')
        name_en = t.get('name_en', '') or ''
        body = (t.get('body', '') or '').split('##')[0]
        tags = ' '.join(t.get('tags', []))
        all_text = f"{name} {name_en} {tags} {body}"
        # CJK 分词
        all_text = re.sub(r'([一-鿿])([a-zA-Z0-9])', r'\1 \2', all_text)
        all_text = re.sub(r'([a-zA-Z0-9])([一-鿿])', r'\1 \2', all_text)
        tokens = set(t.lower() for t in re.split(r'[\s，。、,./\\|]+', all_text) if len(t) >= 1)
        search_index.append({
            'id': tid,
            'name': name,
            'name_en': name_en,
            'type': 'topic',
            'description': body.strip()[:120] if body else '',
            'difficulty': t.get('difficulty', 3),
            'importance': t.get('importance', 3),
            'tags': t.get('tags', []),
            'direction_id': t.get('direction', ''),
            'direction_name': dir_map.get(t.get('direction', ''), {}).get('name', ''),
            'area_id': t.get('area', ''),
            'area_name': area_map.get(t.get('area', ''), {}).get('name', ''),
            'area_color': area_map.get(t.get('area', ''), {}).get('color', '#888'),
            'tokens': list(tokens),
        })

    for d in directions:
        did = d['id']
        name = d.get('name', '')
        desc = d.get('description', '') or ''
        all_text = f"{name} {desc}"
        all_text = re.sub(r'([一-鿿])([a-zA-Z0-9])', r'\1 \2', all_text)
        all_text = re.sub(r'([a-zA-Z0-9])([一-鿿])', r'\1 \2', all_text)
        tokens = set(t.lower() for t in re.split(r'[\s，。、,./\\|]+', all_text) if len(t) >= 1)
        search_index.append({
            'id': did,
            'name': name,
            'name_en': d.get('name_en', '') or '',
            'type': 'direction',
            'description': desc[:120] if desc else '',
            'topic_count': d.get('topic_count', 0),
            'area_id': d.get('area', ''),
            'area_name': area_map.get(d.get('area', ''), {}).get('name', ''),
            'area_color': area_map.get(d.get('area', ''), {}).get('color', '#888'),
            'tokens': list(tokens),
        })

    for a in areas:
        aid = a['id']
        name = a.get('name', '')
        desc = a.get('description', '') or ''
        all_text = f"{name} {desc}"
        all_text = re.sub(r'([一-鿿])([a-zA-Z0-9])', r'\1 \2', all_text)
        all_text = re.sub(r'([a-zA-Z0-9])([一-鿿])', r'\1 \2', all_text)
        tokens = set(t.lower() for t in re.split(r'[\s，。、,./\\|]+', all_text) if len(t) >= 1)
        search_index.append({
            'id': aid,
            'name': name,
            'name_en': a.get('name_en', '') or '',
            'type': 'area',
            'description': desc[:120] if desc else '',
            'color': a.get('color', '#888'),
            'icon': a.get('icon', ''),
            'direction_count': a.get('direction_count', 0),
            'tokens': list(tokens),
        })

    # ── 组装输出 ────────────────────────────────────────────────
    data = {
        'areas': areas,
        'directions': directions,
        'topics': topics_meta,
        'topics_full': topic_map,
        'quizzes': quizzes,
        'graph': graph,
        'progress': progress,
        'paths': paths,
        'diagnostic_db': diagnostic_db,
        'direction_quizzes': direction_quizzes,
        'course_prompts': course_prompts,
        'search_index': search_index,
    }

    # ── 写入 data.js ────────────────────────────────────────────
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    json_str = json.dumps(data, ensure_ascii=False)
    js_content = f'window.__DATA__ = {json_str};'

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(js_content)

    size_kb = len(js_content) / 1024
    print(f"✓ 已生成 {OUTPUT} ({size_kb:.1f} KB)")
    print(f"  包含: {len(areas)} 大类, {len(directions)} 方向, {len(topics)} 主题")
    print(f"  Quiz 题数: {sum(len(v) for v in quizzes.values())} 题")
    print(f"  搜索索引: {len(search_index)} 条")

    return data


# ════════════════════════════════════════════════════════════════
# 构建时导出
# ════════════════════════════════════════════════════════════════

EXPORT_DIR = os.path.join(ROOT, 'exports')


def _yaml_value(val, indent=0):
    """简易 YAML 序列化（只处理本项目的有限类型）"""
    prefix = '  ' * indent
    if val is None:
        return 'null'
    if isinstance(val, bool):
        return 'true' if val else 'false'
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, str):
        if any(c in val for c in ':{[]},&*?!|>"\'@#`\n') or val in ('true', 'false', 'null', 'yes', 'no', ''):
            return json.dumps(val, ensure_ascii=False)
        return val
    if isinstance(val, list):
        if not val:
            return '[]'
        if all(isinstance(v, str) and not any(c in v for c in ':{[]},&*?!|>"\'@#`\n') and v != '' for v in val):
            return '[' + ', '.join(val) + ']'
        return '\n' + '\n'.join(f'{prefix}  - {_yaml_value(v, indent+2)}' for v in val)
    if isinstance(val, dict):
        if not val:
            return '{}'
        return '\n' + '\n'.join(f'{prefix}  {k}: {_yaml_value(v, indent+1)}' for k, v in val.items())
    return str(val)


def _yaml_frontmatter(obj):
    lines = ['---']
    for k, v in obj.items():
        if v is None or (isinstance(v, list) and len(v) == 0 and k == 'prerequisites'):
            continue
        lines.append(f'{k}: {_yaml_value(v)}')
    lines.append('---')
    return '\n'.join(lines) + '\n'


def export_obsidian(data):
    """生成 Obsidian Vault 目录"""
    areas = data['areas']
    directions = data['directions']
    topics = data['topics']
    topics_full = data.get('topics_full', {})
    dir_map = {d['id']: d for d in directions}
    area_map = {a['id']: a for a in areas}

    vault = os.path.join(EXPORT_DIR, 'obsidian-vault')
    os.makedirs(vault, exist_ok=True)

    # .obsidian 配置
    obs = os.path.join(vault, '.obsidian')
    os.makedirs(obs, exist_ok=True)
    with open(os.path.join(obs, 'app.json'), 'w') as f:
        json.dump({"showInlineTitle": False, "newFileLocation": "folder",
                    "newFileFolderPath": "03-主题", "attachmentFolderPath": "assets"}, f, indent=2, ensure_ascii=False)
    with open(os.path.join(obs, 'appearance.json'), 'w') as f:
        json.dump({"cssTheme": "Things", "theme": "obsidian",
                    "accentColor": "#58A6FF", "baseFontSize": 16}, f, indent=2, ensure_ascii=False)
    with open(os.path.join(obs, 'graph.json'), 'w') as f:
        json.dump({"collapse-filter": False, "showTags": True, "showAttachments": False,
                    "showOrphans": True, "showArrow": True, "centerStrength": 0.5,
                    "repelStrength": 10, "linkStrength": 1, "linkDistance": 250, "scale": 1}, f, indent=2)

    # 领域
    area_dir = os.path.join(vault, '01-领域')
    os.makedirs(area_dir, exist_ok=True)
    for a in areas:
        aid = a['id']
        at = [t for t in topics if t.get('area') == aid]
        body = (a.get('body', '') or a.get('description', '')).strip()
        fm = _yaml_frontmatter({
            'id': aid, 'name': a.get('name'), 'name_en': a.get('name_en'),
            'type': 'area', 'color': a.get('color'), 'icon': a.get('icon'),
            'direction_count': a.get('direction_count', 0),
            'topic_count': len(at),
        })
        with open(os.path.join(area_dir, f'{aid}.md'), 'w', encoding='utf-8') as f:
            f.write(fm + '\n# {}\n\n{}\n'.format(a.get('name'), body))

    # 方向
    dir_dir = os.path.join(vault, '02-方向')
    os.makedirs(dir_dir, exist_ok=True)
    for d in directions:
        did = d['id']
        dt = [t for t in topics if t.get('direction') == did]
        body = (d.get('body', '') or d.get('description', '')).strip()
        area = area_map.get(d.get('area', ''), {})
        area_link = f'[[../01-领域/{d.get("area")}|{area.get("name", "")}]]' if area else ''
        fm = _yaml_frontmatter({
            'id': did, 'name': d.get('name'), 'name_en': d.get('name_en'),
            'type': 'direction', 'area': area_link, 'topic_count': len(dt),
        })
        topic_list = '\n'.join(
            f'- [[../03-主题/{t["id"]}|{t["name"]}]]' for t in dt
        )
        with open(os.path.join(dir_dir, f'{did}.md'), 'w', encoding='utf-8') as f:
            f.write(fm + f'\n# {d.get("name")}\n\n{body}\n\n## 包含主题\n\n{topic_list}\n')

    # 主题
    topic_dir = os.path.join(vault, '03-主题')
    os.makedirs(topic_dir, exist_ok=True)
    for t in topics:
        tid = t['id']
        tfull = topics_full.get(tid, {})
        body = (tfull.get('body', '') or t.get('description', '')).strip()
        prereqs = t.get('prerequisites', [])
        prereq_links = []
        for pid in prereqs:
            pt = topics_full.get(pid, {})
            prereq_links.append(f'[[{pid}|{pt.get("name", pid)}]]')

        # 同方向兄弟节点
        siblings = [st for st in topics if st.get('direction') == t.get('direction') and st['id'] != tid]
        sibling_links = [f'[[{st["id"]}|{st["name"]}]]' for st in siblings[:10]]

        fm = _yaml_frontmatter({
            'id': tid, 'name': t.get('name'), 'name_en': t.get('name_en'),
            'area': t.get('area'), 'direction': t.get('direction'),
            'difficulty': t.get('difficulty', 3), 'importance': t.get('importance', 3),
            'tags': t.get('tags', []),
            **({'prerequisites': prereq_links} if prereq_links else {}),
        })

        meta_block = (
            f'\n\n---\n\n'
            f'**难度**: {"★" * (t.get("difficulty", 3))}　'
            f'**重要性**: {"★" * (t.get("importance", 3))}'
        )
        if prereq_links:
            meta_block += f'\n**前置知识**: {" · ".join(prereq_links)}'
        if sibling_links:
            meta_block += f'\n**同方向主题**: {" · ".join(sibling_links)}'
            if len(siblings) > 10:
                meta_block += f' …（共 {len(siblings)} 个）'
        meta_block += '\n---\n'

        with open(os.path.join(topic_dir, f'{tid}.md'), 'w', encoding='utf-8') as f:
            f.write(fm + f'\n# {t.get("name")}\n\n{body}{meta_block}\n')

    # Home
    lines = ['# AI 知识图谱', '', '> 涵盖 5 大领域 · 15 个方向 · 74 个核心主题', '']
    for a in areas:
        aid = a['id']
        at = [t for t in topics if t.get('area') == aid]
        lines.append(f'## {a.get("icon", "")} {a.get("name")} （{len(at)} 个主题）')
        if a.get('description'):
            lines.append(f'\n{a.get("description")}\n')
        for d in [x for x in directions if x.get('area') == aid]:
            dt = [t for t in at if t.get('direction') == d['id']]
            lines.append(f'- **{d.get("name")}** （{len(dt)}）')
            for topic in dt:
                lines.append(f'  - [[03-主题/{topic["id"]}|{topic["name"]}]]')
        lines.append('')
    with open(os.path.join(vault, '🏠 AI知识总览.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    print(f"✓ Obsidian Vault → {vault}")
    return vault


def export_anki_csv(data):
    """生成 Anki 可导入的 CSV 文件"""
    quizzes = data['quizzes']
    topics = data['topics']
    csv_path = os.path.join(EXPORT_DIR, 'anki-deck.csv')
    os.makedirs(EXPORT_DIR, exist_ok=True)

    rows = []
    for t in topics:
        tid = t['id']
        qs = quizzes.get(tid, [])
        for q in qs:
            front = q.get('question', '')
            options_html = '<br>'.join(
                f"{o.get('letter', '')}. {o.get('text', '')}" for o in q.get('options', [])
            )
            correct_idx = q.get('correct_index', -1)
            correct_letter = q['options'][correct_idx].get('letter', '?') if 0 <= correct_idx < len(q.get('options', [])) else '?'
            back = f'答案: {correct_letter}<br>{options_html}<br><br>{q.get("explanation", "")}'
            tags = f'{t.get("area", "")} {t.get("direction", "")} {" ".join(t.get("tags", []))}'

            def csv_escape(s):
                return '"' + s.replace('"', '""') + '"'
            rows.append(f'{csv_escape(front)};{csv_escape(back)};{csv_escape(tags)}')

    with open(csv_path, 'w', encoding='utf-8-sig') as f:
        f.write('# Front;Back;Tags\n')
        f.write('\n'.join(rows) + '\n')

    card_count = len(rows)
    print(f"✓ Anki CSV ({card_count} 张卡片) → {csv_path}")
    return csv_path


def export_markdown(data):
    """生成纯 Markdown 文件目录（不含 Obsidian 特性）"""
    areas = data['areas']
    directions = data['directions']
    topics = data['topics']
    topics_full = data.get('topics_full', {})

    out = os.path.join(EXPORT_DIR, 'markdown')
    os.makedirs(out, exist_ok=True)

    for folder, items, label in [
        ('areas', areas, '领域'),
        ('directions', directions, '方向'),
        ('topics', [t for t in topics], '主题'),
    ]:
        d = os.path.join(out, folder)
        os.makedirs(d, exist_ok=True)
        for item in items:
            iid = item.get('id')
            name = item.get('name')
            body = ''
            if folder == 'topics':
                tfull = topics_full.get(iid, {})
                body = (tfull.get('body', '') or item.get('description', '')).strip()
            else:
                body = (item.get('body', '') or item.get('description', '')).strip()

            content = f'# {name}\n\n{body}\n'
            if folder == 'topics':
                prereqs = item.get('prerequisites', [])
                if prereqs:
                    prereq_names = [topics_full.get(pid, {}).get('name', pid) for pid in prereqs]
                    content += f'\n**前置知识**: {" → ".join(prereq_names)}\n'
                content += f'\n**难度**: {"★" * item.get("difficulty", 3)}　**重要性**: {"★" * item.get("importance", 3)}\n'

            with open(os.path.join(d, f'{iid}.md'), 'w', encoding='utf-8') as f:
                f.write(content)

    # README
    readme = ['# AI 知识图谱', '', '5 大领域 · 15 个方向 · 74 个核心主题', '']
    for a in areas:
        readme.append(f'## {a.get("name")}')
        for d in [x for x in directions if x.get('area') == a['id']]:
            readme.append(f'- {d.get("name")}')
    with open(os.path.join(out, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(readme) + '\n')

    print(f"✓ Markdown → {out}")
    return out


EXPORTERS = {
    'obsidian': export_obsidian,
    'anki': lambda d: export_anki_csv(d),
    'markdown': export_markdown,
}


def run_export(data, target):
    if target == 'all':
        for name, fn in EXPORTERS.items():
            fn(data)
    elif target in EXPORTERS:
        EXPORTERS[target](data)
    else:
        print(f"未知导出目标: {target}，可选: {', '.join(EXPORTERS.keys())}, all")
        return
    print(f"\n导出文件在 {os.path.relpath(EXPORT_DIR, ROOT)}/")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='编译 vault/ 内容为静态数据文件')
    parser.add_argument('--export', '-e', nargs='*',
                        choices=['obsidian', 'anki', 'markdown', 'all'],
                        help='额外导出: obsidian, anki, markdown, all')
    args = parser.parse_args()

    d = build()
    if args.export:
        print()
        targets = args.export if args.export else ['all']
        for t in targets:
            run_export(d, t)
