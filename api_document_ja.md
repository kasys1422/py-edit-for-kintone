# PyEdit for Kintone

このドキュメントは、PyEdit for Kintoneで利用される独自の関数およびクラスの仕様と使用方法について記述しています。各関数・クラスのシグネチャ、パラメータ、動作の概要、そして利用例などを以下に示します。これ以外の関数などは、pyscriptのドキュメントを参照してください。

---

## 目次

- [print() 関数](#print-関数)
- [kintone_event デコレータ](#kintone_event-デコレータ)
- [handle_promise クラス](#handle_promise-クラス)
- [kintone_api クラス](#kintone_api-クラス)
- [kintone_record クラス](#kintone_record-クラス)
- [on_event デコレータ](#on_event-デコレータ)
- [getElementByFieldCode 関数](#getElementByFieldCode-関数)
- [filter_function デコレータ](#filter_function-デコレータ)

---

## print() 関数

**シグネチャ:**
```python
def print(*args, end="", start="", level="info", color=None):
```

**概要:**
- 複数の引数を受け取り、JavaScript の `console` オブジェクトを使用してログレベルに応じた出力を行うカスタム関数です。
- 指定されたログレベルに基づき、`console.log`、`console.warn`、`console.error`、または `console.debug` を呼び出します。
- `color` パラメータが指定された場合、CSS のスタイル（例: `"red"`, `"#ff0000"`) を適用して色付きで出力します。セパレータはこの場合のみ有効です。また、levelが無視されます。

**パラメータ:**
- `*args`: 出力する複数の値。
- `sep` (str): 各引数間に挿入する区切り文字（デフォルトは半角スペース）。colorを指定した場合のみ有効。
- `end` (str): 出力の末尾に付加する文字（デフォルトは空文字または環境により改行）。
- `start` (str): 出力の先頭に付加する文字列。
- `level` (str): ログレベル。使用可能な値は `"info"`, `"warn"`, `"error"`, `"debug"` 。colorを指定した場合は無視されます。
- `color` (str or None): CSS で利用可能な色の文字列。指定されると、該当色でスタイル付き出力を行います。

**使用例:**
```python
# デフォルトの情報レベルでの出力
print("Hello", "World")

# "debug" レベルで先頭にカスタム文字列を追加して出力
print("Debugging variables:", var1, var2, start="[DEBUG] ", level="debug")

# エラーメッセージを出力
print("An error occurred", level="error")
```

---

## kintone_event デコレータ

**シグネチャ:**
```python
def kintone_event(event_names):
```

**概要:**
- kintone のイベントハンドラとして機能するデコレータです。
- 引数 `event_names` には、単一のイベント名（文字列）または複数のイベント名を含むリスト/タプルを指定可能です。
- 内部では`kintone.events.on()` を通じてイベントリスナーとして登録されます。

**パラメータ:**
- `event_names`: 単一の文字列または複数のイベント名（リスト/タプル）。

**使用例:**
```python
@kintone_event("app.record.detail.show")
def on_detail_event(event):
    # レコード情報の処理を実施
    print("Record details updated", event)
    return event
```

---

## handle_promise クラス

**概要:**
- JavaScript の Promise オブジェクトを管理し、成功時およびエラー時のコールバック関数を簡単に設定できるクラスです。

**コンストラクタ:**
```python
def __init__(self, promise_object, successCallback=None, failureCallback=None)
```
- `promise_object`: 対象の JavaScript Promise オブジェクト。
- `successCallback`: 成功時に実行するコールバック関数（オプション）。
- `failureCallback`: エラー時に実行するコールバック関数（オプション）。

**主なメソッド:**
- `__call__(self, func)`: デコレータとして利用可能です。成功コールバックを `func` に設定し、即座に `call()` を実行します。
- `on_success(self, func)`: 成功時のコールバックを明示的に設定します。
- `on_error(self, func)`: エラー時のコールバックを明示的に設定します。
- `call(self)`: Promise の `then` や `catch` を利用して、コールバック関数を登録・実行します。エラーコールバックが未設定の場合は成功時のみ処理します。

**使用例:**
```python
# 例1: デコレータを使用して成功時のコールバックを指定する
promise = some_js_function_returning_a_promise()

@handle_promise(promise)
def handle_success(data):
    print("Promise resolved with:", data)

# 例2: 成功時と失敗時のコールバックを指定する
promise = some_js_function_returning_a_promise()

event_caller = handle_promise(promise)
@event_caller.on_success
def handle_success(data):
    print("Promise resolved with:", data)

@event_caller.on_error
def handle_error(error):
    print("Promise rejected with:", error)

event_caller.call()

# 例3: デコレータを使用せずに Promise を処理する
def handle_success(data):
    print("Promise resolved with:", data)

def handle_error(error):
    print("Promise rejected with:", error)

promise = some_js_function_returning_a_promise()

event_caller = handle_promise(promise, handle_success, handle_error)
event_caller.call()
```

---

## kintone_api クラス

**概要:**
- kintone の API エンドポイントへのリクエストを簡略化するためのラッパークラスです。
- リクエストのエンドポイント、HTTP メソッド、パラメータ、そしてコールバック関数を一括して管理できます。

**コンストラクタ:**
```python
def __init__(self, api_endpoint: str, method: str, params: dict, 
             successCallback=None, failureCallback=None)
```
- `api_endpoint`: API のエンドポイント URL。
- `method`: 使用する HTTP メソッド（例: `"GET"`, `"POST"`）。
- `params`: リクエスト時に送信するパラメータ（辞書形式）。
- `successCallback`: 成功時に呼ばれるコールバック関数（オプション）。
- `failureCallback`: 失敗時に呼ばれるコールバック関数（オプション）。

**主なメソッド:**
- `__call__(self, func)`: デコレータとして利用し、成功コールバックを `func` に設定し、API 呼び出し (`call()`) を実行します。
- `on_success(self, func)`: 成功時コールバック関数の設定。
- `on_error(self, func)`: エラー時コールバック関数の設定。
- `call(self)`: 内部で `kintone.api()` を利用して API リクエストを送信し、設定されたコールバック関数に応じた処理を実行します。

**使用例:**
```python
# 例1: デコレータで成功時のコールバックのみを指定して API を呼び出す 
@kintone_api("/k/v1/records.json", "GET", {"app": 123})
def handle_api_response(response):
    print("API Response:", response)

# 例2: 成功時と失敗時のコールバックを指定して API を呼び出す
event_caller = kintone_api("/k/v1/records.json", "GET", {"app": 123})

@event_caller.on_success
def handle_success(response):
    print("Success:", response)

@event_caller.on_error
def handle_error(error):
    print("Error:", error)

event_caller.call()

# 例3: デコレータを使用せずに API を呼び出す場合
def handle_api_response(response):
    print("API Response:", response)

def handle_api_error(error):
    print("API Error:", error)

api_caller = kintone_api("/k/v1/records.json", "GET", {"app": 123}, handle_api_response, handle_api_error)
api_caller.call()
```

---

## kintone_record クラス

**概要:**
- kintone のレコード取得および更新を管理するためのコンテキストマネージャークラスです。
- `kintone_event()` のイベントハンドラー外や`kintone_event()` のイベントハンドラーから呼び出されたイベントハンドラー内では、そのまま使用できます。
- `kintone_event()` のイベントハンドラー内ではでは、kintone JavaScript API の仕様上 `event` を渡す必要があります。

**コンストラクタ:**
```python
def __init__(self, event=None)
```
- `event`: kintone のイベントオブジェクト（辞書形式）。指定がない場合、独自にレコードを取得します。

**使用例:**
```python
# 例1: イベントオブジェクトを指定せずにレコードを取得・更新する
with kintone_record() as record:
    # レコードの特定フィールドを更新する
    record["FieldName"]["value"] = "Updated Value"

# 例2: イベントオブジェクトを指定してレコードを取得・更新する
@kintone_event("app.record.edit.submit.success")
def on_edit_success(event):
    # kintone_event() から渡されたイベントオブジェクトを使用
    with kintone_record(event) as record:
        # レコードの特定フィールドを更新する
        record["FieldName"]["value"] = "Updated Value"
    return event

# 例3: 特殊ケースとして、kintone_event() のイベントハンドラー内で API を呼び出し、その後にレコードを更新する場合
@kintone_event("app.record.create.show")
def on_create_show(event):
    # API を呼び出す
    @kintone_api("/k/v1/records.json", "GET", {"app": 123})
    def handle_api_response(response):
        # API レスポンスを処理する
        print("API Response:", response)
        # ここでレコードを更新する場合は、event を渡す必要はありません
        with kintone_record() as record:
            record["FieldName"]["value"] = "Updated Value"
    return event 
```

---

## on_event デコレータ

**シグネチャ:**
```python
def on_event(element, event_type="click"):
```

**概要:**
- DOM 要素に特定のイベントリスナーをバインドするためのデコレータです。
- 装飾された関数は、指定された `event_type` のイベントが発火した際に呼び出されます。

**パラメータ:**
- `element`: イベントリスナーをバインドする対象の DOM 要素。
- `event_type` (str): 監視するイベントタイプ（例: `"click"`, `"mouseover"`）。デフォルトは `"click"`。

**使用例:**
```python
from js import document
@on_event(document.getElementById("myButton"), event_type="click")
def handle_click(evt):
    print("Button clicked!")
```


---
## getElementByFieldCode 関数

**シグネチャ:**
```javascript
function getElementByFieldCode(fieldCode)
```

**概要:**
- この関数は、kintone のフィールドコードに基づいて該当する DOM エレメントを取得するために設計されています。
- Javascript側で実装されているため、Python からは `js` モジュールを通じて呼び出す必要があります。

**パラメータ:**
- `fieldCode` (string): kintone のフィールドコード。

**戻り値:**
- 指定されたフィールドコードに対応する DOM エレメントを返します。対象の要素が見つからない場合は `null` を返します。

**使用例:**
```python
from js import getElementByFieldCode
# "Customer" というフィールドコードに対応するエレメントを取得する例
customerElement = getElementByFieldCode("Customer")
if customerElement:
  # 要素が存在すれば、スタイルの変更などの操作が可能
  customerElement.style.backgroundColor = "yellow"
else:
  print("指定されたフィールドコードに対応する要素が見つかりません。", level="warn")
```

---

## filter_function デコレータ

**シグネチャ:**
```python
def filter_function(func):
```

**概要:**
- リストやその他のイテラブルに対してフィルタリングを行うためのデコレータです。
- 装飾された関数は、与えられた条件に従って各要素を評価し、条件を満たす要素のみを返すフィルタ関数に変換されます。
- フィルタ関数は、論理演算子（`&`、`|`、`~`）およびメソッドチェーン（`.and_()`, `.or_()`, `.not_()`）を用いて複雑なフィルタ条件を簡単に合成できるよう設計されています。
- また、`.describe()` や `.chain_length()` を使用することで、合成されたフィルタの構造やチェーンの深さを確認することができます。

**パラメータ:**
- `func`: 判定関数。各要素を引数に取り、その要素が条件を満たす場合は `True`、満たさない場合は `False` を返す関数です。

**返り値:**
- `FilterFunction` オブジェクト  
  → フィルタ関数として機能し、後からリストやイテラブルに適用可能なオブジェクトになります。

**使用例:**
```python
# フィルタ関数としての定義
@filter_function
def is_even(x):
    """偶数かどうかを判定する"""
    return x % 2 == 0

@filter_function
def is_positive(x):
    """正の数かどうかを判定する"""
    return x > 0

@filter_function
def less_than_five(x):
    """5未満かどうかを判定する"""
    return x < 5

# フィルタ関数を使った例
# 例1: 偶数のフィルタを適用
even_numbers = is_even([1, 2, 3, 4, 5])
print(even_numbers)  # 出力例: [2, 4]


# 例2: 複合条件のフィルタをメソッドチェーンで作成
# 「(偶数 AND 正) OR (NOT 正)」という複合条件のフィルタを作成
combined_filter1 = is_even.and_(is_positive).or_(is_positive.not_())

# データに対してフィルタを適用
data = [1, 2, -2, 0, 3]
result = combined_filter1(data)
print(result)  # 出力例: [2, -2, 0]

# フィルタの構造を確認
print(combined_filter1.describe())       # 出力："((is_even AND is_positive) OR (NOT is_positive))"


# 例3: 複合条件のフィルタを論理演算子を使って作成
# 括弧を使って「偶数 または（正かつ5未満）」という複合条件を定義
combined_filter2 = is_even | (is_positive & less_than_five)

# データに対してフィルタを適用
data = [-3, -2, 0, 1, 2, 3, 4, 5, 6]
result = combined_filter2(data)
print(result)  # 出力例: [-2, 0, 1, 2, 3, 4, 6]

# 構造と深さを確認
print(combined_filter2.describe())       # 出力："(is_even OR (is_positive AND less_than_five))"


# 例4: 辞書の入ったリストに対するフィルタ
# サンプルデータ
records_data = {
    "records": [
        {"record_id": "1", "name": "Alice",   "age": 25, "score": 85},
        {"record_id": "2", "name": "Bob",     "age": 30, "score": 75},
        {"record_id": "3", "name": "Charlie", "age": 22, "score": 90},
        {"record_id": "4", "name": "Diana",   "age": 28, "score": 95},
        {"record_id": "5", "name": "Eve",     "age": 20, "score": 60}
    ]
}

# フィルタ関数の定義
@filter_function
def is_adult(record):
    """レコードが成人（20歳以上）かどうかを判定します"""
    return record["age"] >= 20

@filter_function
def has_high_score(record):
    """レコードのスコアが高い（90点以上）かどうかを判定します"""
    return record["score"] >= 90

# 論理演算子を使って複合条件を合成
# 今回は「成人 OR 高スコア」のレコードを抽出する条件
combined_filter3 = is_adult | has_high_score

# フィルタを適用
filtered_records = combined_filter3(records_data["records"])

# 結果表示
print(f"フィルタ結果:{str(combined_filter3)}")
```

**補足:**
- `.and_(other)` や `.or_(other)` を使ったメソッドチェーンにより、複数のフィルタ関数を論理積や論理和で組み合わせることができます。
- `~` 演算子または `.not_()` を使用することで、元のフィルタ条件の否定を容易に定義できます。
- 結果として返されるリストは、元データの各要素に対してフィルタ条件が適用されたものとなります。  

