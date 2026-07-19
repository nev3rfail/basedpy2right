# FIX 1 (R2 MEDIUM): with object restored to the MRO tail, object.__init__ /
# object.__new__ are reachable, so an old-style class that defines no __init__
# rejects extra constructor arguments -- matching the Python 2.7 runtime
# `TypeError: this constructor takes no arguments`.
class A:
    pass


A()  # ok: zero arguments
A(1, 2, 3)  # error: object.__init__ takes no positional arguments
