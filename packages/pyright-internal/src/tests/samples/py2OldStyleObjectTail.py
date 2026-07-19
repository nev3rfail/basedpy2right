# FIX 1 acceptance: an old-style instance is "new-style-like" for member and
# operator resolution (object sits at the MRO tail), while classic ordering is
# kept among the real bases. `==`/`!=` and `.__dict__`/`.__class__` resolve via
# object (restored to the MRO tail) and succeed at the Python 2.7 runtime.
#
# NOTE: the ordering operators `<`/`>`/`<=`/`>=` are intentionally NOT covered
# here -- Python 2's default total ordering for objects is a separate,
# pre-existing concern (it affects new-style py2 classes identically and
# overlaps the dropped D3 disparate-comparison decision), out of MRO scope.
class A:
    pass


a = A()
b = A()

reveal_type(a == b)  # bool (object.__eq__)
reveal_type(a != b)  # bool (object.__ne__)
reveal_type(a.__dict__)  # dict[str, Any] (object.__dict__)
reveal_type(a.__class__)  # type[A] (object.__class__)
