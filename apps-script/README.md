# Apps Script Web App（T01+T02+T03）

## 1) 建立 Google Sheets 欄位（T01）
1. 建一份 Google Sheet，名稱可用 `MyBuddyLogs`。
2. 開啟「擴充功能 > Apps Script」。
3. 把 `Code.gs` 貼上覆蓋。
4. 第一次執行 `ensureSheet()`（在 Apps Script 左上執行函式）授權後，會自動建立 `ReflectionLogs` 與欄位：
   - id
   - date
   - context
   - original_input
   - intent
   - ai_response
   - like_dislike
   - my_preference
   - rule_candidate
   - my_edit
   - my_observation
   - tags
   - note
   - created_at

## 2) 部署 Web App（T02）
1. 右上角 `Deploy > New deployment`。
2. Type 選 `Web app`。
3. Execute as：`Me`。
4. Who has access：`Anyone`（MVP 測試階段）。
5. Deploy 後拿到 URL，格式像：
   `https://script.google.com/macros/s/<DEPLOY_ID>/exec`

## 3) CORS 說明
Apps Script `ContentService` 無法自訂 CORS Header；本版本採「允許公開測試 + 來源檢查」策略：
- 由前端傳 `origin` 欄位
- 後端僅接受 `CONFIG.ALLOWED_ORIGINS` 中的來源（可自行增減）

## 4) API
- `POST /logs`：寫入一筆 Reflection Log（`ai_response` 必填）
- `GET /health`：健康檢查
- `GET /logs/latest`：回傳最後一筆資料（用來驗證是否真寫入）

## 5) 與前端接線
在 `web/logs.html` 開啟前，先設定：
`window.BUDDY_API_BASE = "<YOUR_APPS_SCRIPT_WEB_APP_URL>"`

可在瀏覽器 DevTools Console 先輸入：
`window.BUDDY_API_BASE = "https://script.google.com/macros/s/<DEPLOY_ID>/exec"`
