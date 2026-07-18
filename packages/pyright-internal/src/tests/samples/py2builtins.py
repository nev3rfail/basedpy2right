# Python 2 builtins that do NOT exist in Python 3. Under a py2 target with the
# py2 typeshed, these must resolve with no error.
x = xrange(5)
u = unicode("hi")
b = basestring
