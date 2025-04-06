# PyEdit for Kintone

**PyEdit for Kintone** は、Kintoneを **Python（PyScript / MicroPython）で柔軟かつ直感的にカスタマイズできる**拡張機能です。[JSEdit for Kintone](https://cybozu.dev/ja/kintone/tips/development/plugins/sample-plugin/jsedit-for-kintone-plugin/)のように**プラグインベースでエディタを組み込み**、ブラウザ上で即座にスクリプトを書いて実行・反映できる環境を提供します。

![PyEdit for Kintone](./img/screenshot.avif)

## 特長

- Kintoneのカスタマイズを**Pythonだけで実現**
- イベント処理・API呼び出し・レコード更新などを**Pythonで簡潔に記述**
- プラグイン内蔵のエディタで**試行錯誤がしやすい**
- Pyscript + MicroPython を採用し、**非常に軽量・高速な動作**
- プロトタイピング・PoC用途に最適

> [!WARNING]
> 本プラグインは、技術実証やプロトタイピングを目的としたものであり、商用利用は推奨されていません。
> 予期せぬ動作やエラーが発生する可能性があるため、十分なテストを行った上でご利用ください。

## セットアップ

1. プラグインファイル（ZIP）をkintoneにインストール
2. 使用したいアプリの設定画面から拡張機能を有効化
3. PyEditのエディタ上にPythonコードを記入
4. 保存して、Kintoneの画面をリロード
5. イベントに応じてPythonコードが実行される

## 使用できる Python API 例

### 🔹 `@kintone_event(...)`

kintoneのイベントに対して処理を割り当てるデコレータです。

```python
# デコレータでKintoneのイベントのコールバックを登録
@kintone_event("app.record.create.show")
def on_create(event):
    event["record"]["Title"]["value"] = "自動入力済み"
    return event

# 複数イベントの同時登録にも対応
@kintone_event(["app.record.edit.show", "app.record.detail.show"])
def on_edit_screen(event):
    print("Hello World")
    return event
```

### 🔹 `@kintone_api(...)`

kintoneのREST APIや外部APIを簡単に呼び出すユーティリティです。

```python
# 使い方1：デコレータを使用して簡潔に記述
params = {"app": 123, "id": 456}

# デコレータとコールバック関数を記述し、APIコールを即時実行
@kintone_api("/k/v1/record", "GET", params)
def on_success(result):
    print(result)


# 使い方2：エラー時のコールバックも含めて詳細に記述
api_caller = kintone_api("/k/v1/record", "GET", params)

# デコレータでコールバックを定義
@api_caller.on_success
def success_callback(result):
    print(result)

# エラー時のコールバックも定義
@api_caller.on_error
def error_callback(error):
    print(error)

# APIコールを実行
api_caller.call()
```

### 🔹 `kintone_record`

with構文でレコードを安全に取得・編集・保存できます。

```python
# with 構文でeventオブジェクトが無くても簡潔にレコードを取得/編集
with kintone_record() as record:
    record["Title"]["value"] = "保存される値"

# Kintoneのeventコールバック内ではeventオブジェクトを渡すことで同じコードで実行可能
with kintone_record(event) as record:
    record["Title"]["value"] = "保存される値"
```


## 組み込みPythonエディタ

- Kintoneのプラグイン設定画面に表示される**エディタ**を内蔵
- 自動で Javascript カスタマイズ用のソースコードに変換しアップロード可能
- 編集 → 保存 → 即時反映のワークフローが可能


## サンプルコード
以下は、PyEdit for Kintoneを使用したサンプルコードです。

```python
from js import getElementByFieldCode

flag = False

# チェックボックスに応じて背景色を変える
@kintone_event("app.record.edit.change.チェック")
def on_checkbox_toggle(event):
    global flag
    element = getElementByFieldCode("チェック")
    if flag:
        element.style.backgroundColor = "#FFFFFF"
    else:
        element.style.backgroundColor = "#CCFFCC"
    flag = not flag
    return event

# 都市を選ぶと天気APIから予報を取得してその都市の気温を「天気」フィールドに反映
@kintone_event("app.record.create.change.都市")
def on_city_change(event):
    city = list(event["record"]["都市"]["value"])
    if len(city) == 0:
        return event

    coords = {
        "東京": (35.6895, 139.6917),
        "大阪": (34.6937, 135.5023),
        "札幌": (43.0667, 141.3500)
    }

    lat, lon = coords.get(city[0], (35.0, 135.0))

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m",
        "forecast_days": 1,
        "timezone": "Asia/Tokyo"
    }

    # この天気APIは商用利用不可なので、あくまでサンプルです
    @kintone_api("https://api.open-meteo.com/v1/forecast", "GET", params)
    def on_weather(result):
        current_temp = result["hourly"]["temperature_2m"][0]
        with kintone_record() as record:
            console.log(result)
            record["天気"]["value"] = f"{city[0]}の気温は{current_temp:.1f}°C"

    return event

# 保存時に「天気」が空なら警告し、保存を止める
@kintone_event("app.record.create.submit")
def on_submit(event):
    print(event["record"]["天気"]["value"])
    if event["record"]["天気"]["value"] == undefined:
        window.alert("天気フィールドが空です。都市を選んでください。")
        return False  # 保存を中止
    return event
```

## ライセンス

MIT License
