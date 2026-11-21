import io
import unicodedata
from xml.sax.saxutils import escape

class Box(object):
    size = 1

name = "size"
prefix = "he"
open("py2.py", "rb").close()  # promote: "py2.py" = str>unicode | "rb" = str>unicode
getattr(Box(), name)  # promote: name = str>unicode
reveal_type(u"hello".startswith(prefix))  # type: bool; promote: prefix = str>unicode
reveal_type(u"hello".startswith(("h", u"x")))  # type: bool; promote: ("h", u"x") = str>unicode
reveal_type(unicodedata.normalize("NFC", u"x"))  # type: unicode; promote: "NFC" = str>unicode

open(u"py2.py", u"rb").close()
getattr(Box(), u"size")
u"hello".startswith(1)  # reject: __prefix
getattr(Box(), 1)  # reject: name
unicodedata.normalize(u"NFC", "x")  # runtime-reject: TypeError; promote: "x" = str>unicode
io.StringIO("x")  # runtime-reject: TypeError; promote: "x" = str>unicode
io.StringIO().write("x")  # runtime-reject: TypeError; promote: "x" = str>unicode

reveal_type("abc".lstrip("a"))  # type: str
reveal_type("abc".lstrip(u"a"))  # type: unicode
reveal_type("abc".partition("b"))  # type: tuple[str, str, str]
reveal_type("abc".partition(u"b"))  # type: tuple[unicode, unicode, unicode]
reveal_type("x".decode("ascii"))  # type: unicode; promote: "ascii" = str>unicode
reveal_type(u"x".encode(u"ascii"))  # type: str

def takes_unicode(value):
    # type: (unicode) -> None
    pass

def takes_str(value):
    # type: (str) -> None
    pass

takes_unicode(u"text")
takes_str("bytes")
takes_unicode("bytes")  # promote: "bytes" = str>unicode
takes_str(u"text")  # static-reject: value

reveal_type(escape("x"))  # type: str; promote: "x" = str>unicode; gap-type: unicode
reveal_type(escape(u"x"))  # type: unicode

# Python 2 byte strings, mutable bytes, and views
raw = bytes("abc")
mutable = bytearray(raw)
mutable.append(65)
view = memoryview(mutable)
legacy = buffer(raw)
assert bytes is str
reveal_type(raw.lower())  # type: str
reveal_type(raw[0])  # type: str
reveal_type(mutable[0])  # type: int
reveal_type(mutable[:1])  # type: bytearray
reveal_type(mutable.decode())  # type: unicode; gap-type: str
reveal_type(view[0])  # type: str
reveal_type(view[:1])  # type: memoryview
reveal_type(view.tobytes())  # type: str
reveal_type(legacy[0])  # type: str
reveal_type(legacy[:1])  # type: str
assert isinstance(raw, basestring) and isinstance(u"x", basestring)
assert not isinstance(mutable, basestring)
assert not isinstance(view, basestring)
assert not isinstance(legacy, basestring)

def takes_string(value):
    # type: (basestring) -> None
    pass

takes_string(raw)
takes_string(u"x")
takes_string(mutable)  # static-reject: value
takes_string(view)  # static-reject: value
takes_string(legacy)  # static-reject: value
takes_str(mutable)  # promote: mutable = bytearray>str
takes_unicode(raw)  # promote: raw = str>unicode

# Type comments only need these names during static analysis.
try:
    from typing import AnyStr, ByteString, Text
except ImportError:
    pass

def takes_binary_sequence(value):
    # type: (ByteString) -> None
    pass

def takes_text(value):
    # type: (Text) -> None
    pass

def same_string(value):
    # type: (AnyStr) -> AnyStr
    return value

takes_binary_sequence(mutable)
takes_binary_sequence(u"x")  # static-reject: value
takes_text(u"x")
takes_text(raw)  # promote: raw = str>unicode
reveal_type(same_string(raw))  # type: str
reveal_type(same_string(u"x"))  # type: unicode
# The Python 2 typing backport registers str and bytearray with ByteString.
takes_binary_sequence(raw)  # gap: value
takes_binary_sequence(view)  # static-reject: value
takes_binary_sequence(legacy)  # static-reject: value
takes_str(b"bytes")
takes_unicode(b"bytes")  # promote: b"bytes" = str>unicode
reveal_type(bytearray(u"\u00e9", u"utf-8").decode(u"utf-8"))  # type: unicode; gap-type: str

takes_str(view)  # promote: view = memoryview>str
takes_unicode(view)  # promote: view = memoryview>str>unicode
takes_unicode(mutable)  # promote: mutable = bytearray>str>unicode
takes_str(legacy)  # static-reject: value
takes_unicode(legacy)  # static-reject: value

def mixed(text, number):
    # type: (unicode, int) -> None
    pass

mixed(raw, "bad")  # promote: raw = str>unicode; static-reject: number

wide = u""  # type: unicode
wide = raw  # promote: raw = str>unicode
reveal_type(raw)  # type: str
wide = mutable  # promote: mutable = bytearray>str>unicode
wide = view  # promote: view = memoryview>str>unicode
narrow = ""  # type: str
narrow = mutable  # promote: mutable = bytearray>str
narrow = view  # promote: view = memoryview>str
narrow = u"wide"  # assignment-error: u"wide"

def check_abstract(value, binary):
    # type: (basestring, ByteString) -> None
    takes_unicode(value)  # static-reject: value
    takes_str(value)  # static-reject: value
    takes_unicode(binary)  # static-reject: value
    takes_str(binary)  # static-reject: value

io.StringIO().write(escape("x"))  # runtime-reject: TypeError; promote: "x" = str>unicode

def takes_bytes(value):
    # type: (bytes) -> None
    pass

takes_bytes("abc")
takes_bytes(b"abc")
takes_bytes(u"abc")  # static-reject: value
