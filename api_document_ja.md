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