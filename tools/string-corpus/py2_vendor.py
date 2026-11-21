from typing import List, Tuple, Union
from vendor_text import classify, consume_list, double, either, measure, require_class, require_literal, same, select, write

raw = str("abc")
write(raw)  # promote: raw = str>unicode
either(raw)
reveal_type(classify(raw))  # type: str
reveal_type(classify(u"abc"))  # type: unicode

def check_invariance(values):
    # type: (List[str]) -> None
    consume_list(values)  # static-reject: values


def check_expanded(value):
    # type: (Union[int, str]) -> None
    reveal_type(select(value))  # type: int | unicode; promote: value = str>unicode


require_literal("wide")  # static-reject: value
require_literal(u"wide")
require_literal("wrong")  # static-reject: value
require_class(str)  # static-reject: value
require_class(unicode)

def check_anystr(raw, wide):
    # type: (str, unicode) -> None
    reveal_type(same(raw, wide))  # type: unicode; promote: raw = str>unicode
    reveal_type(same(wide, raw))  # type: unicode; promote: raw = str>unicode

def check_anystr_binary(arr1, arr2, view1, view2):
    # type: (bytearray, bytearray, memoryview, memoryview) -> None
    reveal_type(same(arr1, arr2))  # type: str; promote: arr1 = bytearray>str | arr2 = bytearray>str
    reveal_type(same(view1, view2))  # type: str; promote: view1 = memoryview>str | view2 = memoryview>str

def returns_text(value):
    # type: (str) -> unicode
    return value  # promote: value = str>unicode

def default_text(value="default"):  # promote: "default" = str>unicode
    # type: (unicode) -> None
    pass

class Holder(object):
    text = u""  # type: unicode

def assign_field(holder, raw):
    # type: (Holder, str) -> None
    holder.text = raw  # promote: raw = str>unicode

def classify_mixed(value):
    # type: (Union[str, unicode]) -> None
    reveal_type(classify(value))  # type: str | unicode


def measure_mixed(value):
    # type: (Union[bytearray, str]) -> None
    reveal_type(measure(value))  # type: int | unicode; promote: value = str>unicode


def select_binary(value):
    # type: (Union[int, bytearray, memoryview]) -> None
    reveal_type(select(value))  # type: int | unicode; promote: value = bytearray>str>unicode, memoryview>str>unicode


def unpack(values):
    # type: (Tuple[bytearray, memoryview]) -> None
    double(*values)  # promote: values = bytearray>str>unicode, memoryview>str>unicode
