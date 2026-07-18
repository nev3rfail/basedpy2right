# from __future__ import division forces true division even under a 2.7 target.
from __future__ import division
c = 5 / 2
reveal_type(c)      # float (true division honored)
