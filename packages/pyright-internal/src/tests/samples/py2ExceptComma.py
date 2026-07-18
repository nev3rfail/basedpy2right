# Python 2 except-comma binding. Under a 2.7 target this must parse cleanly
# and bind `e` as the caught exception (usable in the body).
try:
    pass
except ValueError, e:
    x = e
