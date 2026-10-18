"""Dependency-free static checks for the built GitHub Pages project site.
Run `python3 tools/build-pages.py` first. These checks do not launch a browser.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
ORIGIN = 'https://example.invalid'


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links = []
        self.ids = []
        self.has_title = False
        self.has_viewport = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        self.has_title |= tag == 'title'
        self.has_viewport |= tag == 'meta' and data.get('name') == 'viewport'
        if 'id' in data:
            self.ids.append(data['id'])
        for attr in ('href', 'src', 'poster'):
            if data.get(attr):
                self.links.append((tag, data[attr]))


class PagesTests(unittest.TestCase):
    def resolve_local(self, file, ref, prefix):
        parts = urlsplit(ref)
        if parts.scheme or parts.netloc:
            self.assertEqual(parts.scheme, 'https', (file, ref))
            return None
        self.assertFalse(ref.startswith('/'), f'Root-relative URL breaks project Pages: {file}: {ref}')
        resolved = urlsplit(urljoin(ORIGIN + prefix + file, ref))
        self.assertTrue(resolved.path.startswith(prefix), (file, ref, prefix))
        local = SITE / unquote(resolved.path[len(prefix):])
        if local.is_dir():
            local = local / 'index.html'
        self.assertTrue(local.is_file(), f'Missing local target: {file}: {ref} -> {local}')
        self.assertTrue(local.resolve().is_relative_to(SITE.resolve()))
        if resolved.fragment and local.suffix == '.html':
            target = Document(local.read_text())
            self.assertIn(unquote(resolved.fragment), target.ids, (file, ref))
        return local

    def test_landing_page_and_accessibility_basics(self):
        doc = Document((SITE / 'index.html').read_text())
        self.assertTrue(doc.has_title)
        self.assertTrue(doc.has_viewport)
        self.assertIn('main', doc.ids)
        self.assertIn('assets', doc.ids)
        self.assertIn('docs', doc.ids)
        self.assertEqual(len(doc.ids), len(set(doc.ids)))
        self.assertEqual((SITE / 'index.html').read_text().count('class="state-card"'), 9)

    def test_html_links_at_root_and_project_prefix(self):
        checks = 0
        for html in SITE.rglob('*.html'):
            relative = html.relative_to(SITE).as_posix()
            doc = Document(html.read_text())
            for tag, ref in doc.links:
                for prefix in ('/', '/geeky-animation/'):
                    target = self.resolve_local(relative, ref, prefix)
                    if tag in ('script', 'img', 'link'):
                        self.assertIsNotNone(target, f'External runtime dependency: {relative}: {ref}')
                    checks += 1
        print(f'Checked {checks} HTML URL resolutions across root and project paths.')

    def test_css_and_module_references(self):
        for file in SITE.rglob('*'):
            if not file.is_file() or file.suffix not in ('.css', '.js', '.mjs'):
                continue
            text = file.read_text()
            refs = re.findall(r'''url\(\s*["']?([^\s)"']+)''', text) if file.suffix == '.css' else []
            refs += re.findall(r'''(?:import|export)\s+[^;\n]*?from\s*["']([^"']+)''', text)
            for ref in refs:
                if not ref.startswith('.') and file.suffix != '.css':
                    # React examples intentionally import the host app's React package.
                    self.assertEqual(ref, 'react')
                    self.assertIn('examples/react/', file.as_posix())
                    continue
                self.resolve_local(file.relative_to(SITE).as_posix(), ref, '/geeky-animation/')

    def test_manifest_files_exist(self):
        manifest = json.loads((SITE / 'manifest.json').read_text())
        self.assertEqual(len(manifest['states']), 9)
        self.assertEqual(len(manifest['gazes']), 16)
        def check(value):
            if isinstance(value, dict):
                for item in value.values():
                    check(item)
            elif isinstance(value, list):
                for item in value:
                    check(item)
            elif isinstance(value, str) and value.startswith(('assets/', 'docs/', 'src/', 'dist/', 'previews/')):
                self.assertTrue((SITE / value).is_file(), value)
        check(manifest)

    def test_no_private_or_development_artifacts(self):
        prohibited = {'.git', '.github', '.export', '__pycache__', 'node_modules', 'tools', 'tests'}
        files = [p for p in SITE.rglob('*') if p.is_file()]
        self.assertGreater(len(files), 100)
        for file in files:
            rel = file.relative_to(SITE)
            self.assertFalse(file.is_symlink())
            self.assertFalse(prohibited.intersection(rel.parts), str(rel))
            self.assertFalse(any(part.startswith('.') for part in rel.parts), str(rel))
            self.assertNotIn(file.suffix.lower(), ('.key', '.pem', '.pyc', '.zip'))
        self.assertLess(sum(p.stat().st_size for p in files), 100_000_000)

    def test_workflow_guardrails(self):
        workflow = (ROOT / '.github/workflows/pages.yml').read_text()
        actions = re.findall(r'uses: (actions/[a-z-]+)@([0-9a-f]+)', workflow)
        self.assertEqual(len(actions), 4)
        self.assertTrue(all(len(sha) == 40 for _, sha in actions))
        for line in ('permissions: {}', 'contents: read', 'pages: write', 'id-token: write',
                     'persist-credentials: false', 'enablement: false', 'needs: build',
                     'name: github-pages', 'path: _site', "if: github.ref == 'refs/heads/main'"):
            self.assertIn(line, workflow)
        self.assertNotIn('secrets.', workflow)
        self.assertNotIn('pull_request_target', workflow)
        self.assertNotIn('write-all', workflow)


if __name__ == '__main__':
    unittest.main(verbosity=2)
