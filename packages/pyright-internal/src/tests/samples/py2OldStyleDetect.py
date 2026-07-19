# Old-style detection cases, analyzed under a 2.7 target. Each case is a diamond
# whose attribute winner reveals whether classic-DFS (old-style) or C3 (new-style)
# was used. All expectations confirmed against the Python 2.7 runtime.

# Case 1: 3-level old-style chain (A -> B -> B2, A -> C -> C2). Verifies the
# Py2OldStyle flag propagates down a chain: bases are flagged before the derived
# class reads them. Classic DFS -> A before C -> A.x wins (int).
class A:
    x = 1


class B(A):
    pass


class B2(B):
    pass


class C(A):
    x = "c"


class C2(C):
    pass


class D(B2, C2):
    pass


reveal_type(D().x)      # int (classic DFS through a 3-level chain)


# Case 2: a builtin base (dict) is new-style, so the whole hierarchy is new-style
# -> C3 -> Cd before Ad -> Cd.x wins (str).
class Ad(dict):
    x = 1


class Bd(Ad):
    pass


class Cd(Ad):
    x = "c"


class Dd(Bd, Cd):
    pass


reveal_type(Dd().x)     # str (C3, because dict is new-style)


# Case 3: a new-style mixin on one leg makes the class new-style -> C3 -> str.
class NewMix(object):
    pass


class Am:
    x = 1


class Bm(Am):
    pass


class Cm(Am, NewMix):
    x = "c"


class Dm(Bm, Cm):
    pass


reveal_type(Dm().x)     # str (C3, because Cm has a new-style base)
