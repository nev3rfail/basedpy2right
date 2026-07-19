# New-style variant of the diamond, analyzed under a 2.7 target. An explicit
# `object` base makes every class new-style, so C3 applies even under 2.7:
# MRO [D, B, C, A, object] -> C.x / C.who win (str). Confirmed at runtime.
class A(object):
    x = 1

    def who(self):
        return 1


class B(A):
    pass


class C(A):
    x = "c"

    def who(self):  # type: ignore  # incompatible override is intentional (MRO discriminator)
        return "c"


class D(B, C):
    pass


d = D()
reveal_type(d.x)        # str (C3, unchanged even under 2.7)
reveal_type(d.who())    # str (C3, unchanged even under 2.7)
