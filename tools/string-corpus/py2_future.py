from __future__ import unicode_literals

reveal_type("abc".upper())  # type: unicode; gap-type: str
reveal_type(b"abc".upper())  # type: str
reveal_type(r"abc".upper())  # type: unicode; gap-type: str
reveal_type("abc".encode("ascii"))  # type: str; gap-promotion: "ascii" = str>unicode
reveal_type(b"abc".decode("ascii"))  # type: unicode; gap-promotion: "ascii" = str>unicode
