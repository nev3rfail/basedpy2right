# Under a py2 target, the version_info[0] == 2 branch is LIVE and the else
# branch is statically DEAD, so the type error in the else branch is pruned.
import sys

if sys.version_info[0] == 2:
    ok = 1
else:
    bad = 1  # type: str
    bad = 123  # would be an error only if this branch were live
