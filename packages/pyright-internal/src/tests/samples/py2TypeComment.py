# type: comments must be honored under py2 (py2 has no annotation syntax).
# This should generate exactly one error (str assigned to int-annotated var).
x = "hello"  # type: int
