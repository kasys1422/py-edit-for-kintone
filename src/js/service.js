jQuery.noConflict();
(($, PLUGIN_ID) => {
    'use strict';

    const createNameSpace = () => {
        const jsEditKintonePlugin = {
            service: {},
            FileManager: null,
            upsertJsFile: null,
            getJsFile: null,
            deployAppAndCheckStatus: null,
        };

        window.jsEditKintonePlugin = jsEditKintonePlugin;
    };
    createNameSpace();


    /* ==============================
       1. Service オブジェクトの定義
       ============================== */
    const i18n = window.jsEditKintonePlugin.i18n;
    const service = {
        uploadFile: (fileName, fileValue) => {
            return new kintone.Promise((resolve, reject) => {
                const blob = new Blob([fileValue], { type: 'text/javascript' });
                const formData = new FormData();
                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                formData.append('file', blob, fileName);
                $.ajax(kintone.api.url('/k/v1/file', true), {
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false
                }).done((data) => {
                    resolve(data);
                }).fail((err) => {
                    reject(err);
                });
            });
        },
        getFile: (fileKey) => {
            return new kintone.Promise((resolve, reject) => {
                $.ajax(kintone.api.url('/k/v1/file', true), {
                    type: 'GET',
                    dataType: 'text',
                    data: { 'fileKey': fileKey }
                }).done((data, status, xhr) => {
                    resolve(data);
                }).fail((xhr, status, error) => {
                    alert(i18n.msg_failed_to_get_file);
                    reject(new Error('ファイル取得に失敗しました'));
                });
            });
        },
        getCustomization: () => {
            const params = { app: kintone.app.getId() };
            return kintone.api(kintone.api.url('/k/v1/preview/app/customize', true), 'GET', params);
        },
        updateCustomization: (data) => {
            data.app = kintone.app.getId();
            return kintone.api(kintone.api.url('/k/v1/preview/app/customize', true), 'PUT', data);
        },
        deployApp: () => {
            const params = { apps: [{ app: kintone.app.getId() }] };
            return kintone.api(kintone.api.url('/k/v1/preview/app/deploy', true), 'POST', params);
        },
        deployStatus: () => {
            const params = { apps: [kintone.app.getId()] };
            return kintone.api(kintone.api.url('/k/v1/preview/app/deploy', true), 'GET', params);
        }
    };

    window.jsEditKintonePlugin.service = service;

    /* ===============================================
       2. FileManager クラス（ファイル作成・更新処理）
       =============================================== */
    class FileManager {
        /**
         * @param {Object} params
         * @param {Object} params.customization - カスタマイズ情報。例: { desktop: { js: [...], css: [...] }, mobile: { js: [...], css: [...] } }
         * @param {string} params.fileType - 対象のカスタマイズ種別。例: 'js_pc', 'js_mb', 'css_pc'
         * @param {number} params.maxFileNameLength - ファイル名の最大文字数（デフォルト: 255）
         * @param {number} params.maxCustomization - カスタマイズの上限件数（デフォルト: 30）
         */
        constructor({ customization, fileType, maxFileNameLength = 255, maxCustomization = 30 }) {
            this.customization = customization;
            this.fileType = fileType; // 例: 'js_pc', 'js_mb', 'css_pc'
            this.MAX_FILE_NAME_LENGTH = maxFileNameLength;
            this.MAX_CUSTOMIZATION = maxCustomization;
            // 新規作成時の一時ファイルキー
            this.TEMP_FILE_KEY = '-1';
        }

        // 対象のカスタマイズ部分を返す
        getCustomizationPart() {
            switch (this.fileType) {
                case 'js_pc':
                    return this.customization.desktop.js;
                case 'js_mb':
                    return this.customization.mobile.js;
                case 'css_pc':
                    return this.customization.desktop.css;
                default:
                    throw new Error(`Unknown fileType: ${this.fileType}`);
            }
        }

        // FILE タイプのファイル一覧を取得
        getFiles() {
            return this.getCustomizationPart()
                .filter((item) => item.type === 'FILE')
                .map((item) => item.file);
        }

        // 指定したファイル名が既に存在するかチェック
        fileExists(fileName) {
            return this.getFiles().some((file) => file.name === fileName);
        }

        // ファイル名に一致するファイル情報を取得
        getFileByName(fileName) {
            return this.getFiles().find((file) => file.name === fileName);
        }

        // ファイル名のバリデーション
        isValidFileName(fileName) {
            if (fileName.length > this.MAX_FILE_NAME_LENGTH) {
                alert(`ファイル名は${this.MAX_FILE_NAME_LENGTH}文字以内で指定してください。`);
                return false;
            }
            const specialCharRegex = /[\\/:\?\*\|"<>]/;
            if (specialCharRegex.test(fileName)) {
                alert('ファイル名に使用できない特殊文字が含まれています。');
                return false;
            }
            return true;
        }

        // 対象種別に応じた拡張子を自動付与
        createNameForNewFile(name) {
            let fileName = name;
            switch (this.fileType) {
                case 'js_pc':
                case 'js_mb':
                    if (!/\.js$/.test(fileName)) {
                        fileName += '.js';
                    }
                    break;
                case 'css_pc':
                    if (!/\.css$/.test(fileName)) {
                        fileName += '.css';
                    }
                    break;
            }
            return fileName;
        }

        /**
         * 新規ファイル作成
         * @param {string} name - ユーザー入力のファイル名
         * @param {string} defaultSource - 既定のソースコード
         * @returns {Object|null} 新規ファイル情報と既定ソース。エラー時は null
         */
        createNewFile(name, defaultSource) {
            let fileName = name.trim();
            fileName = this.createNameForNewFile(fileName);

            if (!this.isValidFileName(fileName)) {
                return null;
            }
            if (this.fileExists(fileName)) {
                alert('同じ名前のファイルがすでに存在します。');
                return null;
            }

            const newFileInfo = {
                type: 'FILE',
                file: {
                    fileKey: this.TEMP_FILE_KEY,
                    name: fileName,
                },
            };

            // カスタマイズ情報へ新規ファイルを追加
            this.getCustomizationPart().push(newFileInfo);
            return { newFileInfo, defaultSource };
        }

        /**
         * アップロード後の正式なファイルキーでファイル情報を更新
         * @param {string} oldFileKey - 更新前のファイルキー（新規作成時は TEMP_FILE_KEY）
         * @param {string} newFileKey - サーバーから返却された新しいファイルキー
         * @returns {boolean} 更新成功なら true
         */
        updateFile(oldFileKey, newFileKey) {
            const customizationPart = this.getCustomizationPart();
            for (let i = 0; i < customizationPart.length; i++) {
                if (customizationPart[i].type === 'FILE' && customizationPart[i].file.fileKey === oldFileKey) {
                    customizationPart[i].file = { fileKey: newFileKey };
                    return true;
                }
            }
            return false;
        }

        // カスタマイズ件数が上限内かチェック
        checkCustomizationLimit() {
            const customizationPart = this.getCustomizationPart();
            if (customizationPart.length > this.MAX_CUSTOMIZATION) {
                alert(`カスタマイズの上限は${this.MAX_CUSTOMIZATION}件です。`);
                return false;
            }
            return true;
        }

        /**
         * upsertFile
         * 指定されたファイル名とコンテンツに対して、既存なら更新、新規なら作成の処理を実施し、
         * 更新後のカスタマイズ情報をサーバーに反映します。
         * @param {string} fileName - ファイル名
         * @param {string} content - jsコンテンツ
         * @returns {Promise} アップロードおよびカスタマイズ更新完了後、新しい fileKey を返す Promise
         */
        upsertFile(fileName, content) {
            return new Promise((resolve, reject) => {
                let normalizedName = fileName.trim();
                normalizedName = this.createNameForNewFile(normalizedName);
                if (!this.isValidFileName(normalizedName)) {
                    reject(new Error('無効なファイル名です'));
                    return;
                }

                const existingFile = this.getFileByName(normalizedName);
                const isUpdate = !!existingFile;

                service.uploadFile(normalizedName, content)
                    .then((data) => {
                        const newFileKey = data.fileKey;
                        if (isUpdate) {
                            const oldKey = existingFile.fileKey;
                            const updated = this.updateFile(oldKey, newFileKey);
                            if (!updated) {
                                throw new Error('既存ファイルの更新に失敗しました');
                            }
                        } else {
                            const creationResult = this.createNewFile(normalizedName, content);
                            if (!creationResult) {
                                throw new Error('新規ファイルの作成に失敗しました');
                            }
                            const updated = this.updateFile(this.TEMP_FILE_KEY, newFileKey);
                            if (!updated) {
                                throw new Error('新規作成ファイルの更新に失敗しました');
                            }
                        }
                        // カスタマイズ情報の更新（updateCustomization）を実施
                        return service.updateCustomization(this.customization).then(() => newFileKey);
                    })
                    .then((newFileKey) => {
                        resolve(newFileKey);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        }
    }

    // FileManager をグローバルに公開
    window.jsEditKintonePlugin.FileManager = FileManager;

    /* ============================================================
       3. コンテンツ種別（PC／モバイル）に合わせた upsertFile のラッパー関数
       ============================================================ */
    /**
     * ファイル名、jsコンテンツ、コンテンツ種別（"PC" または "Mobile"）を入力し、
     * 存在しなければ新規作成、存在すれば更新を行います。
     * @param {string} fileName - 対象ファイル名
     * @param {string} jsContent - jsコンテンツ
     * @param {string} contentType - "PC" または "Mobile"
     * @returns {Promise} アップロード完了後、新しい fileKey を返す Promise
     */
    function upsertJsFile(fileName, jsContent, contentType) {
        const fileType = contentType.toLowerCase() === 'pc' ? 'js_pc' : 'js_mb';
        return service.getCustomization().then((customizationData) => {
            const customization = customizationData;
            const fileManager = new FileManager({
                customization,
                fileType: fileType,
            });
            return fileManager.upsertFile(fileName, jsContent);
        });
    }

    window.jsEditKintonePlugin.upsertJsFile = upsertJsFile;

    /* ======================================================
       4. getJsFile 関数
       ファイル名とコンテンツ種別（"PC" または "Mobile"）を入力し、
       対象ファイルが存在するかどうかと、その内容を取得します。
       ====================================================== */
    /**
     * ファイル名、コンテンツ種別（"PC" または "Mobile"）を入力し、
     * 対象ファイルの存在有無と内容を取得します。
     * @param {string} fileName - 対象ファイル名
     * @param {string} contentType - "PC" または "Mobile"
     * @returns {Promise} 存在する場合は { exists: true, content: <ファイル内容> }
     *                    存在しない場合は { exists: false, content: null } を返す Promise
     */
    function getJsFile(fileName, contentType) {
        const fileType = contentType.toLowerCase() === 'pc' ? 'js_pc' : 'js_mb';
        return service.getCustomization().then((customizationData) => {
            const customization = customizationData;
            const fileManager = new FileManager({
                customization,
                fileType: fileType,
            });
            const normalizedName = fileManager.createNameForNewFile(fileName.trim());
            const fileInfo = fileManager.getFileByName(normalizedName);
            if (fileInfo) {
                return service.getFile(fileInfo.fileKey).then((fileContent) => {
                    return { exists: true, content: fileContent };
                });
            } else {
                return { exists: false, content: null };
            }
        });
    }

    window.jsEditKintonePlugin.getJsFile = getJsFile;

    /* ======================================================
       5. deployApp 関連：デプロイ実行と完了確認を行う関数
       ====================================================== */
    /**
     * アプリのデプロイを実施し、deployStatus をポーリングして完了または失敗を確認します。
     * @returns {Promise} デプロイが完了（または失敗）した結果の Promise
     */
    function deployAppAndCheckStatus() {
        const DEPLOYMENT_TIMEOUT = 1000; // ミリ秒単位のポーリング間隔
        function waitForDeployment(resolve, reject) {
            service.deployStatus().then((response) => {
                const appInfo = response.apps[0];
                switch (appInfo.status) {
                    case 'FAIL':
                        reject(new Error('デプロイに失敗しました'));
                        break;
                    case 'PROCESSING':
                        setTimeout(() => {
                            waitForDeployment(resolve, reject);
                        }, DEPLOYMENT_TIMEOUT);
                        break;
                    case 'SUCCESS':
                    case 'CANCEL':
                        resolve(response);
                        break;
                    default:
                        resolve(response);
                }
            }).catch((error) => {
                reject(error);
            });
        }
        return new kintone.Promise((resolve, reject) => {
            service.deployApp().then(() => {
                waitForDeployment(resolve, reject);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    window.jsEditKintonePlugin.deployAppAndCheckStatus = deployAppAndCheckStatus;


})(jQuery, kintone.$PLUGIN_ID);
