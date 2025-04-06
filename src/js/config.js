(function (PLUGIN_ID) {
  'use strict';

  const pythonPcFile = "PyEditCustomizePC.js";
  const pythonMobileFile = "PyEditCustomizeMobile.js";

  let nowPlatform = "PC";

  // 初期内容を保持
  let initialContent = "";
  let isModified = false;

  function updateModifiedFlag() {
    isModified = (editor.getValue() !== initialContent);
  }

  function checkModifiedConfirm() {
    if (isModified) {
      if (confirm('変更は破棄されます。よろしいですか？')) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  function showLoading() {
    document.getElementById('loading-screen').classList.add('active');
  }

  function hideLoading() {
    document.getElementById('loading-screen').classList.remove('active');
  }

  /**
 * 入力されたコード文字列から userCode の内容を抽出する関数
 * @param {string} codeString - 対象のコード全体の文字列
 * @returns {string|null} - 抽出された userCode の内容、または見つからなかった場合は null
 */
  function extractUserCode(codeString) {
    // 正規表現のパターン:
    // "const userCode =" に続き、任意の空白文字、"=" の後の空白、
    // バッククォートで始まるテンプレートリテラルの中身を非貪欲にキャプチャし、最後にバッククォートとセミコロン
    const regex = /const\s+userCode\s*=\s*`([\s\S]*?)`;/;
    const match = codeString.match(regex);
    return match ? match[1] : null;
  }

  let editor = null;
  // Load the Monaco Editor
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
      value: "",
      language: 'python',
      theme: 'vs-dark',
      wordWrap: 'on',
      lineNumbersMinChars: 3,
      automaticLayout: true
    });

    // Ctrl+S or Cmd+S のショートカットをカスタム処理に変更
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      function () {
        console.log('Ctrl+S pressed');
        handleSaveButtonClick();
      }
    );

    // Ctrl + W or Cmd + W のショートカットを誤動作防止のために無効化
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW,
      function () {
        console.log('Ctrl+W pressed');
        // 何もしない
      }
    );

    loadScreen();

    // 内容変更時にフラグを更新
    editor.onDidChangeModelContent(function () {
      updateModifiedFlag();
    });
  });

  function handleSaveButtonClick() {

    showLoading();

    console.log('save');
    // Save the content

    let userCode = editor.getValue();

    // // \nを\\nに変換
    userCode = userCode.replace(/\\n/g, '\\\\n');
    // // \rを\\rに変換
    userCode = userCode.replace(/\\r/g, '\\r');
    // // \tを\\tに変換
    userCode = userCode.replace(/\\t/g, '\\t');
    // `を\\`に変換
    userCode = userCode.replace(/`/g, "\\\`");

    let pythonCode = `

function kintoneRecordGet() {
  // 現在のURLを取得
  const url = window.location.href;
  // URLに '/m/' が含まれていればモバイルと判定
  const isMobile = url.indexOf('/m/') !== -1;
  
  if (isMobile) {
    return kintone.mobile.app.record.get();
  } else {
    return kintone.app.record.get();
  }
}

function kintoneRecordSet(record) {
  // 現在のURLを取得
  const url = window.location.href;
  // URLに '/m/' が含まれていればモバイルと判定
  const isMobile = url.indexOf('/m/') !== -1;
  
  if (isMobile) {
    return kintone.mobile.app.record.set(record);
  } else {
    return kintone.app.record.set(record);
  }
}

function getElementByFieldCode(fieldCode) {
  // console.log('getElementByFieldCode:', fieldCode);
  let FORM_DATA = cybozu.data.page['FORM_DATA'];
  let ELEMENT_FIELD_ID = {};
  let fieldList = FORM_DATA.schema.table.fieldList;
  for (let fieldId of Object.keys(fieldList)) {
    ELEMENT_FIELD_ID[fieldList[fieldId].var] = fieldId;
  }
  return document.querySelector(\`.value-\${ELEMENT_FIELD_ID[fieldCode]}\`)
}

//document.getElementByFieldCode = getElementByFieldCode;


    (function() {
"use strict";

kintone.events.on([
        'app.record.detail.show',
        'app.record.create.show',
        'app.record.edit.show'
], function(event) {
    console.log(event);
    return event;
});

// 外部リソースのURLを定数で定義
const PY_SCRIPT_CSS_URL = "https://pyscript.net/releases/2025.3.1/core.css";
const PY_SCRIPT_JS_URL  = "https://pyscript.net/releases/2025.3.1/core.js";

// PyScript用のCSSがすでに読み込まれていないかチェックし、未読み込みの場合のみ追加
if (!document.querySelector(\`link[href="\${PY_SCRIPT_CSS_URL}"]\`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = PY_SCRIPT_CSS_URL;
  document.head.appendChild(link);
}

// PyScript用のJSがすでに読み込まれていないかチェックし、未読み込みの場合のみ追加
if (!document.querySelector(\`script[src="\${PY_SCRIPT_JS_URL}"]\`)) {
  const script = document.createElement("script");
  script.defer = true;
  script.type = "module";
  script.src = PY_SCRIPT_JS_URL;
  document.head.appendChild(script);

  // PyScriptのJSファイルが正常にロードされたら、Pythonコードを実行するためのタグを作成
  script.onload = function() {
    // カスタムタグ <mpy-script> を作成（MicroPython版PyScript用）
    const pyScript = document.createElement("mpy-script");

    // システム用の簡易ライブラリコード（例としてalertとconsole.logを利用）
    const systemCode = \`

from js import alert, window, kintone, Object, kintoneRecordGet, kintoneRecordSet, console, undefined

def print(*args, sep=" ", end="\\\\n", start="", level="info", color=None):
  """
  複数引数を受け取り、ログレベルに応じた出力を行うカスタム print 関数です。
  直接色を指定する場合は、color パラメータに CSS で利用可能な色（例："red", "#ff0000"）を指定してください。
  
  Parameters:
    *args: 出力する複数の値
    sep (str): 各引数の区切り文字（デフォルトは半角スペース）
    end (str): 出力の末尾に付加する文字（デフォルトは改行）
    start (str): 出力の先頭に付加する文字列
    level (str): ログレベル ("info", "warn", "error", "debug")
    color (str or None): 直接指定する色（CSSで利用可能な文字列）。指定された場合、色付き出力を行います。
  """
  from js import console

  # 引数が一つだけの場合は、console.log を優先して使用
  if len(args) == 1 and level == "info" and color is None and start == "" and end == "\\\\n":
      console.log(args[0])
      return

  # 可変長引数を連結して最終的なメッセージ文字列を生成
  message = start + sep.join([str(arg) for arg in args]) + end

  # 直接色指定がある場合は、その色でスタイル付き出力を実施
  if color is not None:
      style = f"color: {color};"
      console.log("%c" + message, style)
  else:
      # 色指定がない場合は、ログレベルに応じた出力関数を選択
      levels = {
          "info": console.log,
          "warn": console.warn,
          "error": console.error,
          "debug": console.debug,
      }
      log_func = levels.get(level, console.log)
      log_func(message)

def get_kintone_screen_info():
    url = window.location.href
    # モバイル判定: URL に "/m/" が含まれていればモバイルとする
    is_mobile = "/m/" in url

    # URL をメイン部分とフラグメントに分割
    if "#" in url:
        main_part, fragment = url.split("#", 1)
    else:
        main_part = url
        fragment = ""
    
    # アプリIDの取得: "/k/" の後ろの最初の部分を抽出
    app_id = None
    parts = main_part.split("/k/")
    if len(parts) > 1:
        app_id = parts[1].split("/")[0]
    
    # 画面種別の判定
    if "/edit" in main_part and "record=" not in fragment:
        screen_type = "app.record.create.show"
    elif "/show" in main_part and "mode=edit" in fragment:
        screen_type = "app.record.edit.show"
    elif "/show" in main_part and "record=" in fragment and "mode=edit" not in fragment:
        screen_type = "app.record.detail.show"
    else:
        screen_type = "unknown"
    
    # レコードIDの取得: フラグメント内の "record=" の後ろの値を抽出（"&" で区切る）
    record_id = None
    if "record=" in fragment:
        record_id = fragment.split("record=")[1].split("&")[0]
    
    return screen_type, app_id, record_id, is_mobile

def js_to_py(obj):
    """
    JsProxy オブジェクト（JavaScript のオブジェクトや配列）を
    Python の辞書やリストに再帰的に変換する関数です。
    """
    # すでに Python のネイティブ型であればそのまま返す
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    
    # もし obj が配列（length プロパティを持つ）ならリストに変換
    try:
        length = int(obj.length)
        return [js_to_py(obj[i]) for i in range(length)]
    except Exception:
        pass

    # それ以外はオブジェクトとして扱い、Object.keys() でキー一覧を取得
    result = {}
    keys = Object.keys(obj)
    # keys は JavaScript の配列（JsProxy）なので、まず Python のリストに変換
    try:
        keys_list = [keys[i] for i in range(int(keys.length))]
    except Exception:
        keys_list = list(keys)
    
    for key in keys_list:
        # key は JsProxy の場合があるので、文字列に変換して利用
        result[str(key)] = js_to_py(obj[key])
    return result

def kintone_event(event_names):
    """
    event_names: 文字列またはリスト/タプルで複数のイベント名を指定可能
    """
    def decorator(func):
        def wrapper(event):
            try:
                return func(event)
                #return func()
            except Exception as e:
                print(f"[Error] in {func.__name__}: {e}", level="error")
                return event
        # 現在の画面種別を一度取得
        screen_type, app_id, record_id, is_mobile = get_kintone_screen_info()
        
        # event_names がリスト・タプルの場合と単一文字列の場合で分岐
        if isinstance(event_names, (list, tuple)):
            for ev in event_names:
                if ev == screen_type:
                    record = kintoneRecordGet()
                    dummy_record = {
                        "appId": app_id,
                        "recordId": record_id,
                        "record": record["record"],
                        "type": screen_type
                    }
                    event_result = wrapper(dummy_record)
                    if event_result is not None:
                        kintoneRecordSet({"record":event_result["record"]})
                else:
                    kintone.events.on(ev, wrapper)
        else:
            if event_names == screen_type:
                record = kintoneRecordGet()
                dummy_record = {
                    "appId": app_id,
                    "recordId": record_id,
                    "record": record["record"],
                    "type": screen_type
                }
                event_result = wrapper(dummy_record)
                if event_result is not None:
                    kintoneRecordSet({"record":event_result["record"]})
            else:
                kintone.events.on(event_names, wrapper)
        return wrapper
    return decorator

class kintone_api:
    def __init__(self, api_endpoint: str, method: str, params: dict, 
                 successCallback=None, failureCallback=None):
        self.api_endpoint = api_endpoint
        self.method = method
        self.params = params
        self.successCallback = successCallback
        self.failureCallback = failureCallback

    def __call__(self, func):
        self.successCallback = func
        self.call()
        return func

    def on_success(self, func):
        self.successCallback = func
        return func

    def on_error(self, func):
        self.failureCallback = func
        return func

    def call(self):
        if self.successCallback is None:
            raise ValueError("Success callback is not defined")
        if self.failureCallback is None:
            kintone.api(self.api_endpoint, self.method, self.params, self.successCallback)
        else:
            kintone.api(self.api_endpoint, self.method, self.params, 
                       self.successCallback, self.failureCallback)

class kintone_record:
    """
    コンテキストマネージャーを用いて、kintoneレコードの取得と更新を管理するクラスです。
    
    - event が None の場合：
        - __enter__ で kintoneRecordGet() を呼び出し、取得したレコード(dict)から "record" キーの内容を返す。
        - __exit__ で、例外がなければ kintoneRecordSet() によりレコードを更新する。
    - event が指定されている場合：
        - __enter__ では event["record"] を返し、__exit__ では更新処理は行わない。
    """

    def __init__(self, event=None):
        """
        :param event: kintoneのイベントオブジェクト（dict）。指定がない場合は独自にレコードを取得する。
        """
        self.event = event
        self.record = None

    def __enter__(self):
        """
        コンテキストに入る際、レコードを取得し返します。
        イベントオブジェクトがない場合は kintoneRecordGet() を用いて取得し、
        得られた dict に "record" キーが存在するかチェックします。
        """
        if self.event is None:
            try:
                # レコードを取得
                self.record = kintoneRecordGet()
            except Exception as e:
                print("kintoneRecordGet():", e, level="error")
                raise
            return self.record["record"]
        else:
            return self.event["record"]

    def __exit__(self, exc_type, exc_value, traceback):
        """
        コンテキストを抜ける際にレコード更新処理を行います。
        
        - event が None の場合、例外が発生していなければ kintoneRecordSet() を呼び出して更新します。
        - 例外が発生している場合は更新をスキップし、エラーログを出力します。
        - event が指定されている場合は何もしません。
        
        :return: False を返すことで、発生した例外は呼び出し元に伝播されます。
        """
        if self.event is None:
            if exc_type is None:
                try:
                    kintoneRecordSet(self.record)
                except Exception as e:
                    print("kintoneRecordSet():", e, level="error")
            else:
                # 例外発生時は更新をスキップ
                pass
            return False  # False を返すと例外がそのまま上位に伝播される
        else:
            pass
            
def on_event(element, event_type="click"):
    """
    任意のDOM要素に任意のイベントをバインドするデコレータ
    """
    def decorator(func):
        def wrapper(evt):
            try:
                func(evt)
            except Exception as e:
                print(f"[Error] in {func.__name__}: {e}", level="error")
        element.addEventListener(event_type, wrapper)
        return func
    return decorator

\`;

    // ユーザーが記述するPythonコード
    const userCode = \`${userCode}\`;

    //console.log("systemCode:", systemCode);
    //console.log("userCode:", userCode);

    // システムコードとユーザーコードを結合して、<mpy-script>タグ内に設定
    pyScript.innerHTML = systemCode + "\\n" + userCode;

    // 作成した<mpy-script>タグをdocument.bodyに追加して実行
    document.body.appendChild(pyScript);
  };

  // エラーハンドリング：JSファイルの読み込みに失敗した場合の処理
  script.onerror = function() {
    console.error("Failed to load PyScript core.js from " + PY_SCRIPT_JS_URL);
  };
}
})();
    `;

    // userCodeにバッククォートが入っている場合はエラーとする
    // if (userCode.includes('`')) {
    //   alert('コード内にバッククォートは使用できません。');
    //   return;
    // }

    
    let fileName = nowPlatform === "PC" ? pythonPcFile : pythonMobileFile;

    window.jsEditKintonePlugin.upsertJsFile(fileName, pythonCode, nowPlatform)
      .then((newFileKey) => {
        console.log('アップサート完了。新しい fileKey:', newFileKey);
        return window.jsEditKintonePlugin.deployAppAndCheckStatus();
      })
      .then((deployResult) => {
        console.log('デプロイ完了:', deployResult);
        hideLoading();
      })
      .catch((err) => {
        console.error('処理中にエラーが発生:', err);
        alert('エラーが発生しました。コンソールを確認してください。');
        hideLoading();
      });


    // ここで初期内容を更新
    initialContent = editor.getValue();
    updateModifiedFlag();
  }

  // Load the screen
  function loadScreen(platform = "PC") {
    // Show loading screen
    showLoading();

    // Get Elements
    let saveButton = document.getElementById('save-btn');
    let cancelButton = document.getElementById('discard-btn');
    let returnButton = document.getElementById('return-btn');
    let checkBox = document.getElementById('checkbox');
    let pcPythonFile = document.getElementById('pc-python-file');
    let mobilePythonFile = document.getElementById('mobile-python-file');
    let nowFileType = document.getElementById('now-file-type');

    let fileName = nowPlatform === "PC" ? pythonPcFile : pythonMobileFile;

    window.jsEditKintonePlugin.getJsFile(fileName, platform).then(function (data) {
      console.log(data);
      if (data.exists) {
        console.log('File exists');
        let userCode = extractUserCode(data.content);
        // \\nを\nに変換
        userCode = userCode.replace(/\\\\n/g, '\\n');
        // \\rを\rに変換
        userCode = userCode.replace(/\\\\r/g, '\\r');
        // \\tを\tに変換
        userCode = userCode.replace(/\\\\t/g, '\\t');
        // \`を`に変換
        userCode = userCode.replace(/\\\`/g, '`');


        console.log('userCode:', userCode);
        if (userCode) {
          console.log('userCode found:', userCode);
          editor.setValue(userCode);
        }
        else {
          console.log('userCode not found');
          alert('コード内の形式が不正です。コードをダウンロードして確認してください。上書き保存した場合は既存のデータは消去されます。');
          editor.setValue(`
def say_hello(name):
    print("Hello, " + name)

say_hello("World")
`
          );
        }
        initialContent = editor.getValue();
        updateModifiedFlag();

        // Hide loading screen
        hideLoading();
      }
      else {
        console.log('File does not exist');
        editor.setValue(`
def say_hello(name):
    print("Hello, " + name)

say_hello("World")
`
        );
        initialContent = editor.getValue();
        updateModifiedFlag();

        // Hide loading screen
        hideLoading();
      }
    }).catch(function (error) {
      console.error('Error:', error);
      alert('エラーが発生しました。コンソールを確認してください。');
      hideLoading();
    }
    );

    // Set button event listeners
    saveButton.addEventListener('click', handleSaveButtonClick);
    cancelButton.addEventListener('click', function () {
      console.log('cancel');
      if (!checkModifiedConfirm()) {
        return;
      }
      location.reload();
    });
    returnButton.addEventListener('click', function () {
      console.log('back');
      if (!checkModifiedConfirm()) {
        return;
      }
      history.back();
    });

    pcPythonFile.addEventListener('click', function () {
      console.log('pcPythonFile');
      if (!checkModifiedConfirm()) {
        return;
      }
      nowFileType.innerHTML = "PC用Pythonファイル";
      nowPlatform = "PC";
      loadScreen(nowPlatform);
      initialContent = editor.getValue();
      updateModifiedFlag();
    });
    mobilePythonFile.addEventListener('click', function () {
      console.log('mobilePythonFile');
      if (!checkModifiedConfirm()) {
        return;
      }
      nowFileType.innerHTML = "モバイル用Pythonファイル";
      nowPlatform = "Mobile";
      loadScreen(nowPlatform);
      initialContent = editor.getValue();
      updateModifiedFlag();
    });

    // Hide loading screen
    hideLoading();
  }

})(kintone.$PLUGIN_ID);
