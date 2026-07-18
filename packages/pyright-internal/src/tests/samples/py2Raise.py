# Python 2 raise forms. All must parse with no error under 2.7.
import sys
raise ValueError, "boom"
raise ValueError, "boom", sys.exc_info()[2]
