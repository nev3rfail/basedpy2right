# Python 2 string-literal typing (ground truth: mypy v0.971 --py2).
#   u'...'            -> unicode (distinct builtin)
#   '...' / b'...'    -> str     (py2 bytes is aliased to str)
#   implicit concat   -> unicode if ANY adjacent piece is unicode
# reveal_type(type(x)) widens the literal so the builtin class is visible: the
# literal printer renders a unicode literal identically to a str one.
reveal_type(type(u'x'))         # type[unicode]
reveal_type(type('x'))          # type[str]
reveal_type(type(b'x'))         # type[str]   (py2 bytes == str)
reveal_type(type('a' 'b'))      # type[str]
reveal_type(type('a' u'b'))     # type[unicode]   (mixed concat promotes)
reveal_type(type(u'a' 'b'))     # type[unicode]   (promotion is order-independent)
reveal_type(type(b'x' u'y'))    # type[unicode]   (bytes+unicode promotes; mixing legal in py2)
