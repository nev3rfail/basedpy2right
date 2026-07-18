# Python 2 __metaclass__ idiom. Under 2.7, MyMeta must be C's metaclass, so
# MyMeta's attributes are accessible on the class C itself.
class MyMeta(type):
    flavor = "vanilla"

class C(object):
    __metaclass__ = MyMeta

reveal_type(C.flavor)  # str iff MyMeta is C's metaclass; error otherwise
