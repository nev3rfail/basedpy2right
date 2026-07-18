# Python 2 print statement forms. All must parse with no error under 2.7.
import sys
print "hello", 1
print                     # bare
print >> sys.stderr, "e"  # chevron -> file=
