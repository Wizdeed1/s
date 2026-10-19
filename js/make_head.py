"""The page's head: the title, light or dark before the first paint, the start guard (plain old JavaScript), the embedded
typeface and the interface (ui6/*.css).
Writes ui3_head.html, which the assemble scripts put at the top of the page."""
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
css = [open(os.path.join(here, 'fonts.css'), encoding='utf-8').read()]
for f in sorted(glob.glob(os.path.join(here, 'ui6', '*.css'))):
    css.append(open(f, encoding='utf-8').read())
boot = open(os.path.join(here, 'head_boot.html'), encoding='utf-8').read()
theme = open(os.path.join(here, 'theme_boot.html'), encoding='utf-8').read()   # light or dark before the first paint
out = ('<title>MC Monthly Report Builder</title>\n'
       '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2f7">\n'
       '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0c">\n'
       '<meta name="color-scheme" content="light dark">\n'
       + theme.rstrip('\n') + '\n' + boot.rstrip('\n') + '\n<style>\n' + '\n'.join(css) + '</style>\n')
assert '</style' not in ''.join(css).lower()
open(os.path.join(here, 'ui3_head.html'), 'w', encoding='utf-8').write(out)
