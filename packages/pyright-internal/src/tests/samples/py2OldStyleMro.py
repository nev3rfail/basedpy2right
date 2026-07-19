# Old-style diamond. Ground truth: the Python 2.7 runtime (Python27/python.exe),
# NOT mypy (mypy v0.971 --py2 wrongly uses C3 here; documented divergence D4).
#   old-style (class A:) -> classic DFS MRO [D, B, A, C] -> A.x / A.who win (int)
#   new-style / py3      -> C3 MRO         [D, B, C, A] -> C.x / C.who win (str)
class A:
    x = 1

    def who(self):
        return 1


class B(A):
    pass


class C(A):
    x = "c"

    def who(self):  # type: ignore  # incompatible override is intentional (MRO discriminator)
        return "c"


class D(B, C):  # type: ignore  # classic MRO sees who() from A and C as an incompatible pair
    pass


d = D()
reveal_type(d)          # D (old-style classes still construct)
reveal_type(d.x)        # 2.7: int (classic); py3: str (C3)
reveal_type(d.who())    # 2.7: int (classic); py3: str (C3)
