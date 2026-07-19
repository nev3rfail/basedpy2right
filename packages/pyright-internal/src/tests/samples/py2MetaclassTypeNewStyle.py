# FIX 2: a class-body `__metaclass__ = type` makes the class NEW-style at the
# Python 2.7 runtime (`isinstance(A, type)` is True), even without an explicit
# `object` base. So the diamond below linearizes with C3, not classic DFS:
# MRO [D, B, C, A, object] -> C wins -> D().x is str. Confirmed at runtime.
class A:
    __metaclass__ = type
    x = 1


class B(A):
    pass


class C(A):
    x = "c"


class D(B, C):
    pass


reveal_type(D().x)  # str (C3, because A is new-style via __metaclass__ = type)
