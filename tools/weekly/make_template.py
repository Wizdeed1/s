"""The Weekly Commercial Presentation's design, kept in the tool without its numbers.

    python3 -I tools/weekly/make_template.py <the deck sent last week.pptx>   ->   wk/deck-template.pptx

Takes a Member Care Performance Review deck as the WFM team sends it and keeps its design only: every slide, picture, chart
style and table style stays; the week's numbers, names of reasons and complaints, outages and dates are emptied (two empty
rows are kept in each table, so the tool knows how a row looks), and every chart's link to a workbook on someone's computer
(a C:\\Users\\... path) is removed, with its cached points. The tool fills the template again each week (js/weekly_core.js)."""
import re, sys, zipfile

src, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'wk/deck-template.pptx')
zin = zipfile.ZipFile(src)
KEEP_TABLE_ROWS = 2


def blank_runs(x):
    """every run's text emptied, the runs themselves (their look) kept"""
    return re.sub(r'(<a:t>)[^<]*(</a:t>)', r'\1\2', x)


def shape(xml, name):
    """the <p:sp> or <p:graphicFrame> whose cNvPr has this name: (start, end) or None"""
    m = re.search(r'<p:cNvPr id="\d+" name="%s"' % re.escape(name), xml)
    if not m:
        return None
    s = max(xml.rfind('<p:sp>', 0, m.start()), xml.rfind('<p:graphicFrame>', 0, m.start()), xml.rfind('<p:sp ', 0, m.start()))
    tag = 'p:graphicFrame' if xml.startswith('<p:graphicFrame', s) else 'p:sp'
    e = xml.find('</%s>' % tag, m.end()) + len('</%s>' % tag)
    return s, e


def edit(xml, name, fn):
    r = shape(xml, name)
    assert r, name
    return xml[:r[0]] + fn(xml[r[0]:r[1]]) + xml[r[1]:]


def table_keep_two(x):
    rows = re.findall(r'<a:tr [^>]*>.*?</a:tr>', x, flags=re.S)
    head, data = rows[0], rows[1:1 + KEEP_TABLE_ROWS]
    a = x.find(rows[0]); b = x.find('</a:tbl>')
    return x[:a] + head + ''.join(blank_runs(r) for r in data) + x[b:]


VALUE_SHAPES = {   # per slide: the text boxes whose text is the week's
    1: ['Text 10'],
    2: ['Text 0', 'Text 4', 'Text 5', 'Text 9', 'Text 13', 'Text 17'],
    3: ['Text 0', 'Text 4', 'Text 5', 'Text 9', 'Text 13', 'Text 17'],
    4: ['Text 0', 'Text 4', 'Text 5', 'Text 9', 'Text 13', 'Text 17', 'Text 18'],
    5: ['Text 0', 'Text 4', 'Text 5'],
    6: ['Text 0', 'Text 2', 'Text 4'],
}
TABLES = {2: ['Table 0', 'Table 1'], 3: ['Table 0', 'Table 1'], 4: ['Table 0', 'Table 1'], 5: ['Table 0', 'Table 1'], 6: ['Table 7']}

files = {}
for info in zin.infolist():
    name, data = info.filename, zin.read(info.filename)
    m = re.match(r'ppt/slides/slide(\d+)\.xml$', name)
    if m:
        n, x = int(m.group(1)), data.decode('utf-8')
        for s in VALUE_SHAPES.get(n, []):
            x = edit(x, s, blank_runs)
        for t in TABLES.get(n, []):
            x = edit(x, t, table_keep_two)
        data = x.encode('utf-8')
    elif re.match(r'ppt/charts/chart\d+\.xml$', name):
        x = data.decode('utf-8')
        x = re.sub(r'<c:externalData r:id="[^"]*">.*?</c:externalData>', '', x, flags=re.S)
        x = re.sub(r'<c:externalData r:id="[^"]*"/>', '', x)
        # every cached point of the categories and values goes; the series names (Calls Presented ...) stay
        x = re.sub(r'(<c:(?:cat|val)>.*?</c:(?:cat|val)>)', lambda mm: re.sub(r'<c:ptCount val="\d+"/>(?:<c:pt idx="\d+"[^>]*><c:v>[^<]*</c:v></c:pt>)*', '<c:ptCount val="0"/>', mm.group(1)), x, flags=re.S)
        data = x.encode('utf-8')
    elif re.match(r'ppt/charts/_rels/chart\d+\.xml\.rels$', name):
        x = data.decode('utf-8')
        x = re.sub(r'<Relationship [^>]*TargetMode="External"[^>]*/>', '', x)
        data = x.encode('utf-8')
    elif name == 'docProps/core.xml':
        x = data.decode('utf-8')
        x = re.sub(r'<dc:title>[^<]*</dc:title>', '<dc:title>Member Care Performance Review</dc:title>', x)
        x = re.sub(r'<dc:subject>[^<]*</dc:subject>', '<dc:subject>Weekly Commercial Presentation</dc:subject>', x)
        x = re.sub(r'<dc:creator>[^<]*</dc:creator>', '<dc:creator>MC Monthly Report Builder</dc:creator>', x)
        x = re.sub(r'<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>', '<cp:lastModifiedBy>MC Monthly Report Builder</cp:lastModifiedBy>', x)
        data = x.encode('utf-8')
    elif name == 'docProps/app.xml':
        x = data.decode('utf-8')
        x = re.sub(r'<Company>[^<]*</Company>', '<Company>Beyond One</Company>', x)
        x = re.sub(r'<TotalTime>\d+</TotalTime>', '<TotalTime>0</TotalTime>', x)
        data = x.encode('utf-8')
    files[name] = (info, data)

for name, (info, data) in files.items():
    text = data.decode('utf-8', 'ignore') if name.endswith(('.xml', '.rels')) else ''
    assert 'C:\\Users' not in text and 'Banjar' not in text, ('a path or a name is left in', name)

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in [i.filename for i in zin.infolist()]:
        info, data = files[name]
        zi = zipfile.ZipInfo(name, date_time=(2026, 10, 25, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, data)
sys.stderr.write('%s: %d parts, %d KB\n' % (out, len(files), sum(len(d) for _, d in files.values()) // 1024))
