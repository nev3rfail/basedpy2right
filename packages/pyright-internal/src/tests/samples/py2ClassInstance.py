# Under a 2.7 target, instantiating a user class must yield the class instance
# type (not Any), so attributes/methods resolve. Regression guard for the
# object.__new__ -> Self typeshed fix.
class Widget(object):
    name = "w"

    def label(self):
        # type: () -> str
        return self.name

w = Widget()
reveal_type(w)          # Widget
reveal_type(w.name)     # str
reveal_type(w.label())  # str
