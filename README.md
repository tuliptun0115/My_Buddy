# 🪐 My Buddy 養成 (My Buddy Logs Manager)

> **一個越來越懂你的 AI 小秘書，記錄你的 Decision Fingerprint 🐾**

「My Buddy 養成」是一個透過 Prompt 引導與 Reflection Log 累積，讓 AI 逐步理解使用者工作偏好與決策脈絡的個人工具。目標用戶是高頻與 AI 協作的知識工作者。

透過此工具，你可以把與 AI 互動過程中，發現的「偏好」、「規則」、「指令修正」等瞬間記錄下來，並自動彙整至個人的 Google Sheet，形成你專屬的 **AI 養成規範書 (Context Builder)**。

---

## 🏗️ 系統架構

本專案採用 **Serverless 無伺服器架構**，完全不需自備伺服器與資料庫，極低成本即可運行：

```text
[使用者瀏覽器]
    │
    ├─ 部署於 Vercel 的靜態前端網頁 (HTML/CSS/JS)
    │
    ▼ (HTTP POST/GET JSON)
[Google Apps Script Web App]
    │
    ▼ (自動讀寫)
[Google Sheets (試算表資料庫)]
```

---

## 🚀 快速部署與建置指南

### 1. 後端建置 (Google Sheets & Apps Script)

1. **建立 Google 試算表**：
   * 建立一個新的 Google Sheet，將其命名為 `MyBuddyLogs`（或你喜歡的名字）。
2. **開啟 Apps Script 編輯器**：
   * 在試算表上方選單，點選「**擴充功能**」 > 「**Apps Script**」。
3. **填入程式碼**：
   * 將本專案 [apps-script/Code.gs](apps-script/Code.gs) 中的所有程式碼，複製並覆蓋貼上到 Apps Script 的 `程式碼.gs` 編輯器中。
4. **初始化資料表欄位**：
   * 在 Apps Script 編輯器上方，將要執行的函式選為 `ensureSheet`，然後點擊「**執行**」。
   * *注意：首次執行時，Google 會要求授權存取此試算表，請按照指示完成授權。*
   * 執行成功後，你的 Google Sheet 將會自動產生一個名為 `ReflectionLogs` 的工作表，並初始化好所有欄位（如 `id`, `date`, `context`, `tags` 等）。
5. **部署為 Web 應用程式**：
   * 點選 Apps Script 編輯器右上角的「**部署**」 > 「**新增部署**」。
   * 點選齒輪圖示，選取類型為「**Web 應用程式**」。
   * **說明**：填寫 `My Buddy API`。
   * **專案執行身分**：選擇「**我**」(你的 Google 帳號)。
   * **誰有權限存取**：選擇「**任何人**」(Anyone) *(此為前端網頁跨網域存取所必須)*。
   * 點擊「**部署**」，並**複製產生的 Web 應用程式網址 (API URL)**。網址格式會類似：
     `https://script.google.com/macros/s/YOUR_APPS_SCRIPT_API_ID/exec`

---

### 2. 前端設定與部署 (Vercel)

1. **修改 API 連接點**：
   * 開啟 `web/` 目錄下的三個 HTML 檔案：[index.html](web/index.html)、[list.html](web/list.html)、[logs.html](web/logs.html)。
   * 搜尋 `window.BUDDY_API_BASE`，並將佔位符改為你剛才複製的 Web 應用程式 API 網址：
     ```javascript
     window.BUDDY_API_BASE = "https://script.google.com/macros/s/YOUR_APPS_SCRIPT_API_ID/exec";
     ```
2. **部署至 Vercel**：
   * 本專案的前端完全是靜態網頁，你可以直接將整個 `web/` 目錄託管於任何靜態網頁服務。
   * **使用 Vercel 部署**：
     1. 安裝 Vercel CLI 或連接 GitHub。
     2. 將 `web/` 目錄作為專案根目錄進行部署。
     3. 部署完成後，即可使用 Vercel 提供的網址在任何裝置上開啟你的「My Buddy 養成」！

---

## 🔒 安全與 CORS 說明

1. **免 API Key 安全設計**：後端 Apps Script 與 Google Sheets 的讀寫安全完全依賴於 Apps Script Web App 的 URL 混淆性。請勿公開您的真實 API URL。
2. **CORS 跨來源來源檢查**：
   * Google Apps Script 原生不支援自訂 CORS 標頭，本專案在 `Code.gs` 中實作了預檢（Preflight）與 JSONP/PostMessage 回傳機制，以解決跨網域傳輸問題。
   * 您可以編輯 `Code.gs` 最上方的 `CONFIG.ALLOWED_ORIGINS`，將 `*` 改成您部署後的 Vercel 專屬網域，來限制只有您的網頁可以存取此 API。

## 📄 開源授權

本專案使用 MIT 授權條款開源。
