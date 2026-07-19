# Under a py3 target the u'' prefix is a legacy no-op: u'x' is str (unchanged),
# and b'x' remains the distinct bytes type. The py2 unicode path must not leak.
reveal_type(type(u'x'))         # type[str]
reveal_type(type('x'))          # type[str]
reveal_type(type(b'x'))         # type[bytes]
