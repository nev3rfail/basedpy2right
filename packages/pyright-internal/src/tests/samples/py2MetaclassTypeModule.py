# FIX 2 (module-level form): a module-level `__metaclass__ = type` makes every
# base-less class in the module NEW-style at the Python 2.7 runtime. The diamond
# below therefore linearizes with C3: MRO [D, B, C, A, object] -> C wins ->
# D().x is str. Confirmed at runtime.
__metaclass__ = type


class A:
    x = 1


class B(A):
    pass


class C(A):
    x = "c"


class D(B, C):
    pass


reveal_type(D().x)  # str (C3, because the module __metaclass__ = type makes A new-style)
