import io
import unicodedata

class Box:
    size = 1

getattr(Box(), "size")
getattr(Box(), b"size")  # reject: name
reveal_type("hello".startswith("he"))  # type: bool
"hello".startswith(b"he")  # reject: prefix
reveal_type(b"hello".startswith(b"he"))  # type: bool
reveal_type("x".encode("ascii"))  # type: bytes
reveal_type(b"x".decode("ascii"))  # type: str
reveal_type(unicodedata.normalize("NFC", "x"))  # type: str
unicodedata.normalize("NFC", b"x")  # reject: unistr
io.StringIO().write(b"x")  # reject: s

from typing import AnyStr, ByteString, Text

def takes_binary_sequence(value: ByteString) -> None:
    pass

def takes_text(value: Text) -> None:
    pass

def same_string(value: AnyStr) -> AnyStr:
    return value

raw = bytes(b"abc")
mutable = bytearray(raw)
view = memoryview(mutable)
reveal_type(raw[0])  # type: int
reveal_type(raw[:1])  # type: bytes
reveal_type(mutable[0])  # type: int
reveal_type(mutable[:1])  # type: bytearray
reveal_type(mutable.decode())  # type: str
reveal_type(view[0])  # type: int
reveal_type(view.tobytes())  # type: bytes
takes_binary_sequence(raw)
takes_binary_sequence(mutable)
takes_binary_sequence("x")  # static-reject: value
# Bundled Python 3 stubs include memoryview in ByteString.
takes_binary_sequence(view)
takes_text("x")
takes_text(raw)  # static-reject: value
reveal_type(same_string(raw))  # type: bytes
reveal_type(same_string("x"))  # type: str

def takes_str(value: str) -> None:
    pass

takes_str(raw)  # static-reject: value
takes_str(mutable)  # static-reject: value
takes_str(view)  # static-reject: value
wide: str = raw  # assignment-error: raw
