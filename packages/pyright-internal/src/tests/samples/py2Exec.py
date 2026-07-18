# Python 2 exec statement forms. All must parse with no error under 2.7.
g = {}
l = {}
exec "x = 1"
exec "x = 1" in g
exec "x = 1" in g, l
